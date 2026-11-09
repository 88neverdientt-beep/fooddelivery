import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
class QuietChannel {
  onmessage: null = null;
  postMessage() {}
  close() {}
}
vi.stubGlobal('BroadcastChannel', QuietChannel);
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});
