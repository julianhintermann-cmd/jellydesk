import '@testing-library/jest-dom/vitest';

// jsdom hat kein CSS.supports; @liqui-design/glass prüft es beim Import.
if (typeof globalThis.CSS === 'undefined') {
  (globalThis as unknown as { CSS: unknown }).CSS = { supports: () => false };
}
