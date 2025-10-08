package fr.openent.minibadge.controller;

import fr.openent.minibadge.core.constants.Request;
import fr.openent.minibadge.helper.LoggerHelper;
import fr.openent.minibadge.model.entity.BadgeCategory;
import fr.openent.minibadge.security.ViewRight;
import fr.openent.minibadge.service.BadgeCategoryService;
import fr.openent.minibadge.service.ServiceRegistry;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.http.filter.ResourceFilter;

import java.util.Collections;
import java.util.stream.Collectors;

public class BadgeCategoryController extends ControllerHelper {
    private final BadgeCategoryService badgeCategoryService = ServiceRegistry.getService(BadgeCategoryService.class);

    @Get("/categories")
    @ApiDoc("Retrieve all badge categories")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ViewRight.class)
    public void getAllCategories(HttpServerRequest request) {
        badgeCategoryService.getAllBadgeCategories()
                .onSuccess(categories -> renderJson(request, new JsonArray(categories.stream().map(BadgeCategory::toJson).collect(Collectors.toList()))))
                .onFailure(err -> {
                    String errorMessage = "Error retrieving badge categories";
                    LoggerHelper.logError(this, "getAllCategories", errorMessage, err.getMessage());
                    renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()));
                });
    }
}
