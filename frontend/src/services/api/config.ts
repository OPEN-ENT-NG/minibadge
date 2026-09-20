import { odeServices } from '@edifice.io/client';

import { Config, GlobalSettings } from '~/models/config';
import { request } from '~/services/api/http';

/**
 * GET /config — verified in `ConfigController.java#getConfig` (see the
 * deviation note on the `Config` model itself, in `~/models/config.ts`).
 */
export const getConfig = async (): Promise<Config> => {
  const response = await request(() =>
    odeServices.http().get<Config>('/minibadge/config', {
      disableNotifications: true,
    }),
  );
  return response;
};

/**
 * GET /global-settings — verified in `SettingController.java#getGlobalSettings`.
 * Renders `globalSettings.toJson()` directly.
 */
export const getGlobalSettings = async (): Promise<GlobalSettings> => {
  const response = await request(() =>
    odeServices.http().get<GlobalSettings>('/minibadge/global-settings', {
      disableNotifications: true,
    }),
  );
  return response;
};
