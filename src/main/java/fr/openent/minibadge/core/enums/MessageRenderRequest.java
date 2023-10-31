package fr.openent.minibadge.core.enums;

import fr.openent.minibadge.core.constants.Request;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.http.Renders;
import io.netty.handler.codec.http.HttpResponseStatus;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;

public enum MessageRenderRequest {

    SUCCESS_WITHOUT_RESPONSE_BODY("minibadge.success.without.response.body", HttpResponseStatus.OK),
    STATISTICS_SYNCHRONIZE_UNNECESSARY("minibadge.statistics.synchronize.unnecessary", HttpResponseStatus.OK);
    private final String message;
    private final HttpResponseStatus requestCode;

    MessageRenderRequest(String message, HttpResponseStatus requestCode) {
        this.message = message;
        this.requestCode = requestCode;
    }

    public Integer code() {
        return requestCode.code();
    }

    public JsonObject toJson() {
        return toJson(null);
    }

    public JsonObject toJson(HttpServerRequest request) {
        return new JsonObject()
                .put(Request.MESSAGE, request != null ?
                        I18n.getInstance().translate(message,
                                Renders.getHost(request), I18n.acceptLanguage(request))
                        : message);
    }
}
