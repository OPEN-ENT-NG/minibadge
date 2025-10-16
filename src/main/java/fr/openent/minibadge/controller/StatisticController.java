package fr.openent.minibadge.controller;

import fr.openent.minibadge.core.constants.Request;
import fr.openent.minibadge.helper.LoggerHelper;
import fr.openent.minibadge.security.StatisticsViewRight;
import fr.openent.minibadge.service.BadgeAssignedStructureService;
import fr.openent.minibadge.service.ServiceRegistry;
import fr.openent.minibadge.service.StatisticService;
import fr.openent.minibadge.service.UserService;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.http.filter.ResourceFilter;
import org.entcore.common.http.filter.SuperAdminFilter;
import org.entcore.common.user.UserUtils;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.concurrent.atomic.AtomicReference;

import static fr.openent.minibadge.core.constants.Field.MINDATE;

public class StatisticController extends ControllerHelper {

    private final StatisticService statisticService = ServiceRegistry.getService(StatisticService.class);
    private final BadgeAssignedStructureService badgeAssignedStructureService = ServiceRegistry.getService(BadgeAssignedStructureService.class);
    private final UserService userService = ServiceRegistry.getService(UserService.class);

    @Get("/statistics")
    @ApiDoc("Retrieve statistics")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(StatisticsViewRight.class)
    public void getStatistics(HttpServerRequest request) {
        String minDateParam = request.getParam(MINDATE);
        final AtomicReference<LocalDate> minDate = new AtomicReference<>(null);

        if (minDateParam != null && !minDateParam.isEmpty()) {
            try {
                minDate.set(LocalDate.parse(minDateParam)); // Format attendu : yyyy-MM-dd
            } catch (DateTimeParseException e) {
                String warningMessage = String.format("Invalid minDate format: %s. Expected format: yyyy-MM-dd. Ignoring minDate.", minDateParam);
                LoggerHelper.logWarn(this, "getStatistics", warningMessage);
            }
        }

        UserUtils.getUserInfos(eb, request, user ->
                userService.getSessionUserStructureNSubstructureIds(user)
                        .compose(structuresIds -> {
                            if (structuresIds != null && user.getStructures() != null
                                    && user.getStructures().size() >= structuresIds.size())
                                return statisticService.getSpecificStructuresStatistics(structuresIds, minDate.get());
                            return statisticService.getGlobalStatistics(structuresIds);
                        })
                        .onSuccess(statistics -> renderJson(request, statistics.toJson()))
                        .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }

    @Get("/statistics/synchronize")
    @ApiDoc("Synchronize assignation that have no structure associated")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(SuperAdminFilter.class)
    public void statisticsSynchronize(HttpServerRequest request) {
        badgeAssignedStructureService.synchronizeAssignationsWithoutStructures()
                .onSuccess(message -> render(request, message.toJson(request), message.code()))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage())));
    }
}
