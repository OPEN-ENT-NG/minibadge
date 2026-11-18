package fr.openent.minibadge.controller;

import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.events.EventStore;
import org.junit.Before;
import org.junit.Test;
import org.powermock.reflect.Whitebox;

import java.util.Arrays;
import java.util.List;
import java.util.function.BiConsumer;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

public class MinibadgeControllerTest {

    private MinibadgeController controller;

    @Before
    public void setUp() {
        controller = mock(MinibadgeController.class, CALLS_REAL_METHODS);
        Whitebox.setInternalState(controller, "eventStore", mock(EventStore.class));
        doNothing().when(controller).renderView(any(), any(), anyString(), any());
        doNothing().when(controller).renderView(any(), any());
    }

    @Test
    public void everyAppRoute_rendersTheReactIndexView() {
        List<BiConsumer<MinibadgeController, HttpServerRequest>> routes = Arrays.asList(
                MinibadgeController::view,
                MinibadgeController::badgesGivenView,
                MinibadgeController::badgeTypesView,
                MinibadgeController::badgeTypeView,
                MinibadgeController::adminView,
                MinibadgeController::statisticsView
        );

        for (BiConsumer<MinibadgeController, HttpServerRequest> route : routes) {
            HttpServerRequest request = mock(HttpServerRequest.class);

            route.accept(controller, request);

            verify(controller).renderView(eq(request), any(JsonObject.class), eq("index.html"), isNull());
        }
    }
}
