import { odeServices } from '@edifice.io/client';
import { EdificeClientProvider, EdificeThemeContext } from '@edifice.io/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeBadgeType } from '~/mocks/handlers';
import { server } from '~/mocks/server';
import { BadgeType } from '~/models/badgeType';
import { toIsoDate } from '~/utils/date';

import { EditBadgeValidityModal } from '.';

const toastSuccess = vi.fn();
vi.mock('@edifice.io/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@edifice.io/react')>();
  return {
    ...actual,
    useToast: () => ({
      success: toastSuccess,
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      loading: vi.fn(),
      dismiss: vi.fn(),
      remove: vi.fn(),
    }),
  };
});

// Same constraint as `CreateBadgeTypeModal/index.test.tsx`: the session cache is a module singleton.
beforeEach(() => {
  odeServices.cache().clearCache();
  toastSuccess.mockClear();
});

const dayOffset = (days: number) => toIsoDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));

/** The default `/auth/oauth2/userinfo` fixture user belongs to ONE structure: `d4c3b2a1`. */
const MY_STRUCTURE = 'd4c3b2a1';

/** `isExpired` is what the server computes (SQL, `CURRENT_DATE`) next to `validUntil`. */
const withSetting = (
  badgeType: BadgeType,
  validUntil?: string | null,
  isExpired = !!validUntil && validUntil < dayOffset(0),
): BadgeType => ({
  ...badgeType,
  setting: { ...badgeType.setting, validUntil, isExpired },
});
const localBadge = withSetting({ ...fakeBadgeType, id: 10, label: 'Entraide', structureId: MY_STRUCTURE }, dayOffset(60));
const centralBadge = withSetting({ ...fakeBadgeType, id: 2, label: 'Badge central', structureId: undefined }, null);
const foreignBadge = withSetting({ ...fakeBadgeType, id: 30, label: 'Badge d’une autre école', structureId: 'other-school' }, null);

function withBadgeTypes(all: BadgeType[]) {
  server.use(
    http.get('/minibadge/types', ({ request }) => {
      const url = new URL(request.url);
      const offset = Number(url.searchParams.get('offset'));
      const limit = Number(url.searchParams.get('limit'));
      return HttpResponse.json({ all: all.slice(offset, offset + limit), limit, offset });
    }),
  );
}

/** Captures the PUT the modal is expected to send, answering with `status`. */
function captureValidityRequest(status = 200) {
  const captured: { typeId?: string; body?: Record<string, unknown> } = {};
  server.use(
    http.put('/minibadge/types/:typeId/validity', async ({ params, request }) => {
      captured.typeId = params.typeId as string;
      captured.body = (await request.json()) as Record<string, unknown>;
      return status === 200 ? HttpResponse.json({ id: 10 }) : new HttpResponse(null, { status });
    }),
  );
  return captured;
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <EdificeClientProvider params={{ app: 'minibadge' }}>
      <EdificeThemeContext.Provider value={{ theme: undefined }}>{children}</EdificeThemeContext.Provider>
    </EdificeClientProvider>
  );
}

function renderModal(isOpen = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      {wrapper({ children: <EditBadgeValidityModal isOpen={isOpen} onClose={onClose} /> })}
    </QueryClientProvider>,
  );
  return { ...utils, onClose, queryClient };
}

const submitButton = () => screen.getByRole('button', { name: 'minibadge.badge.type.validity.submit' });
const dateInput = () => screen.getByLabelText('minibadge.badge.type.validity.date') as HTMLInputElement;

async function selectBadge(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(await screen.findByText('minibadge.badge.type.validity.badge.placeholder'));
  await user.click(await screen.findByText(label));
}

describe('EditBadgeValidityModal', () => {
  it('is not visible when isOpen is false', () => {
    renderModal(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /** The server refuses the others anyway (403); offering them would only lead to a failure. */
  it("offers only the badges of the admin's own establishment: no central, no other school's", async () => {
    const user = userEvent.setup();
    withBadgeTypes([centralBadge, localBadge, foreignBadge]);
    renderModal();

    await user.click(await screen.findByText('minibadge.badge.type.validity.badge.placeholder'));

    expect(await screen.findByText('Entraide')).toBeInTheDocument();
    expect(screen.queryByText('Badge central')).not.toBeInTheDocument();
    expect(screen.queryByText('Badge d’une autre école')).not.toBeInTheDocument();
  });

  it('says so when the establishment has created no badge', async () => {
    withBadgeTypes([centralBadge, foreignBadge]);
    renderModal();

    expect(await screen.findByText('minibadge.badge.type.validity.none')).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it('starts from the current end date of the chosen badge and sends only the new one', async () => {
    const user = userEvent.setup();
    withBadgeTypes([localBadge]);
    const captured = captureValidityRequest();
    const { onClose } = renderModal();

    expect(submitButton()).toBeDisabled();
    await selectBadge(user, 'Entraide');
    expect(dateInput()).toHaveValue(dayOffset(60));

    fireEvent.change(dateInput(), { target: { value: dayOffset(400) } });
    await user.click(submitButton());

    await waitFor(() => expect(captured.body).toBeDefined());
    expect(captured.typeId).toBe('10');
    expect(captured.body).toEqual({ validUntil: dayOffset(400) });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalledWith('minibadge.badge.type.validity.success');
  });

  it('makes the badge permanent again when the date is cleared', async () => {
    const user = userEvent.setup();
    withBadgeTypes([localBadge]);
    const captured = captureValidityRequest();
    renderModal();

    await selectBadge(user, 'Entraide');
    fireEvent.change(dateInput(), { target: { value: '' } });
    await user.click(submitButton());

    await waitFor(() => expect(captured.body).toBeDefined());
    expect(captured.body).toEqual({ validUntil: null });
  });

  it('refuses a past date with an inline message and a disabled submit', async () => {
    const user = userEvent.setup();
    withBadgeTypes([localBadge]);
    renderModal();

    await selectBadge(user, 'Entraide');
    fireEvent.change(dateInput(), { target: { value: dayOffset(-1) } });

    expect(submitButton()).toBeDisabled();
    expect(screen.getByText('minibadge.error.badge.type.validity.past')).toBeInTheDocument();
    expect(dateInput()).toHaveAttribute('aria-invalid', 'true');
    expect(dateInput()).toHaveAttribute('min', dayOffset(0));
  });

  it('shows an already expired badge as such, so the admin sees why it needs a new date', async () => {
    const user = userEvent.setup();
    withBadgeTypes([withSetting(localBadge, dayOffset(-3))]);
    renderModal();

    await selectBadge(user, 'Entraide');

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('minibadge.badge.expired')).toBeInTheDocument();
  });

  it("trusts the server's expiry flag, not the browser clock", async () => {
    const user = userEvent.setup();
    // The browser thinks the date is still ahead; the server (database clock) says it is past.
    withBadgeTypes([withSetting(localBadge, dayOffset(0), true)]);
    renderModal();

    await selectBadge(user, 'Entraide');

    expect(within(screen.getByRole('dialog')).getByText('minibadge.badge.expired')).toBeInTheDocument();
  });

  it('shows a loading state while the badge list is being fetched', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get('/minibadge/types', async () => {
        await gate;
        return HttpResponse.json({ all: [localBadge], limit: 100, offset: 0 });
      }),
    );
    renderModal();

    expect(await screen.findByText('minibadge.loading')).toBeInTheDocument();
    release();
    expect(await screen.findByText('minibadge.badge.type.validity.badge.placeholder')).toBeInTheDocument();
    expect(screen.queryByText('minibadge.loading')).not.toBeInTheDocument();
  });

  it('tells the admin to reconnect when the badge list fails on an expired session', async () => {
    server.use(http.get('/minibadge/types', () => new HttpResponse(null, { status: 401 })));
    renderModal();

    expect(await screen.findByText('minibadge.error.unauthorized')).toBeInTheDocument();
    expect(screen.queryByText('minibadge.error.get.badge.types')).not.toBeInTheDocument();
  });

  it('shows the generic list error for any other failure', async () => {
    server.use(http.get('/minibadge/types', () => new HttpResponse(null, { status: 500 })));
    renderModal();

    expect(await screen.findByText('minibadge.error.get.badge.types')).toBeInTheDocument();
  });

  it('names the badge picker after its visible label', async () => {
    withBadgeTypes([localBadge]);
    renderModal();
    await screen.findByText('minibadge.badge.type.validity.badge.placeholder');

    // Labelled by the visible label first (then by its own content, which jsdom's name computation
    // may or may not fold in for a button-based combobox).
    const combobox = screen.getByRole('combobox', { name: /^minibadge\.badge\.type\.validity\.badge\b/ });
    expect(combobox.getAttribute('aria-labelledby')?.split(' ')[0]).toBe(
      screen.getByText('minibadge.badge.type.validity.badge').id,
    );
  });

  it('shows an inline error and stays open when the server refuses the change', async () => {
    const user = userEvent.setup();
    withBadgeTypes([localBadge]);
    captureValidityRequest(403);
    const { onClose } = renderModal();

    await selectBadge(user, 'Entraide');
    await user.click(submitButton());

    expect(await screen.findByText('minibadge.error.badge.type.validity.update')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('tells the admin to reconnect, not that the change was refused, when the session has expired', async () => {
    const user = userEvent.setup();
    withBadgeTypes([localBadge]);
    captureValidityRequest(401);
    renderModal();

    await selectBadge(user, 'Entraide');
    await user.click(submitButton());

    expect(await screen.findByText('minibadge.error.unauthorized')).toBeInTheDocument();
    expect(screen.queryByText('minibadge.error.badge.type.validity.update')).not.toBeInTheDocument();
  });

  it('does not call onClose on Escape while closed (the design system Modal listens regardless)', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal(false);

    await user.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('starts clean when closed and reopened', async () => {
    const user = userEvent.setup();
    withBadgeTypes([localBadge]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const tree = (isOpen: boolean) => (
      <QueryClientProvider client={queryClient}>
        {wrapper({ children: <EditBadgeValidityModal isOpen={isOpen} onClose={vi.fn()} /> })}
      </QueryClientProvider>
    );
    const { rerender } = render(tree(true));

    await selectBadge(user, 'Entraide');
    expect(dateInput()).toHaveValue(dayOffset(60));

    rerender(tree(false));
    rerender(tree(true));

    expect(await screen.findByText('minibadge.badge.type.validity.badge.placeholder')).toBeInTheDocument();
    expect(dateInput()).toHaveValue('');
    expect(dateInput()).toBeDisabled();
  });
});
