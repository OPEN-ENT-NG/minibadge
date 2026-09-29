/**
 * Shape of the `GET /config` response — the ONE endpoint in this app whose
 * JSON is snake_case (it renders a raw deployment config object as-is,
 * unlike every other endpoint's camelCase model `toJson()`).
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

export interface ThresholdSetting {
  structureId?: string;
  maxAssignable?: number;
  periodAssignable?: string;
  assignationsNumber?: number;
}

/** Shape of the `GET /global-settings` response. */
export interface GlobalSettings {
  pageSize: number;
  thresholdSettings: ThresholdSetting[];
  /**
   * Epic D: whether the platform PDF service is configured, decided once at server startup. The
   * "Télécharger mon certificat" button is only shown when it is `true`.
   */
  pdfExportEnabled?: boolean;
}
