import { PeriodPickerValue } from '~/components/PeriodPicker';

/**
 * Date helpers shared by every screen that filters a badge list by a
 * `PeriodPicker` range (`routes/badges-given`, `routes/badges-admin`).
 *
 * Extracted verbatim from `routes/badges-given/index.tsx` (Phase 3) — this is
 * a pure refactor (Phase 5, Task 1): no behavior change, only a shared home
 * so Phase 5's `/admin` screen doesn't redefine the exact same four
 * functions.
 */

export const pad2 = (value: number): string => `${value}`.padStart(2, '0');

export const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** `YYYY-MM-DD` (native date input) -> `DD-MM-YYYY` (backend format). */
export const toBackendDate = (isoDate?: string): string | undefined => {
  if (!isoDate) return undefined;
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
};

/** Backend timestamp (`YYYY-MM-DD HH:mm:ss.SSS`) -> `DD-MM-YYYY` for display, mirroring `DATE_FORMAT.DAY_MONTH_YEAR_KEBAB`. */
export const formatDisplayDate = (timestamp?: string): string => {
  if (!timestamp) return '';
  const [year, month, day] = timestamp.split(' ')[0].split('-');
  return `${day}-${month}-${year}`;
};

export const defaultPeriod = (): PeriodPickerValue => {
  const today = new Date();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return { startDate: toIsoDate(oneMonthAgo), endDate: toIsoDate(today) };
};
