import { BadgeCategory } from '~/models/badgeCategory';
import { MinibadgeUser } from '~/models/user';

/**
 * Shape of `BadgeProtagonistSetting.toJson()`.
 * See `fr.openent.minibadge.model.BadgeProtagonistSetting`.
 */
export interface BadgeProtagonistSetting {
  type?: string;
  typeValue?: string;
  label?: string;
}

/**
 * Shape of `BadgeProtagonistSettingRelation.toJson()`.
 * See `fr.openent.minibadge.model.BadgeProtagonistSettingRelation`.
 */
export interface BadgeProtagonistSettingRelation {
  assignorType: BadgeProtagonistSetting;
  receiverType: BadgeProtagonistSetting;
}

/**
 * Shape of the `setting` field of `BadgeType.toJson()`, itself built from
 * `TypeSetting.toJson()` (backend `fr.openent.minibadge.model.TypeSetting`).
 */
export interface BadgeTypeSetting {
  relations: BadgeProtagonistSettingRelation[];
  isSelfAssignable: boolean;
  structureId?: string;
  /**
   * End date of the badge type (`YYYY-MM-DD`, inclusive: valid for the whole day); absent/null when
   * permanent. Frozen into each assignment when it is made.
   */
  validUntil?: string | null;
  /**
   * `validUntil` is before the server's current date (computed by SQL, never by the browser clock).
   * Absent only from an older backend — see `isBadgeTypeExpired` for the fallback.
   */
  isExpired?: boolean;
}

/**
 * Shape of `BadgeType.toJson()` (backend `fr.openent.minibadge.model.BadgeType`).
 * Field names verified against `Field.java` (camelCase).
 */
export interface BadgeType {
  id: number;
  structureId?: string;
  ownerId?: string;
  pictureId?: string;
  label: string;
  createdAt?: string;
  description?: string;
  descriptionShort?: string;
  countAssigned?: number;
  countRefused?: number;
  setting: BadgeTypeSetting;
  categories: BadgeCategory[];
  isSelfAssigned: boolean;
  owner?: MinibadgeUser;
  mostAssigningUsers?: MinibadgeUser[];
}
