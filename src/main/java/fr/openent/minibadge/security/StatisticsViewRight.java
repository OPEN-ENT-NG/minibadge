package fr.openent.minibadge.security;

import fr.openent.minibadge.core.constants.Rights;
import fr.openent.minibadge.helper.WorkflowHelper;
import fr.wseduc.webutils.http.Binding;
import io.vertx.core.Handler;
import io.vertx.core.http.HttpServerRequest;
import org.entcore.common.http.filter.ResourcesProvider;
import org.entcore.common.user.UserInfos;

public class StatisticsViewRight implements ResourcesProvider {
    @Override
    public void authorize(HttpServerRequest request, Binding binding, UserInfos user,
                          Handler<Boolean> handler) {
        handler.handle(WorkflowHelper.hasRight(user, Rights.STATISTICS_VIEW));
    }
}