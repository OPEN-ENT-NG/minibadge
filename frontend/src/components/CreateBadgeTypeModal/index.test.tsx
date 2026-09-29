import { odeServices } from '@edifice.io/client';
import { EdificeClientProvider, EdificeThemeContext } from '@edifice.io/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '~/mocks/server';
import { toIsoDate } from '~/utils/date';

import { CreateBadgeTypeModal } from '.';

// Lets the success test assert the toast fires without depending on a `<Toaster/>` (only `Layout`,
// mounted in `routes/root`, provides one at runtime).
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

// `@edifice.io/client`'s CacheService is a module-level singleton with no expiry, so it has to be
// cleared between tests that override the session-backed `/auth/oauth2/userinfo` endpoint (see
// `AssignBadgeLightbox/index.test.tsx`, same constraint).
beforeEach(() => {
  odeServices.cache().clearCache();
  toastSuccess.mockClear();
});

/** `useEdificeClient` (used to read the admin's structures) throws outside its provider. */
function wrapper({ children }: { children: ReactNode }) {
  return (
    <EdificeClientProvider params={{ app: 'minibadge' }}>
      <EdificeThemeContext.Provider value={{ theme: undefined }}>{children}</EdificeThemeContext.Provider>
    </EdificeClientProvider>
  );
}

/**
 * The default `/auth/oauth2/userinfo` fixture puts the user in ONE structure, which is the
 * single-establishment admin case. `withStructures` overrides it to exercise the multi-structure one.
 */
function withStructures(structures: string[], structureNames: string[]) {
  server.use(
    http.get('/auth/oauth2/userinfo', () =>
      HttpResponse.json({
        username: 'fake.user',
        login: 'fake.user',
        firstName: 'Fake',
        lastName: 'User',
        userId: 'a1b2c3d4',
        type: 'Personnel',
        structures,
        structureNames,
        functions: {},
        authorizedActions: [
          { name: 'fr.openent.minibadge.controller.FakeRight|assign', displayName: 'assign', type: 'WORKFLOW' },
          { name: 'fr.openent.minibadge.controller.FakeRight|receive', displayName: 'receive', type: 'WORKFLOW' },
        ],
        apps: [],
      }),
    ),
  );
}

function renderModal(isOpen = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      {wrapper({ children: <CreateBadgeTypeModal isOpen={isOpen} onClose={onClose} /> })}
    </QueryClientProvider>,
  );
  return { ...utils, onClose };
}

/** Captures the body of the single POST /minibadge/types the form is expected to send. */
function captureCreateRequest() {
  const captured: { body?: Record<string, unknown> } = {};
  server.use(
    http.post('/minibadge/types', async ({ request }) => {
      captured.body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ id: 99, label: 'Entraide' }, { status: 201 });
    }),
  );
  return captured;
}

const dayOffset = (days: number) => toIsoDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
const validUntilInput = () =>
  screen.getByLabelText('minibadge.badge.type.create.valid.until') as HTMLInputElement;
const labelInput = () => screen.getByRole('textbox', { name: /minibadge.badge.type.create.label/ });
const submitButton = () => screen.getByRole('button', { name: 'minibadge.badge.type.create.submit' });

describe('CreateBadgeTypeModal', () => {
  it('is not visible when isOpen is false', () => {
    renderModal(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the form with the submit button disabled until a label is typed', async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByRole('dialog');
    expect(submitButton()).toBeDisabled();

    await user.type(labelInput(), 'Entraide');

    expect(submitButton()).toBeEnabled();
  });

  it('keeps the submit button disabled for a whitespace-only label', async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByRole('dialog');

    await user.type(labelInput(), '   ');

    expect(submitButton()).toBeDisabled();
  });

  it('posts only the filled-in fields, omitting structureId for a single-establishment admin', async () => {
    const user = userEvent.setup();
    const captured = captureCreateRequest();
    renderModal();
    await screen.findByRole('dialog');

    await user.type(labelInput(), '  Entraide  ');
    await user.click(submitButton());

    await waitFor(() => expect(captured.body).toBeDefined());
    // Label trimmed; everything else left out rather than sent as empty strings (the JSON schema is
    // `additionalProperties: false` and the server derives the structure itself).
    expect(captured.body).toEqual({ label: 'Entraide' });
  });

  it('posts the description, categories and picto when they are filled in', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/minibadge/categories', () =>
        HttpResponse.json([
          { id: 1, name: 'Appétence', slug: 'APPETENCE', iconName: 'BRAIN', iconCssClass: 'bi-brain' },
          { id: 2, name: 'Compétence', slug: 'COMPETENCE', iconName: 'SCHOOL', iconCssClass: 'bi-school' },
        ]),
      ),
    );
    const captured = captureCreateRequest();
    renderModal();
    await screen.findByRole('dialog');

    await user.type(labelInput(), 'Entraide');
    await user.type(screen.getByRole('textbox', { name: /minibadge.badge.type.create.description/ }), 'Aide');
    await user.click(await screen.findByRole('button', { name: 'Compétence' }));
    await user.click(screen.getByRole('radio', { name: 'minibadge.picto.solidaire' }));
    await user.click(submitButton());

    await waitFor(() => expect(captured.body).toBeDefined());
    expect(captured.body).toEqual({
      label: 'Entraide',
      description: 'Aide',
      pictureId: 'solidaire.svg',
      categoryIds: [2],
    });
  });

  it('closes and toasts on success', async () => {
    const user = userEvent.setup();
    captureCreateRequest();
    const { onClose } = renderModal();
    await screen.findByRole('dialog');

    await user.type(labelInput(), 'Entraide');
    await user.click(submitButton());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalledWith('minibadge.badge.type.create.success');
  });

  it('shows an inline error and stays open when the creation fails', async () => {
    const user = userEvent.setup();
    server.use(http.post('/minibadge/types', () => new HttpResponse(null, { status: 400 })));
    const { onClose } = renderModal();
    await screen.findByRole('dialog');

    await user.type(labelInput(), 'Entraide');
    await user.click(submitButton());

    expect(await screen.findByText('minibadge.error.badge.type.create')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  /**
   * An expired session used to render the same "check that no badge with this name already exists"
   * banner as a rejected label — a plausible-sounding but wrong diagnosis the admin could chase for
   * a long time, since renaming would never help. `ApiError.code` is the one thing `request()` does
   * preserve, so the two cases must not share copy.
   */
  it('tells the admin to reconnect rather than to rename the badge when the session has expired', async () => {
    const user = userEvent.setup();
    server.use(http.post('/minibadge/types', () => new HttpResponse(null, { status: 401 })));
    renderModal();
    await screen.findByRole('dialog');

    await user.type(labelInput(), 'Entraide');
    await user.click(submitButton());

    expect(await screen.findByText('minibadge.error.unauthorized')).toBeInTheDocument();
    expect(screen.queryByText('minibadge.error.badge.type.create')).not.toBeInTheDocument();
  });

  it('clears every field when the modal is closed and reopened', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        {wrapper({ children: <CreateBadgeTypeModal isOpen onClose={vi.fn()} /> })}
      </QueryClientProvider>,
    );
    await screen.findByRole('dialog');
    await user.type(labelInput(), 'Entraide');
    await user.click(screen.getByRole('radio', { name: 'minibadge.picto.solidaire' }));

    rerender(
      <QueryClientProvider client={queryClient}>
        {wrapper({ children: <CreateBadgeTypeModal isOpen={false} onClose={vi.fn()} /> })}
      </QueryClientProvider>,
    );
    rerender(
      <QueryClientProvider client={queryClient}>
        {wrapper({ children: <CreateBadgeTypeModal isOpen onClose={vi.fn()} /> })}
      </QueryClientProvider>,
    );

    await waitFor(() => expect(labelInput()).toHaveValue(''));
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
    expect(submitButton()).toBeDisabled();
  });

  describe('multi-establishment admin', () => {
    /**
     * The server refuses to guess for an admin attached to several schools (a badge created in the
     * wrong one cannot be deleted — there is no delete endpoint), so the field has to be shown, and
     * the form must not let them submit without it.
     */
    it('requires an explicit structure before submitting', async () => {
      const user = userEvent.setup();
      withStructures(['structure1', 'structure2'], ['École A', 'École B']);
      renderModal();
      await screen.findByRole('dialog');

      await screen.findByText('minibadge.badge.type.create.structure');
      await user.type(labelInput(), 'Entraide');

      expect(submitButton()).toBeDisabled();
    });

    it('sends the chosen structureId', async () => {
      const user = userEvent.setup();
      withStructures(['structure1', 'structure2'], ['École A', 'École B']);
      const captured = captureCreateRequest();
      renderModal();
      await screen.findByRole('dialog');
      await screen.findByText('minibadge.badge.type.create.structure');

      await user.type(labelInput(), 'Entraide');
      await user.click(screen.getByText('minibadge.badge.type.create.structure.placeholder'));
      await user.click(await screen.findByText('École B'));
      await user.click(submitButton());

      await waitFor(() => expect(captured.body).toBeDefined());
      expect(captured.body).toEqual({ label: 'Entraide', structureId: 'structure2' });
    });

    it('does not show the structure field for a single-establishment admin', async () => {
      renderModal();
      await screen.findByRole('dialog');

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).queryByText('minibadge.badge.type.create.structure')).not.toBeInTheDocument();
    });
  });

  describe('end date (Epic C)', () => {
    it('is optional: an empty date sends no validUntil (permanent badge)', async () => {
      const user = userEvent.setup();
      const captured = captureCreateRequest();
      renderModal();
      await screen.findByRole('dialog');

      expect(validUntilInput()).toHaveAttribute('type', 'date');
      expect(validUntilInput()).toHaveAttribute('min', dayOffset(0));
      await user.type(labelInput(), 'Entraide');
      await user.click(submitButton());

      await waitFor(() => expect(captured.body).toBeDefined());
      expect(captured.body).not.toHaveProperty('validUntil');
    });

    it('sends the chosen end date', async () => {
      const user = userEvent.setup();
      const captured = captureCreateRequest();
      renderModal();
      await screen.findByRole('dialog');

      await user.type(labelInput(), 'Entraide');
      fireEvent.change(validUntilInput(), { target: { value: dayOffset(90) } });
      await user.click(submitButton());

      await waitFor(() => expect(captured.body).toBeDefined());
      expect(captured.body).toEqual({ label: 'Entraide', validUntil: dayOffset(90) });
    });

    it('accepts today: the badge is valid for the whole of its end day', async () => {
      const user = userEvent.setup();
      renderModal();
      await screen.findByRole('dialog');

      await user.type(labelInput(), 'Entraide');
      fireEvent.change(validUntilInput(), { target: { value: dayOffset(0) } });

      expect(submitButton()).toBeEnabled();
    });

    it('refuses a past date with an inline message and a disabled submit', async () => {
      const user = userEvent.setup();
      renderModal();
      await screen.findByRole('dialog');

      await user.type(labelInput(), 'Entraide');
      fireEvent.change(validUntilInput(), { target: { value: dayOffset(-1) } });

      expect(submitButton()).toBeDisabled();
      expect(screen.getByText('minibadge.error.badge.type.validity.past')).toBeInTheDocument();
      expect(validUntilInput()).toHaveAttribute('aria-invalid', 'true');
    });

    it('clears the end date when the modal is closed and reopened', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          {wrapper({ children: <CreateBadgeTypeModal isOpen onClose={vi.fn()} /> })}
        </QueryClientProvider>,
      );
      await screen.findByRole('dialog');
      fireEvent.change(validUntilInput(), { target: { value: dayOffset(10) } });

      rerender(
        <QueryClientProvider client={queryClient}>
          {wrapper({ children: <CreateBadgeTypeModal isOpen={false} onClose={vi.fn()} /> })}
        </QueryClientProvider>,
      );
      rerender(
        <QueryClientProvider client={queryClient}>
          {wrapper({ children: <CreateBadgeTypeModal isOpen onClose={vi.fn()} /> })}
        </QueryClientProvider>,
      );

      await waitFor(() => expect(validUntilInput()).toHaveValue(''));
    });
  });
});
