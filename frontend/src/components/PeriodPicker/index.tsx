import { Flex, FormControl } from '@edifice.io/react';
import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * GAP FROM PLAN: there is no `DatePicker` component in `@edifice.io/react`
 * 2.2.4 (verified: no such export in
 * `node_modules/@edifice.io/react/dist/components/index.d.ts`). Built instead
 * from `FormControl.Input` (`type="date"`) + `FormControl.Label`, using the
 * existing translation keys `minibadge.periode.date.from` ("Du") /
 * `minibadge.periode.date.to` ("Au") already shipped in
 * `backend/src/main/resources/i18n/fr.json` — no new i18n key added.
 *
 * RUNTIME TRAP AVOIDED (verified by reading the actual `.js` sources, not
 * just the `.d.ts` types — mirrors the plan's `PageLayout` warning, one level
 * deeper): the standalone `Input` and `Label` components both call
 * `useFormControl()` unconditionally (see
 * `node_modules/@edifice.io/react/dist/components/{Input,Label}/{Input,Label}.js`)
 * and THROW ("Cannot be rendered outside the FormControl component") if not
 * nested inside a `FormControl`. `FormControl` provides that context via
 * `FormControl.Label`/`FormControl.Input`, which also handles the
 * `id`/`htmlFor` wiring internally — no manual `id`/`htmlFor` props needed or
 * even accepted (see `Input.d.ts`'s `OmitInputProps`/`Label.d.ts`'s
 * `OmitLabelProps`, which exclude them). This is exactly what `SearchBar`
 * itself does internally (`FormControl, { id: "search-bar", ... }`).
 */
export interface PeriodPickerValue {
  startDate?: string;
  endDate?: string;
}

export interface PeriodPickerProps {
  value: PeriodPickerValue;
  onChange: (value: PeriodPickerValue) => void;
  /** Prefix for the two underlying `FormControl` ids, in case several `PeriodPicker`s render on the same page. */
  id?: string;
  className?: string;
}

export const PeriodPicker = ({
  value,
  onChange,
  id = 'period-picker',
  className,
}: PeriodPickerProps) => {
  const { t } = useTranslation('minibadge');

  const handleStartDateChange = (event: ChangeEvent<HTMLInputElement>) =>
    onChange({ startDate: event.target.value || undefined, endDate: value.endDate });

  const handleEndDateChange = (event: ChangeEvent<HTMLInputElement>) =>
    onChange({ startDate: value.startDate, endDate: event.target.value || undefined });

  return (
    // `FormControl` renders as a block-level element (label above input), so
    // without an explicit row wrapper the "Du"/"Au" pair stacked vertically
    // instead of sitting side by side.
    <Flex wrap="wrap" align="end" gap="8" className={className}>
      <FormControl id={`${id}-start`}>
        <FormControl.Label>{t('minibadge.periode.date.from')}</FormControl.Label>
        <FormControl.Input
          type="date"
          size="md"
          value={value.startDate ?? ''}
          onChange={handleStartDateChange}
        />
      </FormControl>
      <FormControl id={`${id}-end`}>
        <FormControl.Label>{t('minibadge.periode.date.to')}</FormControl.Label>
        <FormControl.Input
          type="date"
          size="md"
          value={value.endDate ?? ''}
          onChange={handleEndDateChange}
        />
      </FormControl>
    </Flex>
  );
};
