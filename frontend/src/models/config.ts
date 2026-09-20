/**
 * Shape of the `GET /config` response.
 *
 * DEVIATION FROM PLAN: the plan assumed camelCase fields for every endpoint.
 * `ConfigController#getConfig` actually renders the raw Vert.x module deployment
 * config JsonObject as-is (`renderJson(request, config)`), not `Config.toJson()`
 * from `fr.openent.minibadge.model.Config` — that model's own `toJson()` is never
 * called by this controller. That raw config is read with the snake_case constants
 * from `Field.java` (`DEFAULT_MAX_ASSIGNABLE = "default_max_assignable"`, etc, see
 * `Minibadge.java` — `minibadgeConfig = new Config(config)` uses the very same
 * object), so this is the one endpoint in this app whose JSON is snake_case.
 * Verified in `ConfigController.java`, `Minibadge.java` and `Config.java`.
 */
export interface Config {
  default_max_assignable?: number;
  default_period_assignable?: string;
  most_assigned_type_list_size?: number;
  less_assigned_type_list_size?: number;
  most_refused_type_list_size?: number;
  most_assigning_user_list_size?: number;
  most_assigning_structure_list_size?: number;
  top_most_assigning_user_list_size?: number;
  top_most_receiving_user_list_size?: number;
  type_lists_users_size?: number;
}

/**
 * Shape of `ThresholdSetting.toJson()` (backend `fr.openent.minibadge.model.ThresholdSetting`).
 * Field names verified against `Field.java` (camelCase).
 */
export interface ThresholdSetting {
  structureId?: string;
  maxAssignable?: number;
  periodAssignable?: string;
  assignationsNumber?: number;
}

/**
 * Shape of `GlobalSettings.toJson()` (backend `fr.openent.minibadge.model.GlobalSettings`).
 * Field names verified against `Field.java`/`Request.java` (camelCase). Returned
 * by `GET /global-settings`.
 */
export interface GlobalSettings {
  pageSize: number;
  thresholdSettings: ThresholdSetting[];
}
