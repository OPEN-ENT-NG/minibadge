/**
 * Delay before the object URL is released: revoking it synchronously after the click can cancel the
 * download in some browsers, which only start reading the blob once the click has been handled.
 * Generous on purpose: a slow device (or a download prompt left open) may read it well after the click,
 * and keeping a PDF-sized blob a little longer costs nothing.
 */
export const REVOKE_DELAY_MS = 30000;

/**
 * Hands a fetched file to the browser as a download: a temporary object URL on a temporary
 * `<a download>`, the link removed right after the click and the URL released shortly after.
 */
export const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }
};
