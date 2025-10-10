import { rights } from "./core/constants/rights.const";
import { InfiniteScrollService, SnipletBadgeAssignService } from "./services";
import { ChartEventsService } from "./services/chart.events.service";
import { ContainerHeaderEventsService } from "./services/container-header.events.service";
import { minibadgeBadgeAssign } from "./sniplets/badge-assign.sniplet";

export const MINIBADGE_APP = "minibadge";

export const minibadgeBehaviours = {
    rights,
    sniplets: {
        'badge-assign': minibadgeBadgeAssign,
    },
    chartEventsService: new ChartEventsService,
    containerHeaderEventsService: new ContainerHeaderEventsService,
    infiniteScrollService: new InfiniteScrollService,
    snipletBadgeAssignService: new SnipletBadgeAssignService,
};