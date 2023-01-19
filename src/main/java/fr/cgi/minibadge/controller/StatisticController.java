package fr.cgi.minibadge.controller;

import fr.cgi.minibadge.core.constants.Request;
import fr.cgi.minibadge.security.StatisticsViewRight;
import fr.cgi.minibadge.service.ServiceFactory;
import fr.cgi.minibadge.service.StatisticService;
import fr.cgi.minibadge.service.UserService;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.http.filter.ResourceFilter;
import org.entcore.common.user.UserUtils;

public class StatisticController extends ControllerHelper {

    private final StatisticService statisticService;
    private final UserService userService;

    public StatisticController(ServiceFactory serviceFactory) {
        super();
        this.statisticService = serviceFactory.statisticServiceService();
        this.userService = serviceFactory.userService();
    }

    @Get("/statistics")
    @ApiDoc("Retrieve statistics")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(StatisticsViewRight.class)
    public void getStatistics(HttpServerRequest request) {

        UserUtils.getUserInfos(eb, request, user ->
                userService.getSessionUserStructureNSubstructureIds(user)
                        .compose(structuresIds -> {
                            if (structuresIds != null && user.getStructures() != null
                                    && user.getStructures().size() >= structuresIds.size())
                                return statisticService.getSpecificStructuresStatistics(structuresIds);
                            return statisticService.getGlobalStatistics(structuresIds);
                        })
                        .onSuccess(statistics -> renderJson(request, statistics.toJson()))
                        .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }
}
