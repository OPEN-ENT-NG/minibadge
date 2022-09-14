package fr.cgi.minibadge.service.impl;

import fr.cgi.minibadge.service.EventBusService;
import io.vertx.core.eventbus.EventBus;


public class DefaultEventBusService implements EventBusService {

    private final EventBus eb;

    public DefaultEventBusService(EventBus eb) {
        this.eb = eb;
    }

}
