import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface RegisteredSniplet {
  controller: { init: (this: unknown) => void; destroy: () => void };
}

interface RegisteredBehaviours {
  rights: { workflow: Record<string, string> };
  sniplets: Record<string, RegisteredSniplet>;
  snipletBadgeAssignService: unknown;
}

/**
 * `main.tsx` calls `window.entcore?.Behaviours?.register(...)` as a
 * module-level side effect (mirroring the original `ts/behaviours.ts`), so
 * each test re-imports it dynamically after `vi.resetModules()` to get a
 * fresh execution rather than relying on a cached module.
 */
beforeEach(() => {
  vi.resetModules();
  window.entcore = undefined;
});

// Several tests below append host elements directly to `document.body`
// (bypassing React Testing Library's `render`, so its automatic cleanup
// doesn't apply) — clear them between tests so a node left over from one
// test can't be mistaken for one created by the next.
afterEach(() => {
  document.body.innerHTML = '';
});

describe('sniplet main entry point', () => {
  it('registers minibadge behaviours (rights + badge-assign sniplet + service) when window.entcore is present', async () => {
    const register = vi.fn();
    window.entcore = { Behaviours: { register } };

    await import('./main');

    expect(register).toHaveBeenCalledTimes(1);
    const [appName, behaviours] = register.mock.calls[0] as [string, RegisteredBehaviours];
    expect(appName).toBe('minibadge');
    expect(behaviours.sniplets['badge-assign']).toBeDefined();
    expect(behaviours.snipletBadgeAssignService).toBeDefined();
    expect(behaviours.rights.workflow.assign).toBe(
      'fr.openent.minibadge.controller.FakeRight|assign',
    );
  });

  it('does not throw when window.entcore is absent', async () => {
    expect(window.entcore).toBeUndefined();

    await expect(import('./main')).resolves.toBeDefined();
  });

  it("controller.init() creates and mounts a dedicated root node on the host element bound to `this`", async () => {
    if (!document.getElementById('favicon')) {
      const favicon = document.createElement('link');
      favicon.id = 'favicon';
      document.head.appendChild(favicon);
    }
    const register = vi.fn();
    window.entcore = { Behaviours: { register } };

    await import('./main');

    const [, behaviours] = register.mock.calls[0] as [string, RegisteredBehaviours];
    const host = document.createElement('div');
    document.body.appendChild(host);

    behaviours.sniplets['badge-assign'].controller.init.call(host);

    expect(host.querySelector('#minibadge-sniplet-badge-assign-root')).not.toBeNull();
  });

  it('calling controller.init() twice does not leak a root or duplicate the mount node (clean remount)', async () => {
    if (!document.getElementById('favicon')) {
      const favicon = document.createElement('link');
      favicon.id = 'favicon';
      document.head.appendChild(favicon);
    }
    const register = vi.fn();
    window.entcore = { Behaviours: { register } };

    await import('./main');

    const [, behaviours] = register.mock.calls[0] as [string, RegisteredBehaviours];
    const firstHost = document.createElement('div');
    document.body.appendChild(firstHost);
    const secondHost = document.createElement('div');
    document.body.appendChild(secondHost);

    behaviours.sniplets['badge-assign'].controller.init.call(firstHost);
    behaviours.sniplets['badge-assign'].controller.init.call(secondHost);

    // The first mount was unmounted and its node removed as part of the
    // idempotent remount, so only the SECOND host ends up with the node —
    // never two nodes sharing the same hardcoded id anywhere in the document.
    expect(firstHost.querySelector('#minibadge-sniplet-badge-assign-root')).toBeNull();
    expect(secondHost.querySelector('#minibadge-sniplet-badge-assign-root')).not.toBeNull();
    expect(document.querySelectorAll('#minibadge-sniplet-badge-assign-root')).toHaveLength(1);
  });

  it('controller.destroy() unmounts and removes the mount node, and a subsequent init() cleanly remounts', async () => {
    if (!document.getElementById('favicon')) {
      const favicon = document.createElement('link');
      favicon.id = 'favicon';
      document.head.appendChild(favicon);
    }
    const register = vi.fn();
    window.entcore = { Behaviours: { register } };

    await import('./main');

    const [, behaviours] = register.mock.calls[0] as [string, RegisteredBehaviours];
    const host = document.createElement('div');
    document.body.appendChild(host);

    behaviours.sniplets['badge-assign'].controller.init.call(host);
    expect(host.querySelector('#minibadge-sniplet-badge-assign-root')).not.toBeNull();

    behaviours.sniplets['badge-assign'].controller.destroy();
    expect(host.querySelector('#minibadge-sniplet-badge-assign-root')).toBeNull();

    behaviours.sniplets['badge-assign'].controller.init.call(host);
    expect(host.querySelector('#minibadge-sniplet-badge-assign-root')).not.toBeNull();
    expect(document.querySelectorAll('#minibadge-sniplet-badge-assign-root')).toHaveLength(1);
  });

  it('warns and falls back to document.body when controller.init() is called with a non-HTMLElement `this`', async () => {
    if (!document.getElementById('favicon')) {
      const favicon = document.createElement('link');
      favicon.id = 'favicon';
      document.head.appendChild(favicon);
    }
    const register = vi.fn();
    window.entcore = { Behaviours: { register } };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await import('./main');

    const [, behaviours] = register.mock.calls[0] as [string, RegisteredBehaviours];
    // No `.call(host)` — `this` inside `init()` is not an `HTMLElement`.
    behaviours.sniplets['badge-assign'].controller.init();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('controller.init() was called with a non-HTMLElement'),
    );
    expect(document.body.querySelector('#minibadge-sniplet-badge-assign-root')).not.toBeNull();

    warnSpy.mockRestore();
    behaviours.sniplets['badge-assign'].controller.destroy();
  });
});
