import { afterEach, describe, expect, it, vi } from 'vitest';
import { internalSessionStore } from './internal-session-store';

describe('internalSessionStore', () => {
  afterEach(() => internalSessionStore.clear());

  it('keeps the second-factor state separate from an authenticated session', () => {
    internalSessionStore.startSecondFactor('state-token', true);
    expect(internalSessionStore.getSnapshot()).toEqual({
      accessToken: null,
      stateToken: 'state-token',
      requiresConfiguration: true,
      status: 'second_factor',
    });

    internalSessionStore.authenticate('internal-token');
    expect(internalSessionStore.getSnapshot()).toEqual({
      accessToken: 'internal-token',
      stateToken: null,
      requiresConfiguration: false,
      status: 'authenticated',
    });
  });

  it('notifies subscribers and returns to the anonymous state', () => {
    const listener = vi.fn();
    const unsubscribe = internalSessionStore.subscribe(listener);
    internalSessionStore.authenticate('internal-token');
    internalSessionStore.clear();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(internalSessionStore.getSnapshot()).toEqual({
      accessToken: null,
      stateToken: null,
      requiresConfiguration: false,
      status: 'anonymous',
    });
    unsubscribe();
  });
});
