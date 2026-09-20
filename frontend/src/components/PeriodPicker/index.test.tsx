import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PeriodPicker } from '.';

describe('PeriodPicker', () => {
  it('renders one date input per bound (from/to)', () => {
    render(<PeriodPicker value={{}} onChange={vi.fn()} />);

    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs).toHaveLength(2);
  });

  it('calls onChange with the new start date, keeping the end date', () => {
    const onChange = vi.fn();
    render(
      <PeriodPicker value={{ endDate: '2024-02-01' }} onChange={onChange} />,
    );

    const [startInput] = document.querySelectorAll('input[type="date"]');
    fireEvent.change(startInput, { target: { value: '2024-01-01' } });

    expect(onChange).toHaveBeenCalledWith({
      startDate: '2024-01-01',
      endDate: '2024-02-01',
    });
  });

  it('calls onChange with the new end date, keeping the start date', () => {
    const onChange = vi.fn();
    render(
      <PeriodPicker value={{ startDate: '2024-01-01' }} onChange={onChange} />,
    );

    const [, endInput] = document.querySelectorAll('input[type="date"]');
    fireEvent.change(endInput, { target: { value: '2024-02-01' } });

    expect(onChange).toHaveBeenCalledWith({
      startDate: '2024-01-01',
      endDate: '2024-02-01',
    });
  });

  it('renders the "from" and "to" labels', () => {
    render(<PeriodPicker value={{}} onChange={vi.fn()} />);

    // Falls back to the raw i18n key in tests (no `minibadge` namespace
    // resources loaded by MSW), but that's still a stable, unique string.
    expect(screen.getByText('minibadge.periode.date.from')).toBeInTheDocument();
    expect(screen.getByText('minibadge.periode.date.to')).toBeInTheDocument();
  });
});
