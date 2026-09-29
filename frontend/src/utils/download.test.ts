import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { REVOKE_DELAY_MS, saveBlob } from './download';

describe('saveBlob', () => {
  const createObjectURL = vi.fn(() => 'blob:certificate');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom implements neither.
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('clicks a temporary download link on an object URL, then removes it and releases the URL', () => {
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });

    saveBlob(blob, 'minibadge-certificat.pdf');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toHaveLength(1);
    expect(clicked[0].href).toBe('blob:certificate');
    expect(clicked[0].download).toBe('minibadge-certificat.pdf');
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(REVOKE_DELAY_MS - 1);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:certificate');
  });

  it('keeps the object URL for 30 seconds, long enough for a slow download to start', () => {
    expect(REVOKE_DELAY_MS).toBe(30000);
  });
});
