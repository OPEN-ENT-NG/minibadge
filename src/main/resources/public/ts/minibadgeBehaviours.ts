import {InfiniteScrollService} from "./services";
import {minibadgeBadgeAssign} from "./sniplets/badge-assign.sniplet";
import {SnipletBadgeAssignService} from "./services/sniplet-badge-assign.service";

export const MINIBADGE_APP = "minibadge";

export const minibadgeBehaviours = {
    rights: {
    },
    sniplets: {
        'badge-assign': minibadgeBadgeAssign,
    },
    infiniteScrollService: new InfiniteScrollService,
    snipletBadgeAssignService: new SnipletBadgeAssignService,
};