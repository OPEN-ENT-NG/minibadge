import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { BadgeCategory } from '~/models/badgeCategory';
import { server } from '~/mocks/server';

import { CategoryMultiSelect } from '.';

const categories: BadgeCategory[] = [
  { id: 1, name: 'Appétence', slug: 'APPETENCE', iconName: 'BRAIN', iconCssClass: 'bi-brain' },
  { id: 2, name: 'Compétence', slug: 'COMPETENCE', iconName: 'SCHOOL', iconCssClass: 'bi-school' },
  { id: 3, name: 'Engagement', slug: 'ENGAGEMENT', iconName: 'ARM_FLEX', iconCssClass: 'bi-arm' },
];

function renderSelect({ value = [] as number[] } = {}) {
  server.use(http.get('/minibadge/categories', () => HttpResponse.json(categories)));
  const onChange = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <CategoryMultiSelect value={value} onChange={onChange} label="Catégories" />
    </QueryClientProvider>,
  );
  return { ...utils, onChange };
}

describe('CategoryMultiSelect', () => {
  it('renders one toggle button per category inside a named group', async () => {
    renderSelect();

    const group = await screen.findByRole('group', { name: 'Catégories' });
    expect(group).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Appétence' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compétence' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Engagement' })).toBeInTheDocument();
  });

  it('starts with nothing pressed when no category is selected', async () => {
    renderSelect();

    const button = await screen.findByRole('button', { name: 'Appétence' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('adds a category to the selection when clicked', async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect();

    await user.click(await screen.findByRole('button', { name: 'Compétence' }));

    expect(onChange).toHaveBeenCalledWith([2]);
  });

  /**
   * The reason this is a chip row and not the library screen's single-select `Dropdown`: the model
   * really is multi-valued, so a second selection must ADD rather than replace.
   */
  it('accumulates several categories rather than replacing the previous one', async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect({ value: [1] });

    await user.click(await screen.findByRole('button', { name: 'Engagement' }));

    expect(onChange).toHaveBeenCalledWith([1, 3]);
  });

  it('removes an already-selected category when clicked again', async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect({ value: [1, 2] });

    await user.click(await screen.findByRole('button', { name: 'Appétence' }));

    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it('reflects the selection through aria-pressed', async () => {
    renderSelect({ value: [2] });

    expect(await screen.findByRole('button', { name: 'Compétence' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Appétence' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows an inline error when the categories cannot be fetched', async () => {
    server.use(http.get('/minibadge/categories', () => new HttpResponse(null, { status: 500 })));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <CategoryMultiSelect value={[]} onChange={vi.fn()} label="Catégories" />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('minibadge.error.get.badge.categories.picker')).toBeInTheDocument();
  });
});
