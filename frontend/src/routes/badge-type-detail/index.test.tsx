import { odeServices } from '@edifice.io/client';
import { EdificeClientProvider, EdificeThemeContext } from '@edifice.io/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeBadgeType, fakeUser } from '~/mocks/handlers';
import { server } from '~/mocks/server';
import { MinibadgeAccessContext } from '~/routes/root/CharterGate/context';
import { toIsoDate } from '~/utils/date';

import { BadgeTypeDetail } from '.';

beforeEach(() => odeServices.cache().clearCache());

function renderScreen({
  canAssign = true,
  canReceive = true,
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
}: { canAssign?: boolean; canReceive?: boolean; queryClient?: QueryClient } = {}) {
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EdificeClientProvider params={{ app: 'minibadge' }}>
        <EdificeThemeContext.Provider value={{ theme: undefined }}>
          <MinibadgeAccessContext.Provider
            value={{ canAssign, canReceive, isAdmin: false, isStatisticsView: false, isStatisticsViewAllStructures: false }}
          >
            <MemoryRouter initialEntries={[`/badge-types/${fakeBadgeType.id}`]}>
              <Routes>
                <Route path="/badge-types/:typeId" element={<BadgeTypeDetail />} />
                <Route path="/badge-types" element={<div>Bibliothèque</div>} />
              </Routes>
            </MemoryRouter>
          </MinibadgeAccessContext.Provider>
        </EdificeThemeContext.Provider>
      </EdificeClientProvider>
    </QueryClientProvider>,
  );
  return { ...utils, queryClient };
}

describe('BadgeTypeDetail', () => {
  it('renders the fiche (label, categories, description) and the assigners list when canReceive', async () => {
    renderScreen();

    expect(await screen.findByText(fakeBadgeType.label)).toBeInTheDocument();
    expect(screen.getByText(fakeBadgeType.categories[0].name)).toBeInTheDocument();
    expect(screen.getByText(fakeBadgeType.descriptionShort!)).toBeInTheDocument();
    expect(await screen.findByText(/minibadge\.badges\.received\.from\.users/)).toHaveTextContent('(1)');
    expect(screen.getByText(/minibadge\.badges\.assigned\.by/)).toBeInTheDocument();
    expect(screen.getByText(fakeUser.displayName!)).toBeInTheDocument();
    expect(screen.getByText('minibadge.profile.Personnel')).toBeInTheDocument();
  });

  it('hides the assigners list when the user cannot receive', async () => {
    renderScreen({ canReceive: false });

    await screen.findByText(fakeBadgeType.label);
    expect(screen.queryByText(/minibadge\.badges\.received\.from\.users/)).not.toBeInTheDocument();
  });

  it('shows both "Décerner" and "Me décerner" when canAssign and the badge is self-assignable', async () => {
    server.use(http.get('/minibadge/types/:typeId', () => HttpResponse.json({
      ...fakeBadgeType,
      setting: { ...fakeBadgeType.setting, isSelfAssignable: true },
    })));
    renderScreen({ canAssign: true });

    expect(await screen.findByRole('button', { name: 'minibadge.badge.assign' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'minibadge.badge.assign.myself.button' })).toBeInTheDocument();
  });

  it('shows neither action button when the user cannot assign', async () => {
    renderScreen({ canAssign: false });

    await screen.findByText(fakeBadgeType.label);
    expect(screen.queryByRole('button', { name: 'minibadge.badge.assign' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'minibadge.badge.assign.myself.button' }),
    ).not.toBeInTheDocument();
  });

  it('hides "Me décerner" when canAssign but the badge is not self-assignable (default fixture)', async () => {
    renderScreen({ canAssign: true });

    await screen.findByText(fakeBadgeType.label);
    expect(screen.getByRole('button', { name: 'minibadge.badge.assign' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'minibadge.badge.assign.myself.button' }),
    ).not.toBeInTheDocument();
  });

  it('opens the shared AssignBadgeLightbox from the "Décerner" button', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'minibadge.badge.assign' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('minibadge.choose.users.to.assign')).toBeInTheDocument();
  });

  it('opens AssignMyselfModal (not the search lightbox) from "Me décerner"', async () => {
    server.use(http.get('/minibadge/types/:typeId', () => HttpResponse.json({
      ...fakeBadgeType,
      setting: { ...fakeBadgeType.setting, isSelfAssignable: true },
    })));
    const user = userEvent.setup();
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'minibadge.badge.assign.myself.button' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('minibadge.badge.assign.myself.question')).toBeInTheDocument();
    expect(within(dialog).queryByText('minibadge.choose.users.to.assign')).not.toBeInTheDocument();
  });

  it('invalidates the badge type + assigners queries after a successful "Me décerner" assignation', async () => {
    server.use(http.get('/minibadge/types/:typeId', () => HttpResponse.json({
      ...fakeBadgeType,
      setting: { ...fakeBadgeType.setting, isSelfAssignable: true },
    })));
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderScreen({ queryClient });

    await user.click(await screen.findByRole('button', { name: 'minibadge.badge.assign.myself.button' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'minibadge.badge.assign.myself.button' }));

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['badgeType', fakeBadgeType.id] }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['badgeTypeAssigners', fakeBadgeType.id] });
  });

  it('shows an error alert when the badge type fails to load', async () => {
    server.use(http.get('/minibadge/types/:typeId', () => new HttpResponse(null, { status: 404 })));
    renderScreen();

    expect(await screen.findByText('minibadge.error.get.badge.type')).toBeInTheDocument();
  });

  it('the back button navigates to the badge types library', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'minibadge.back' }));

    expect(await screen.findByText('Bibliothèque')).toBeInTheDocument();
  });

  it('strips HTML markup from the description instead of showing the literal tags', async () => {
    server.use(
      http.get('/minibadge/types/:typeId', () =>
        HttpResponse.json({ ...fakeBadgeType, descriptionShort: '<p>Acte</p><p>d’entraide</p>' }),
      ),
    );
    renderScreen();

    expect(await screen.findByText('Acte d’entraide')).toBeInTheDocument();
    expect(screen.queryByText(/<p>/)).not.toBeInTheDocument();
  });

  describe('validity (Epic C)', () => {
    const dayOffset = (days: number) => toIsoDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
    const withValidUntil = (validUntil: string) =>
      server.use(
        http.get('/minibadge/types/:typeId', () =>
          HttpResponse.json({
            ...fakeBadgeType,
            // `isExpired` is what the server computes (SQL, CURRENT_DATE) next to `validUntil`.
            setting: { ...fakeBadgeType.setting, isSelfAssignable: true, validUntil, isExpired: validUntil < dayOffset(0) },
          }),
        ),
      );

    it('shows the end date and keeps both actions enabled while the badge is valid', async () => {
      withValidUntil(dayOffset(30));
      renderScreen();

      expect(await screen.findByText('minibadge.badge.valid.until')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'minibadge.badge.assign' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'minibadge.badge.assign.myself.button' })).toBeEnabled();
    });

    it('still accepts an assignment ON the end date itself', async () => {
      withValidUntil(dayOffset(0));
      renderScreen();

      expect(await screen.findByRole('button', { name: 'minibadge.badge.assign' })).toBeEnabled();
      expect(screen.queryByText('minibadge.badge.expired')).not.toBeInTheDocument();
    });

    it('makes both actions unavailable once the end date is past, with a visible reason they point to', async () => {
      withValidUntil(dayOffset(-1));
      renderScreen();

      const assign = await screen.findByRole('button', { name: 'minibadge.badge.assign' });
      const assignMyself = screen.getByRole('button', { name: 'minibadge.badge.assign.myself.button' });
      expect(assign).toHaveAttribute('aria-disabled', 'true');
      expect(assignMyself).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByText('minibadge.badge.expired')).toBeInTheDocument();

      const reason = screen.getByText('minibadge.badge.expired.cannot.assign');
      expect(assign).toHaveAttribute('aria-describedby', reason.id);
      expect(assignMyself).toHaveAttribute('aria-describedby', reason.id);
    });

    it('keeps the unavailable actions focusable (so their reason is announced) but inert', async () => {
      withValidUntil(dayOffset(-1));
      renderScreen();

      const assign = await screen.findByRole('button', { name: 'minibadge.badge.assign' });
      // Not `disabled`: a disabled button leaves the tab order and its description is never read.
      expect(assign).not.toBeDisabled();
      assign.focus();
      expect(assign).toHaveFocus();

      fireEvent.click(assign);
      fireEvent.click(screen.getByRole('button', { name: 'minibadge.badge.assign.myself.button' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows no expiry message to a user who cannot assign anyway', async () => {
      withValidUntil(dayOffset(-1));
      renderScreen({ canAssign: false });

      expect(await screen.findByText('minibadge.badge.expired')).toBeInTheDocument();
      expect(screen.queryByText('minibadge.badge.expired.cannot.assign')).not.toBeInTheDocument();
    });
  });
});
