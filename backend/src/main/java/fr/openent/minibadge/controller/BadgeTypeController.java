package fr.openent.minibadge.controller;

import fr.openent.minibadge.Minibadge;
import fr.openent.minibadge.core.constants.Actions;
import fr.openent.minibadge.core.constants.EventBusConst;
import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.constants.Request;
import fr.openent.minibadge.helper.BadgeValidityHelper;
import fr.openent.minibadge.helper.RequestHelper;
import fr.openent.minibadge.helper.UserHelper;
import fr.openent.minibadge.model.BadgeType;
import fr.openent.minibadge.model.User;
import fr.openent.minibadge.security.AdminRight;
import fr.openent.minibadge.security.ReceiveRight;
import fr.openent.minibadge.security.ViewRight;
import fr.openent.minibadge.service.BadgeAssignedService;
import fr.openent.minibadge.service.BadgeService;
import fr.openent.minibadge.service.BadgeTypeService;
import fr.openent.minibadge.service.ServiceRegistry;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.rs.Post;
import fr.wseduc.rs.Put;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.http.Renders;
import fr.wseduc.webutils.request.RequestUtils;
import io.vertx.core.Future;
import io.vertx.core.MultiMap;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.events.EventStore;
import org.entcore.common.events.EventStoreFactory;
import org.entcore.common.http.filter.ResourceFilter;
import org.entcore.common.http.filter.Trace;
import org.entcore.common.user.UserUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static fr.openent.minibadge.core.constants.Field.*;

public class BadgeTypeController extends ControllerHelper {

    private final EventStore eventStore = EventStoreFactory.getFactory().getEventStore(Minibadge.class.getSimpleName());
    private final BadgeTypeService badgeTypeService = ServiceRegistry.getService(BadgeTypeService.class);
    private final BadgeAssignedService badgeAssignedService = ServiceRegistry.getService(BadgeAssignedService.class);
    private final BadgeService badgeService = ServiceRegistry.getService(BadgeService.class);

    /** Creation failures that are the client's to fix, rendered as a translated 400 rather than a 500. */
    private static final List<String> CREATE_CLIENT_ERRORS = Arrays.asList(
            BadgeTypeService.DUPLICATE_SLUG_ERROR,
            BadgeTypeService.VALIDITY_INVALID_ERROR,
            BadgeTypeService.VALIDITY_PAST_ERROR);

    @Get("/types")
    @ApiDoc("Retrieve badge type list")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ViewRight.class)
    public void getBadgeTypes(HttpServerRequest request) {
        Integer offset = Integer.parseInt(request.params().get(Request.OFFSET));
        int limit = RequestHelper.cappingLimit(request.params());
        String query = request.params().get(Request.QUERY);

        String categoryIdParam = request.params().get(CATEGORYID);
        Long categoryId = null;

        if (categoryIdParam != null) {
            try {
                categoryId = Long.parseLong(categoryIdParam);
            } catch (NumberFormatException e) {
                renderError(request, new JsonObject().put(Request.MESSAGE, "Invalid categoryId"));
                return;
            }
        }

        Long finalCategoryId = categoryId;

        UserUtils.getUserInfos(eb, request, user -> badgeTypeService.getBadgeTypes(user.getStructures(), query, limit, offset, finalCategoryId)
                .onSuccess(badgeTypes -> renderJson(request, RequestHelper.formatResponse(limit, offset, badgeTypes)))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }

    @Post("/types")
    @ApiDoc("Create a badge type for one of the current user's structures")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(AdminRight.class)
    @Trace(Actions.BADGE_TYPE_CREATE)
    public void createBadgeType(HttpServerRequest request) {
        String host = Renders.getHost(request);
        String language = I18n.acceptLanguage(request);

        RequestUtils.bodyToJson(request, String.format("%s%s", pathPrefix, "badgeTypeCreate"), body ->
                UserUtils.getUserInfos(eb, request, user -> {
                    String label = body.getString(LABEL, "").trim();
                    if (label.isEmpty()) {
                        badRequest(request, I18n.getInstance()
                                .translate("minibadge.error.badge.type.label.required", host, language));
                        return;
                    }

                    String structureId = UserHelper.resolveStructureId(user, body.getString(STRUCTUREID));
                    if (structureId == null) {
                        badRequest(request, I18n.getInstance()
                                .translate("minibadge.error.badge.type.structure.invalid", host, language));
                        return;
                    }

                    BadgeType badgeType = new BadgeType(body);
                    badgeType.setLabel(label);
                    // Both are set server-side, AFTER `new BadgeType(body)`, so whatever the client
                    // sent for those two fields is discarded rather than trusted.
                    badgeType.setStructureId(structureId);
                    badgeType.setOwnerId(user.getUserId());
                    // Epic C: optional end date, validated (format, not past) by the service.
                    badgeType.getSetting().setValidUntil(body.getString(VALIDUNTIL));

                    badgeTypeService.create(badgeType, categoryIds(body))
                            .onSuccess(createdBadgeType -> {
                                eventStore.createAndStoreEvent(EventBusConst.CREATE_EVENT, request);
                                renderJson(request, createdBadgeType.toJson(), 201);
                            })
                            .onFailure(err -> {
                                if (CREATE_CLIENT_ERRORS.contains(err.getMessage())) {
                                    badRequest(request, I18n.getInstance()
                                            .translate(err.getMessage(), host, language));
                                    return;
                                }
                                renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()));
                            });
                }));
    }

    @Put("/types/:typeId/validity")
    @ApiDoc("Change the end date of a badge type owned by one of the current user's structures")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(AdminRight.class)
    @Trace(Actions.BADGE_TYPE_VALIDITY_UPDATE)
    public void updateBadgeTypeValidity(HttpServerRequest request) {
        String host = Renders.getHost(request);
        String language = I18n.acceptLanguage(request);
        long typeId;
        try {
            typeId = Long.parseLong(request.params().get(TYPEID));
        } catch (NumberFormatException e) {
            badRequest(request);
            return;
        }

        RequestUtils.bodyToJson(request, String.format("%s%s", pathPrefix, "badgeTypeValidityUpdate"), body ->
                // AdminRight is a bare workflow-right check (see UserHelper#resolveStructureId): the
                // establishment scoping is enforced by the service, against the caller's OWN structures
                // only — the body carries nothing but the date.
                UserUtils.getUserInfos(eb, request, user ->
                        badgeTypeService.updateValidity(typeId, user.getStructures(), body.getString(VALIDUNTIL))
                                .onSuccess(v -> renderJson(request, new JsonObject()
                                        .put(ID, typeId)
                                        .put(VALIDUNTIL, BadgeValidityHelper.format(
                                                BadgeValidityHelper.parseValidUntil(body.getString(VALIDUNTIL))))))
                                .onFailure(err -> {
                                    String message = err.getMessage();
                                    if (BadgeTypeService.VALIDITY_FORBIDDEN_ERROR.equals(message)) {
                                        renderJson(request, new JsonObject().put(Request.ERROR,
                                                I18n.getInstance().translate(message, host, language)), 403);
                                        return;
                                    }
                                    if (BadgeTypeService.VALIDITY_INVALID_ERROR.equals(message)
                                            || BadgeTypeService.VALIDITY_PAST_ERROR.equals(message)) {
                                        badRequest(request, I18n.getInstance().translate(message, host, language));
                                        return;
                                    }
                                    renderError(request, new JsonObject().put(Request.MESSAGE, message));
                                })));
    }

    private List<Long> categoryIds(JsonObject body) {
        JsonArray rawCategoryIds = body.getJsonArray(CATEGORYIDS, new JsonArray());
        List<Long> categoryIds = new ArrayList<>();
        rawCategoryIds.stream()
                .filter(Number.class::isInstance)
                .map(Number.class::cast)
                .forEach(categoryId -> categoryIds.add(categoryId.longValue()));
        return categoryIds;
    }

    @Get("/types/:typeId")
    @ApiDoc("Retrieve badge type")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ViewRight.class)
    public void getBadgeType(HttpServerRequest request) {
        long typeId = Long.parseLong(request.params().get(TYPEID));
        String host = Renders.getHost(request);
        String language = I18n.acceptLanguage(request);

        UserUtils.getUserInfos(eb, request, user -> badgeTypeService.getBadgeType(user, typeId, host, language)
                .onSuccess(badgeType -> renderJson(request, badgeType.toJson()))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }

    @Get("/types/:typeId/assigners")
    @ApiDoc("Get users that gave me this (:typeId) badge typed")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ReceiveRight.class)
    public void getBadgeTypeAssigners(HttpServerRequest request) {
        MultiMap params = request.params();
        int page = params.contains(Request.PAGE) ? Integer.parseInt(params.get(Request.PAGE)) : 0;
        int limit = RequestHelper.cappingLimit(params, Minibadge.minibadgeConfig.typeListsUsersSize());
        int offset = RequestHelper.pageToOffset(page, limit);
        long typeId = Long.parseLong(params.get(TYPEID));

        UserUtils.getUserInfos(eb, request, user -> {
            Future<List<User>> assignersFuture = badgeAssignedService.getBadgeTypeAssigners(typeId, user, limit, offset);
            Future<Integer> countAssignersFuture = badgeAssignedService.countTotalAssigners(typeId, user);

            Future.all(assignersFuture, countAssignersFuture)
                    .onSuccess(users -> {
                        JsonObject response = RequestHelper.formatResponse(page, countAssignersFuture.result(), limit,
                                assignersFuture.result());
                        response.put(Field.USERASSIGNERSTOTAL, countAssignersFuture.result());
                        renderJson(request, response);
                    })
                    .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage())));
        });

    }

    @Get("/types/:typeId/receivers")
    @ApiDoc("Get users that received this (:typeId) badge typed")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ViewRight.class)
    public void getBadgeTypeReceivers(HttpServerRequest request) {
        MultiMap params = request.params();
        int page = params.contains(Request.PAGE) ? Integer.parseInt(params.get(Request.PAGE)) : 0;
        int limit = RequestHelper.cappingLimit(params, Minibadge.minibadgeConfig.typeListsUsersSize());
        int offset = RequestHelper.pageToOffset(page, limit);
        long typeId = Long.parseLong(params.get(TYPEID));

        Future<List<User>> receiversFuture = badgeService.getBadgeTypeReceivers(typeId, limit, offset);
        Future<Integer> countReceiversFuture = badgeService.countTotalReceivers(typeId);

        UserUtils.getUserInfos(eb, request, user -> Future.all(receiversFuture, countReceiversFuture)
                .onSuccess(users -> {
                    JsonObject response = RequestHelper.formatResponse(page, countReceiversFuture.result(), limit,
                            receiversFuture.result());
                    response.put(Field.RECEIVERSTOTAL, countReceiversFuture.result());
                    renderJson(request, response);
                })
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }
}
