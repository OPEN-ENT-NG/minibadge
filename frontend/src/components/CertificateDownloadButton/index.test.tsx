import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '~/mocks/server';
import { saveBlob } from '~/utils/download';

import { CERTIFICATE_FILENAME, CertificateDownloadButton } from '.';

// No `<Toaster/>` here (only `Layout` mounts one): assert the toast call itself.
const toastError = vi.fn();
vi.mock('@edifice.io/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@edifice.io/react')>();
  return {
    ...actual,
    useToast: () => ({
      success: vi.fn(),
      error: toastError,
      info: vi.fn(),
      warning: vi.fn(),
      loading: vi.fn(),
      dismiss: vi.fn(),
      remove: vi.fn(),
    }),
  };
});

// jsdom cannot download anything: assert what would be handed to the browser.
vi.mock('~/utils/download', () => ({ saveBlob: vi.fn() }));
const saveBlobMock = vi.mocked(saveBlob);

beforeEach(() => {
  toastError.mockClear();
  saveBlobMock.mockClear();
});

const slowPdf = (onRequest: () => void) =>
  server.use(
    http.get('/minibadge/badges/certificate', async () => {
      onRequest();
      await delay(150);
      return new HttpResponse(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), {
        headers: { 'Content-Type': 'application/pdf' },
      });
    }),
  );

const withPdfExport = (pdfExportEnabled: boolean | undefined) =>
  server.use(
    http.get('/minibadge/global-settings', () =>
      HttpResponse.json({
        pageSize: 10,
        thresholdSettings: [],
        ...(pdfExportEnabled === undefined ? {} : { pdfExportEnabled }),
      }),
    ),
  );

function renderButton() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CertificateDownloadButton className="certificate-wrapper" />
    </QueryClientProvider>,
  );
}

const findButton = () => screen.findByRole('button', { name: /minibadge.certificate.download/ });

describe('CertificateDownloadButton', () => {
  it('renders nothing, wrapper included, when the PDF export is disabled', async () => {
    let settingsRequested = false;
    server.use(
      http.get('/minibadge/global-settings', () => {
        settingsRequested = true;
        return HttpResponse.json({
          pageSize: 10,
          thresholdSettings: [],
          pdfExportEnabled: false,
        });
      }),
    );
    const { container } = renderButton();

    await waitFor(() => expect(settingsRequested).toBe(true));
    // Give the settings response time to land: the button must still not appear.
    await act(() => delay(50));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelector('.certificate-wrapper')).toBeNull();
  });

  it('renders nothing when the server does not say (older server, settings still loading)', async () => {
    withPdfExport(undefined);
    renderButton();

    await act(() => delay(50));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('downloads the PDF under the certificate file name', async () => {
    withPdfExport(true);
    let requested = 0;
    server.use(
      http.get('/minibadge/badges/certificate', () => {
        requested += 1;
        return new HttpResponse(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), {
          headers: { 'Content-Type': 'application/pdf' },
        });
      }),
    );
    const user = userEvent.setup();
    renderButton();

    await user.click(await findButton());

    await waitFor(() => expect(saveBlobMock).toHaveBeenCalledTimes(1));
    const [blob, filename] = saveBlobMock.mock.calls[0];
    expect(filename).toBe(CERTIFICATE_FILENAME);
    expect(filename).toBe('minibadge-certificat.pdf');
    expect(blob).toBeInstanceOf(Blob);
    expect(requested).toBe(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('stays focusable but aria-disabled while the PDF is being generated, and announces it', async () => {
    withPdfExport(true);
    let requested = 0;
    slowPdf(() => {
      requested += 1;
    });
    const user = userEvent.setup();
    const { container } = renderButton();

    const button = await findButton();
    const status = container.querySelector('span.visually-hidden[role="status"]');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toBeEmptyDOMElement();

    await user.click(button);

    await waitFor(() => expect(button).toHaveAttribute('aria-disabled', 'true'));
    // Not `disabled`: the keyboard focus stays on the button, and it keeps its name while loading.
    expect(button).not.toBeDisabled();
    expect(button).toHaveFocus();
    expect(screen.getByRole('button', { name: /minibadge.certificate.download/ })).toBe(button);
    expect(status).toHaveTextContent('minibadge.certificate.generating');

    await user.click(button);

    await waitFor(() => expect(saveBlobMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(button).not.toHaveAttribute('aria-disabled'));
    expect(status).toBeEmptyDOMElement();
    expect(requested).toBe(1);
  });

  it('asks only once for a double click within the same tick', async () => {
    withPdfExport(true);
    let requested = 0;
    slowPdf(() => {
      requested += 1;
    });
    renderButton();
    const button = await findButton();

    // Both clicks land before any re-render: `isPending` is still false for the second one.
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    await waitFor(() => expect(saveBlobMock).toHaveBeenCalledTimes(1));
    expect(requested).toBe(1);

    // The guard is released once settled: the next click asks again.
    fireEvent.click(button);
    await waitFor(() => expect(saveBlobMock).toHaveBeenCalledTimes(2));
    expect(requested).toBe(2);
  });

  it('still saves the PDF when the button unmounts before it is ready', async () => {
    withPdfExport(true);
    slowPdf(() => {});
    const user = userEvent.setup();
    const { unmount } = renderButton();

    await user.click(await findButton());
    unmount();

    await waitFor(() => expect(saveBlobMock).toHaveBeenCalledTimes(1));
    expect(saveBlobMock.mock.calls[0][1]).toBe(CERTIFICATE_FILENAME);
  });

  it('still reports a failure when the button unmounts before it is known', async () => {
    withPdfExport(true);
    server.use(
      http.get('/minibadge/badges/certificate', async () => {
        await delay(100);
        return HttpResponse.json({ error: 'indisponible' }, { status: 503 });
      }),
    );
    const user = userEvent.setup();
    const { unmount } = renderButton();

    await user.click(await findButton());
    unmount();

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('minibadge.error.certificate.unavailable'));
  });

  it('shows the "temporarily unavailable" toast on a 503', async () => {
    withPdfExport(true);
    server.use(
      http.get('/minibadge/badges/certificate', () =>
        HttpResponse.json({ error: 'Le certificat ne peut pas être généré pour le moment.' }, { status: 503 }),
      ),
    );
    const user = userEvent.setup();
    renderButton();

    await user.click(await findButton());

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('minibadge.error.certificate.unavailable'));
    expect(saveBlobMock).not.toHaveBeenCalled();
    await waitFor(async () => expect(await findButton()).not.toHaveAttribute('aria-disabled'));
  });

  it('shows the expired-session toast on a 401', async () => {
    withPdfExport(true);
    server.use(http.get('/minibadge/badges/certificate', () => new HttpResponse(null, { status: 401 })));
    const user = userEvent.setup();
    renderButton();

    await user.click(await findButton());

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('minibadge.error.unauthorized'));
  });

  it('shows the generic download toast on any other failure', async () => {
    withPdfExport(true);
    server.use(http.get('/minibadge/badges/certificate', () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderButton();

    await user.click(await findButton());

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('minibadge.error.certificate.download'));
    expect(saveBlobMock).not.toHaveBeenCalled();
  });
});
