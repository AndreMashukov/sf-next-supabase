import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  emitGenerationJobStarted,
  subscribeGenerationJobStarted,
} from './generation-job-events';

describe('generation-job-events', () => {
  beforeEach(() => {
    const listeners = new Map<string, Set<EventListener>>();

    vi.stubGlobal('window', {
      addEventListener(type: string, listener: EventListener) {
        const set = listeners.get(type) ?? new Set();
        set.add(listener);
        listeners.set(type, set);
      },
      removeEventListener(type: string, listener: EventListener) {
        listeners.get(type)?.delete(listener);
      },
      dispatchEvent(event: Event) {
        for (const listener of listeners.get(event.type) ?? []) {
          listener(event);
        }
        return true;
      },
    });

    vi.stubGlobal(
      'CustomEvent',
      class CustomEvent<T> extends Event {
        detail: T;
        constructor(type: string, init?: CustomEventInit<T>) {
          super(type);
          this.detail = init?.detail as T;
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('delivers job ids to subscribers', () => {
    const handler = vi.fn();
    const unsubscribe = subscribeGenerationJobStarted(handler);

    emitGenerationJobStarted('job-123');

    expect(handler).toHaveBeenCalledWith('job-123');
    unsubscribe();
  });

  it('stops delivering after unsubscribe', () => {
    const handler = vi.fn();
    const unsubscribe = subscribeGenerationJobStarted(handler);
    unsubscribe();

    emitGenerationJobStarted('job-456');

    expect(handler).not.toHaveBeenCalled();
  });
});
