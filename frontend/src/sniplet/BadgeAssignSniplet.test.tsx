import { odeServices } from '@edifice.io/client';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeBadgeType } from '~/mocks/handlers';
import { server } from '~/mocks/server';

import { BadgeAssignSniplet } from './BadgeAssignSniplet';
import { SnipletBadgeAssignService } from './snipletBadgeAssignService';

/**
 * Unlike every other component test in this app (e.g. `AssignBadgeLightbox`'s
 * or `CharterGate`'s — see their own test files), `BadgeAssignSniplet`
 * builds its OWN top-level provider stack internally (mirroring `main.tsx`)
 * rather than assuming one is supplied from outside, so this test can't
 * substitute `EdificeThemeContext.Provider` from the outside the way those
 * do. The real `EdificeThemeProvider` unconditionally does
 * `document.getElementById('favicon').href = ...` in a `useEffect` (see
 * `@edifice.io/react`'s `EdificeThemeProvider.js`), which throws in jsdom
 * with no such element present — so a `<link id="favicon">` is added to the
 * test document here instead, mirroring what a real portal page's `<head>`
 * already provides in production.
 */
beforeEach(() => {
  odeServices.cache().clearCache();
  if (!document.getElementById('favicon')) {
    const favicon = document.createElement('link');
    favicon.id = 'favicon';
    document.head.appendChild(favicon);
  }
});

describe('BadgeAssignSniplet', () => {
  it('opens the lightbox with the given badge type when the service emits one directly', async () => {
    const service = new SnipletBadgeAssignService();
    render(<BadgeAssignSniplet service={service} />);

    expect(screen.queryByText(fakeBadgeType.label, { exact: false })).not.toBeInTheDocument();

    act(() => service.sendBadgeType(fakeBadgeType));

    expect(await screen.findByText(fakeBadgeType.label, { exact: false })).toBeInTheDocument();
  });

  it('resolves a badgeTypeId via the shared badgeType query, then opens the lightbox', async () => {
    const service = new SnipletBadgeAssignService();
    render(<BadgeAssignSniplet service={service} />);

    act(() => service.sendBadgeTypeId(fakeBadgeType.id));

    expect(await screen.findByText(fakeBadgeType.label, { exact: false })).toBeInTheDocument();
  });

  it('resets on close, ready to be reopened for a different badge type', async () => {
    const user = userEvent.setup();
    const service = new SnipletBadgeAssignService();
    render(<BadgeAssignSniplet service={service} />);

    act(() => service.sendBadgeType(fakeBadgeType));
    await screen.findByText(fakeBadgeType.label, { exact: false });

    await user.click(screen.getByRole('button', { name: 'minibadge.cancel' }));

    await waitFor(() =>
      expect(screen.queryByText(fakeBadgeType.label, { exact: false })).not.toBeInTheDocument(),
    );

    const otherBadgeType = { ...fakeBadgeType, id: 40, label: 'Persévérance' };
    act(() => service.sendBadgeType(otherBadgeType));

    expect(await screen.findByText('Persévérance', { exact: false })).toBeInTheDocument();
  });

  it('shows a visible Alert (and still logs) when resolving a badgeTypeId fails, since the lightbox never opens to show it', async () => {
    // A dedicated, never-reused id: the sniplet's `QueryClient` is a
    // module-level singleton shared across every test in this file (like
    // `main.tsx`'s), so reusing `fakeBadgeType.id` here could hit a cache
    // entry a different, successful test already populated for it.
    const failingTypeId = 90001;
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    server.use(
      http.get('/minibadge/types/:typeId', () => new HttpResponse(null, { status: 500 })),
    );
    const service = new SnipletBadgeAssignService();
    render(<BadgeAssignSniplet service={service} />);

    act(() => service.sendBadgeTypeId(failingTypeId));

    expect(await screen.findByText('minibadge.error.get.badge.type')).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'minibadge: failed to resolve badge type for sniplet',
      expect.anything(),
    );
    // No badge type to open the lightbox with in this failure path.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('resets the Alert once a badgeTypeId resolves successfully after a prior failure', async () => {
    const failingTypeId = 90002;
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    server.use(
      http.get('/minibadge/types/:typeId', ({ params }) =>
        Number(params.typeId) === failingTypeId
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json(fakeBadgeType),
      ),
    );
    const service = new SnipletBadgeAssignService();
    render(<BadgeAssignSniplet service={service} />);

    act(() => service.sendBadgeTypeId(failingTypeId));
    await screen.findByText('minibadge.error.get.badge.type');

    // A later, successful resolution (a different id — the point is a new
    // resolution starting, not this specific id) must clear the Alert.
    act(() => service.sendBadgeTypeId(fakeBadgeType.id));

    expect(await screen.findByText(fakeBadgeType.label, { exact: false })).toBeInTheDocument();
    expect(screen.queryByText('minibadge.error.get.badge.type')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('a slower, superseded sendBadgeTypeId resolution is ignored so the FINAL state reflects the LAST call issued', async () => {
    const slowType = { ...fakeBadgeType, id: 90003, label: 'Slow (issued first)' };
    const fastType = { ...fakeBadgeType, id: 90004, label: 'Fast (issued last)' };
    server.use(
      http.get('/minibadge/types/:typeId', async ({ params }) => {
        if (Number(params.typeId) === slowType.id) {
          await delay(50);
          return HttpResponse.json(slowType);
        }
        return HttpResponse.json(fastType);
      }),
    );
    const service = new SnipletBadgeAssignService();
    render(<BadgeAssignSniplet service={service} />);

    act(() => {
      service.sendBadgeTypeId(slowType.id);
      service.sendBadgeTypeId(fastType.id);
    });

    expect(await screen.findByText(fastType.label, { exact: false })).toBeInTheDocument();

    // Give the slow, superseded request time to settle too, then confirm it
    // never overwrote the state the faster, later call already set.
    await waitFor(
      () => expect(screen.queryByText(slowType.label, { exact: false })).not.toBeInTheDocument(),
      { timeout: 500 },
    );
    expect(screen.getByText(fastType.label, { exact: false })).toBeInTheDocument();
  });
});
