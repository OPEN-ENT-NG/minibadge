import { PeriodPickerValue } from '~/components/PeriodPicker';

/**
 * Date helpers shared by every screen that filters a badge list by a
 * `PeriodPicker` range (`routes/badges-given`, `routes/badges-admin`).
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

/** Backend timestamp (`YYYY-MM-DD HH:mm:ss.SSS`) -> `DD-MM-YYYY` for display. */
export const formatDisplayDate = (timestamp?: string): string => {
  if (!timestamp) return '';
  const [year, month, day] = timestamp.split(' ')[0].split('-');
  return `${day}-${month}-${year}`;
};

/** Today as `YYYY-MM-DD` (local time), the format of native date inputs and of `validUntil`. */
export const todayIsoDate = (): string => toIsoDate(new Date());

/** `YYYY-MM-DD` (or a timestamp starting with it) -> `DD/MM/YYYY`, the French display format. */
export const formatIsoDateFr = (isoDate?: string | null): string => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
};

export const defaultPeriod = (): PeriodPickerValue => {
  const today = new Date();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return { startDate: toIsoDate(oneMonthAgo), endDate: toIsoDate(today) };
};
