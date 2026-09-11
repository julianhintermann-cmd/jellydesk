import '@testing-library/jest-dom/vitest';
import '@/lib/i18n';

// jsdom hat kein CSS.supports; @liqui-design/glass prüft es beim Import.
if (typeof globalThis.CSS === 'undefined') {
  (globalThis as unknown as { CSS: unknown }).CSS = { supports: () => false };
}

// jsdom hat kein ResizeObserver; LiquiGlass beobachtet die Grösse der
// Glasfläche, um die Refraktions-Geometrie neu zu berechnen.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
}

import { server } from '@/test/msw';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
