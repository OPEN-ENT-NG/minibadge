package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.Minibadge;
import fr.openent.minibadge.core.constants.Database;
import fr.openent.minibadge.core.enums.MessageRenderRequest;
import fr.openent.minibadge.helper.PromiseHelper;
import fr.openent.minibadge.model.BadgeAssigned;
import fr.openent.minibadge.model.User;
import fr.openent.minibadge.service.BadgeAssignedStructureService;
import fr.openent.minibadge.service.UserService;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.user.UserInfos;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class DefaultBadgeAssignedStructureService implements BadgeAssignedStructureService {
    public static final String BADGE_ASSIGNED_STRUCTURE_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE_ASSIGNED_STRUCTURE);
    private final Sql sql;
    private final UserService userService;


    protected DefaultBadgeAssignedStructureService(Sql sql, UserService userService) {
        this.sql = sql;
        this.userService = userService;
    }

    @Override
    public Future<Void> createBadgeAssignedStructures(List<BadgeAssigned> badgeAssigned,
                                                      List<String> ownerIds, UserInfos assignor) {
        if (badgeAssigned == null || badgeAssigned.isEmpty()) return Future.succeededFuture();
        Promise<Void> promise = Promise.promise();

        userService.getUsers(ownerIds)
                .compose(owners -> createBadgeAssignedStructuresRequest(badgeAssigned, owners, assignor))
                .onSuccess(result -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }

    @Override
    public Future<MessageRenderRequest> createBadgeAssignedStructures(List<BadgeAssigned> badgeAssigned, List<String> users) {
        Promise<MessageRenderRequest> promise = Promise.promise();

        userService.getUsers(users)
                .compose(owners -> createBadgeAssignedStructuresRequest(badgeAssigned, owners))
                .onSuccess(promise::complete)
                .onFailure(promise::fail);

        return promise.future();
    }

    @Override
    public Future<MessageRenderRequest> synchronizeAssignationsWithoutStructures() {
        Promise<MessageRenderRequest> promise = Promise.promise();

        getAssignationsWithoutStructuresLinked()
                .compose(assignations -> {
                    if (assignations == null || assignations.isEmpty())
                        return Future.succeededFuture(MessageRenderRequest.STATISTICS_SYNCHRONIZE_UNNECESSARY);
                    return createBadgeAssignedStructures(assignations,
                            assignations.stream()
                                    .flatMap(badgeAssigned -> Stream.of(badgeAssigned.badge().ownerId(), badgeAssigned.assignorId()))
                                    .filter(Objects::nonNull)
                                    .distinct()
                                    .collect(Collectors.toList())
                    );
                })
                .onSuccess(promise::complete)
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<MessageRenderRequest> createBadgeAssignedStructuresRequest(List<BadgeAssigned> badgesAssigned, List<User> users,
                                                                              UserInfos assignor) {
        JsonArray params = new JsonArray();
        String insertValues = assignor != null ? badgeAssignedStructuresToValuesInsert(badgesAssigned, users, assignor, params) :
                badgeAssignedStructuresToValuesInsert(badgesAssigned, users, params);

        if (insertValues.trim().isEmpty())
            return Future.succeededFuture(MessageRenderRequest.STATISTICS_SYNCHRONIZE_UNNECESSARY);

        Promise<MessageRenderRequest> promise = Promise.promise();
        String request = String.format("INSERT INTO %s (badge_assigned_id, structure_id, is_structure_assigner, " +
                        " is_structure_receiver) VALUES %s", BADGE_ASSIGNED_STRUCTURE_TABLE,
                insertValues);

        sql.prepared(request, params, PromiseHelper.validResultHandler(promise, MessageRenderRequest.SUCCESS_WITHOUT_RESPONSE_BODY,
                String.format("[Minibadge@%s::createBadgeAssignedStructuresRequest] Fail to create badge assigned " +
                                "structures",
                        this.getClass().getSimpleName())));

        return promise.future();
    }

    private Future<MessageRenderRequest> createBadgeAssignedStructuresRequest(List<BadgeAssigned> badgesAssigned, List<User> users) {
        return createBadgeAssignedStructuresRequest(badgesAssigned, users, null);
    }

    private String badgeAssignedStructuresToValuesInsert(List<BadgeAssigned> badgesAssigned, List<User> users,
                                                         JsonArray params) {
        return badgesAssigned
                .stream().map(badgeAssigned -> {
                    User assignor = getCorrespondingUser(users, badgeAssigned.assignorId()).orElse(null);
                    User owner = getCorrespondingUser(users, badgeAssigned.badge().ownerId()).orElse(null);
                    return assignedStructuresToValueInsert(badgeAssigned, owner, assignor, params);
                })
                .filter(values -> Objects.nonNull(values) && !values.trim().isEmpty())
                .collect(Collectors.joining(", "));
    }

    private String badgeAssignedStructuresToValuesInsert(List<BadgeAssigned> badgesAssigned, List<User> owners,
                                                         UserInfos assignor, JsonArray params) {
        return badgesAssigned
                .stream().map(badgeAssigned ->
                        getCorrespondingUser(owners, badgeAssigned.badge().ownerId())
                                .map(owner -> assignedStructuresToValueInsert(badgeAssigned, owner, assignor, params))
                                .orElse(null)
                )
                .filter(values -> Objects.nonNull(values) && !values.trim().isEmpty())
                .collect(Collectors.joining(", "));
    }

    private Optional<User> getCorrespondingUser(List<User> users, String comparedUserId) {
        return users.stream()
                .filter(owner -> owner.getUserId().equals(comparedUserId))
                .findFirst();
    }

    private String assignedStructuresToValueInsert(BadgeAssigned badgeAssigned, UserInfos owner,
                                                   UserInfos assignor, JsonArray params) {
        List<String> commonStructureIds;
        boolean isEmptyOwnerStructure = owner == null || owner.getStructures().isEmpty();
        boolean isEmptyAssignorStructure = assignor == null || assignor.getStructures().isEmpty();

        if (isEmptyOwnerStructure && isEmptyAssignorStructure) return "";
        else if (isEmptyOwnerStructure) commonStructureIds = assignor.getStructures();
        else if (isEmptyAssignorStructure) commonStructureIds = owner.getStructures();
        else commonStructureIds = owner.getStructures().stream()
                    .filter(structureId -> assignor.getStructures().contains(structureId))
                    .collect(Collectors.toList());

        return badgeAssignedStructuresToValuesInsert(assignor, owner, badgeAssigned,
                commonStructureIds, params);
    }

    private String badgeAssignedStructuresToValuesInsert(UserInfos assignor, UserInfos owner, BadgeAssigned badgeAssigned,
                                                         List<String> commonStructureIds, JsonArray params) {
        if (commonStructureIds.isEmpty()) {
            return Stream.concat(
                            owner != null ? owner.getStructures().stream()
                                    .map(structureId -> badgeAssignedStructureToValueInsert(
                                            badgeAssigned.id(), structureId, false,
                                            true, params)) : Stream.<String>empty(),
                            assignor != null ? assignor.getStructures().stream()
                                    .map(structureId -> badgeAssignedStructureToValueInsert(
                                            badgeAssigned.id(), structureId, true,
                                            false, params)) : Stream.<String>empty()
                    )
                    .filter(values -> Objects.nonNull(values) && !values.trim().isEmpty())
                    .collect(Collectors.joining(", "));
        }

        return commonStructureIds.stream()
                .map(structureId ->
                        badgeAssignedStructureToValueInsert(badgeAssigned.id(), structureId,
                                true, true, params))
                .filter(values -> !values.trim().isEmpty())
                .collect(Collectors.joining(", "));
    }

    private String badgeAssignedStructureToValueInsert(Long badgeAssignedId, String structureId,
                                                       Boolean isStructureAssigner, Boolean isStructureReceiver,
                                                       JsonArray params) {
        JsonArray paramsValues = new JsonArray()
                .add(badgeAssignedId)
                .add(structureId)
                .add(isStructureAssigner)
                .add(isStructureReceiver);

        params.addAll(paramsValues);

        return Sql.listPrepared(paramsValues);
    }


    @Override
    public Future<List<BadgeAssigned>> getAssignationsWithoutStructuresLinked() {
        Promise<List<BadgeAssigned>> promise = Promise.promise();
        String request = "SELECT b.id as badge_id, owner_id, ba.id as id, assignor_id" +
                " FROM  " + DefaultBadgeService.BADGE_TABLE + " b " +
                " INNER JOIN " + DefaultBadgeAssignedService.BADGE_ASSIGNED_TABLE + " ba ON b.id = ba.badge_id " +
                " LEFT JOIN " + BADGE_ASSIGNED_STRUCTURE_TABLE + " bas on ba.id = bas.badge_assigned_id " +
                " WHERE bas.badge_assigned_id IS NULL";

        sql.prepared(request, new JsonArray(), SqlResult.validResultHandler(PromiseHelper.handlerJsonArrayModelled(promise,
                BadgeAssigned.class,
                String.format("[Minibadge@%s::getAssignationsWithoutStructuresLinked] Fail to list assignations " +
                                "without structures linked",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

}
