# JellyDesk Plan 1 – Grundgerüst, Design-System, Onboarding & Verbindung

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine startbare Tauri-2-App "JellyDesk" mit Liquid-Glass-Shell (Titelleiste, Sidebar, Toolbar, Backdrop-Ebene), i18n (de/en), Rust-Basis (SQLite-Settings, Credential Manager, Jellyseerr-Client) und dem kompletten Onboarding (Server lokal/extern → Login per Quick Connect oder Passwort → Jellyseerr), das nach dem Login eine Startseiten-Attrappe mit Benutzernamen zeigt.

**Architecture:** Tauri 2 (Rust) hostet ein React-19-Frontend in WebView2. Das Frontend spricht direkt mit Jellyfin über das offizielle TypeScript-SDK; ein `ConnectionManager` wählt zwischen lokaler und externer URL. Rust liefert nur, was WebView2 nicht kann: SQLite-Settings, Windows Credential Manager, Jellyseerr-HTTP mit Cookie-Session, Registry-Abfrage der Windows-Transparenz. Glas kommt von Liqui UI (`LiquiGlass`-Primitive + Registry-Komponenten), immer dunkel, mit Medien-Backdrop hinter der Glas-Ebene.

**Tech Stack:** Tauri 2, Rust (rusqlite, keyring, reqwest, winreg, wiremock), React 19, TypeScript, Vite, Tailwind CSS v4, Base UI, Liqui UI (`@liqui-design/glass`), TanStack Router, Zustand, `motion`, i18next, `@jellyfin/sdk`, Vitest + Testing Library + MSW.

**Spec:** `docs/superpowers/specs/2026-09-11-jellydesk-design.md` (Abschnitte 2, 3, 4.1, 5, 10.1, 11, 12, 13)

## Global Constraints

- Windows 10 1809+ / Windows 11, x64; WebView2 vorausgesetzt (Installer lädt Bootstrapper nach).
- Tauri 2, React 19, TypeScript strict, Tailwind CSS v4, Liqui UI auf Base UI; Refraktion nur in Chromium (WebView2 ist Chromium).
- Immer dunkel: `<html data-theme="dark" class="dark">`, Basisfarbe `#0A0A0F`.
- Glas nur auf schwebenden Ebenen (Titelleiste, Sidebar, Toolbar, Sheets, Menüs, Popover, Toasts). Content bleibt solid. Nie mehr als zwei Glas-Ebenen übereinander.
- Liqui-Optik: `profile: 'squircle'`, `frost: 0.35`, `specular: 0.7`, `dispersion` 0.1–0.2 (Plan verwendet 0.1), `blur` 1 px; grosse Flächen `refraction: 150, bezel: 28`, Buttons Registry-Default (`45 / 11`).
- Reduzierte Transparenz (Windows-Registry `EnableTransparency = 0` oder App-Einstellung) → alle Glasflächen `material="clear"` mit opakem Tint `rgba(22, 24, 34, 0.92)`.
- Auth-Header: `Client="JellyDesk"`, `Device="<Computername>"`, `DeviceId="<UUID, einmal erzeugt>"`, `Version="<package.json version>"`.
- Zugangsdaten (Jellyfin-Token, Jellyseerr-Passwort) nur im Windows Credential Manager, Service-Name `JellyDesk`. Nie in SQLite, nie in Logs.
- Identifier `ch.hintermann.jellydesk`, Produktname `JellyDesk`, NSIS `installMode: "currentUser"`.
- ConnectionManager: lokal Timeout 2 500 ms, extern 6 000 ms, Recheck 60 000 ms, Fallback nach 3 Fehlern in Folge.
- Quick Connect: Polling alle 2 000 ms.
- Sprache: de und en, jeder Key in beiden Dateien.
- Commits klein und häufig, Nachrichten `feat:` / `fix:` / `test:` / `chore:` / `docs:`, jeweils mit `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Frontend-Code ruft nie `invoke` direkt auf, nur über `src/lib/tauri/*`.

---

## Dateistruktur (Ergebnis dieses Plans)

```
JellyDesk/
├── package.json  vite.config.ts  tsconfig.json  tsconfig.node.json  index.html
├── eslint.config.js  .prettierrc  components.json
├── src/
│   ├── main.tsx                         # React-Root, Provider, Router
│   ├── app/
│   │   ├── App.tsx                      # Provider-Baum (Liqui, Query, i18n), Boot-Gate
│   │   ├── router.tsx                   # TanStack Router (hash history), Routen, Auth-Guard
│   │   └── shell/
│   │       ├── Shell.tsx                # Layout: Backdrop + Titlebar + Sidebar + Toolbar + Outlet
│   │       ├── Titlebar.tsx             # Drag-Region, Fensterknöpfe
│   │       ├── Sidebar.tsx              # Navigation
│   │       ├── Toolbar.tsx              # Zurück, Titel
│   │       └── BackdropLayer.tsx        # Cross-Fade-Backdrop hinter allem
│   ├── components/
│   │   ├── ui/                          # Liqui-Registry-Komponenten (generiert)
│   │   ├── glass/GlassPanel.tsx         # LiquiGlass-Presets + Reduzierte Transparenz
│   │   └── form/TextInput.tsx           # Solides Eingabefeld
│   ├── features/
│   │   ├── auth/session.ts              # Session-Store (Zustand), boot/signIn/signOut
│   │   ├── onboarding/
│   │   │   ├── OnboardingPage.tsx       # Wizard-Zustand server → login → seerr
│   │   │   ├── ServerStep.tsx
│   │   │   ├── LoginStep.tsx
│   │   │   ├── useQuickConnect.ts
│   │   │   └── SeerrStep.tsx
│   │   ├── home/HomePage.tsx            # Attrappe: "Hallo <Name>", Abmelden
│   │   └── appearance/appearance.ts     # Store: reducedTransparency (System + App)
│   ├── lib/
│   │   ├── connection/
│   │   │   ├── ConnectionManager.ts
│   │   │   ├── probe.ts                 # probeJellyfin(url, timeout)
│   │   │   └── url.ts                   # normalizeServerUrl, deriveSeerrUrl
│   │   ├── jellyfin/
│   │   │   ├── client.ts                # createJellyfin, createApi
│   │   │   └── auth.ts                  # Passwort-Login, Quick Connect
│   │   ├── seerr/client.ts              # seerrSetBaseUrl, seerrLogin, seerrRequest
│   │   ├── settings/keys.ts             # SettingKeys, CredentialKeys
│   │   ├── tauri/
│   │   │   ├── settings.ts  credentials.ts  system.ts  window.ts
│   │   ├── i18n/index.ts  locales/de.json  locales/en.json
│   │   └── backdrop.ts                  # Backdrop-Store
│   ├── styles/globals.css
│   └── test/setup.ts  test/msw.ts
├── src-tauri/
│   ├── Cargo.toml  tauri.conf.json  build.rs  capabilities/default.json  icons/
│   └── src/
│       ├── main.rs  lib.rs
│       ├── db.rs  credentials.rs  seerr.rs  system.rs
│       └── commands/mod.rs  commands/settings.rs  commands/credentials.rs  commands/seerr.rs  commands/system.rs
├── .github/workflows/ci.yml
└── docs/superpowers/{specs,plans}/
```

---

## Voraussetzung: Rust-Toolchain (einmalig, manuell durch Julian)

Auf dem Dev-PC fehlen `rustup` und die Visual Studio Build Tools. Ohne sie laufen Task 2 ff. nicht. Installation (Build Tools fragen einmalig per UAC):

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
winget install --id Rustlang.Rustup
```

Danach neue Shell öffnen und prüfen:

```powershell
cargo -V; rustc -V; rustup show
```

Erwartung: `cargo 1.8x`, Toolchain `stable-x86_64-pc-windows-msvc`.

---

### Task 1: Frontend-Grundgerüst (Vite + React 19 + TS + Tailwind v4 + Vitest + ESLint)

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `eslint.config.js`, `.prettierrc`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/styles/globals.css`, `src/test/setup.ts`
- Test: `src/app/App.test.tsx`

**Interfaces:**
- Produces: Pfad-Alias `@/` → `src/`; Skripte `npm run dev|build|test|lint|typecheck`; Vitest mit jsdom + `src/test/setup.ts`.

- [ ] **Step 1: package.json und Konfigurationsdateien anlegen**

`package.json`:

```json
{
  "name": "jellydesk",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "tauri": "tauri"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: { target: 'chrome120', sourcemap: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
```

`index.html`:

```html
<!doctype html>
<html lang="de" data-theme="dark" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>JellyDesk</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`eslint.config.js`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'src-tauri', 'src/components/ui'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
);
```

`.prettierrc`:

```json
{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "all" }
```

`src/styles/globals.css`:

```css
@import 'tailwindcss';

:root {
  --jd-base: #0a0a0f;
  color-scheme: dark;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
  background: var(--jd-base);
  color: rgba(245, 246, 255, 0.96);
  font-family: 'Inter', 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
  user-select: none;
}
```

`src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/styles/globals.css';
import { App } from '@/app/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`src/app/App.tsx` (vorläufig, wird in Task 3/7/10 erweitert):

```tsx
export function App() {
  return <main className="flex h-full items-center justify-center text-2xl">JellyDesk</main>;
}
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';

// jsdom hat kein CSS.supports; @liqui-design/glass prüft es beim Import.
if (typeof globalThis.CSS === 'undefined') {
  (globalThis as unknown as { CSS: unknown }).CSS = { supports: () => false };
}
```

- [ ] **Step 2: Abhängigkeiten installieren**

```bash
npm i react react-dom
npm i -D vite @vitejs/plugin-react typescript @types/react @types/react-dom tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event eslint @eslint/js typescript-eslint eslint-plugin-react-hooks globals prettier
```

- [ ] **Step 3: Failing Test schreiben**

`src/app/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { App } from '@/app/App';

describe('App', () => {
  it('rendert den App-Namen', () => {
    render(<App />);
    expect(screen.getByText('JellyDesk')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Test laufen lassen, Typecheck und Lint**

Run: `npm test`
Expected: 1 passed.
Run: `npm run typecheck && npm run lint`
Expected: keine Fehler.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: vite react ts tailwind vitest scaffold

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Tauri 2 initialisieren (rahmenloses Fenster, NSIS per-user, Capabilities)

**Files:**
- Create: `src-tauri/**` (via `tauri init`), dann modifizieren: `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `npm run tauri dev` startet die App; Rust-Crate `jellydesk` mit `jellydesk_lib::run()`; Capability `default` mit Fenster-Rechten.

Voraussetzung: Rust-Toolchain installiert (siehe oben).

- [ ] **Step 1: Tauri-CLI und API installieren, Projekt initialisieren**

```bash
npm i -D @tauri-apps/cli@^2
npm i @tauri-apps/api@^2 @tauri-apps/plugin-opener@^2
npx tauri init --ci --app-name JellyDesk --window-title JellyDesk --frontend-dist ../dist --dev-url http://localhost:5173 --before-dev-command "npm run dev" --before-build-command "npm run build"
```

Prüfen: `src-tauri/src/main.rs` ruft `jellydesk_lib::run()` auf (falls der Name anders lautet, den tatsächlichen Namen in den folgenden Tasks verwenden).

- [ ] **Step 2: tauri.conf.json ersetzen**

`src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "JellyDesk",
  "version": "0.1.0",
  "identifier": "ch.hintermann.jellydesk",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "JellyDesk",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 640,
        "decorations": false,
        "resizable": true,
        "center": true,
        "backgroundColor": "#0A0A0F"
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: http: https: asset: http://asset.localhost http://jfimg.localhost; media-src 'self' blob: http: https: asset: http://asset.localhost; connect-src 'self' ipc: http://ipc.localhost http: https: ws: wss:; font-src 'self' data:; worker-src 'self' blob:"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": { "installMode": "currentUser", "languages": ["German", "English"] },
      "webviewInstallMode": { "type": "downloadBootstrapper" }
    }
  }
}
```

- [ ] **Step 3: Capabilities setzen**

`src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "JellyDesk main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-start-dragging",
    "core:window:allow-minimize",
    "core:window:allow-maximize",
    "core:window:allow-unmaximize",
    "core:window:allow-toggle-maximize",
    "core:window:allow-is-maximized",
    "core:window:allow-close",
    "core:window:allow-set-fullscreen",
    "core:window:allow-is-fullscreen",
    "opener:default"
  ]
}
```

- [ ] **Step 4: lib.rs bereinigen (Beispiel-Command entfernen)**

`src-tauri/src/lib.rs`:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running JellyDesk");
}
```

`.gitignore` ergänzen:

```
src-tauri/target/
src-tauri/gen/schemas/
```

- [ ] **Step 5: App starten und prüfen**

Run: `npm run tauri dev`
Expected: Rahmenloses Fenster 1280×800 mit dunklem Hintergrund und Text "JellyDesk". Fenster mit Alt+F4 schliessen.
Run: `npm run build && cd src-tauri && cargo test && cd ..`
Expected: kompiliert, 0 Tests, kein Fehler. (`npm run build` ist nötig, weil `tauri::generate_context!` das Verzeichnis `dist` beim Kompilieren einbettet; ohne `dist` bricht `cargo test` ab.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: tauri 2 shell with frameless window and per-user nsis config

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Liqui UI, Glas-Theme und GlassPanel-Preset

**Files:**
- Create: `components.json` (via shadcn), `src/components/ui/*.tsx` (via Registry), `src/lib/utils.ts` (via shadcn)
- Create: `src/components/glass/GlassPanel.tsx`, `src/features/appearance/appearance.ts`
- Modify: `src/app/App.tsx`, `src/styles/globals.css`
- Test: `src/components/glass/GlassPanel.test.tsx`, `src/features/appearance/appearance.test.ts`

**Interfaces:**
- Produces:
  - `GlassPanel` (`src/components/glass/GlassPanel.tsx`): `React.forwardRef<HTMLDivElement, GlassPanelProps>`; `GlassPanelProps = Omit<LiquiGlassProps, 'radius'|'refraction'|'bezel'> & { preset?: 'bar' | 'sidebar' | 'sheet' | 'popover' | 'pill' }`.
  - `useAppearance` (Zustand): `{ systemTransparency: boolean; userReducedTransparency: boolean; setSystemTransparency(v: boolean): void; setUserReducedTransparency(v: boolean): void }` und Selector `selectReducedTransparency(state): boolean` (= `userReducedTransparency || !systemTransparency`).
  - `LiquiThemeProvider` im App-Root mit `jellyDeskGlassTheme`.

- [ ] **Step 1: shadcn mit Base UI initialisieren und Liqui-Komponenten holen**

```bash
npx shadcn@latest init -b base -y
```

Falls nach Basisfarbe gefragt: `neutral`; CSS-Datei `src/styles/globals.css`. Danach in `components.json` den Registry-Namespace ergänzen:

```json
"registries": {
  "@liqui-design": "https://liqui.design/r/{name}.json"
}
```

Komponenten installieren:

```bash
npx shadcn@latest add @liqui-design/button @liqui-design/input @liqui-design/field @liqui-design/tabs @liqui-design/switch @liqui-design/slider @liqui-design/select @liqui-design/menu @liqui-design/popover @liqui-design/dialog @liqui-design/tooltip @liqui-design/toast @liqui-design/progress @liqui-design/scroll-area @liqui-design/toolbar @liqui-design/avatar @liqui-design/separator -y
```

Prüfen: `src/components/ui/button.tsx` existiert, `@liqui-design/glass` und `@base-ui/react` stehen in `package.json`, `globals.css` enthält `--lq-*`-Variablen. Die exportierten Namen der generierten Dateien kurz ansehen (z. B. `export { Button }`), spätere Tasks importieren aus `@/components/ui/<name>`.

- [ ] **Step 2: Failing Tests für Appearance-Store und GlassPanel**

`src/features/appearance/appearance.test.ts`:

```ts
import { useAppearance, selectReducedTransparency } from '@/features/appearance/appearance';

describe('appearance store', () => {
  beforeEach(() => {
    useAppearance.setState({ systemTransparency: true, userReducedTransparency: false });
  });

  it('ist standardmässig nicht reduziert', () => {
    expect(selectReducedTransparency(useAppearance.getState())).toBe(false);
  });

  it('reduziert, wenn Windows-Transparenz aus ist', () => {
    useAppearance.getState().setSystemTransparency(false);
    expect(selectReducedTransparency(useAppearance.getState())).toBe(true);
  });

  it('reduziert, wenn der Benutzer es wählt', () => {
    useAppearance.getState().setUserReducedTransparency(true);
    expect(selectReducedTransparency(useAppearance.getState())).toBe(true);
  });
});
```

`src/components/glass/GlassPanel.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { useAppearance } from '@/features/appearance/appearance';

describe('GlassPanel', () => {
  beforeEach(() => {
    useAppearance.setState({ systemTransparency: true, userReducedTransparency: false });
  });

  it('rendert Kinder in einer Glasfläche', () => {
    const { container, getByText } = render(<GlassPanel preset="bar">Hallo</GlassPanel>);
    expect(getByText('Hallo')).toBeInTheDocument();
    expect(container.querySelector('.liqui-glass')).not.toBeNull();
  });

  it('setzt bei reduzierter Transparenz einen opaken Tint', () => {
    useAppearance.setState({ systemTransparency: false });
    const { container } = render(<GlassPanel preset="sheet">X</GlassPanel>);
    const el = container.querySelector('.liqui-glass') as HTMLElement;
    expect(el.style.getPropertyValue('--lq-tint')).toBe('rgba(22, 24, 34, 0.92)');
  });
});
```

- [ ] **Step 3: Tests laufen lassen (müssen fehlschlagen)**

Run: `npm test`
Expected: FAIL, Module `@/features/appearance/appearance` und `@/components/glass/GlassPanel` nicht gefunden.

- [ ] **Step 4: Store und GlassPanel implementieren**

```bash
npm i zustand
```

`src/features/appearance/appearance.ts`:

```ts
import { create } from 'zustand';

export interface AppearanceState {
  systemTransparency: boolean;
  userReducedTransparency: boolean;
  setSystemTransparency: (value: boolean) => void;
  setUserReducedTransparency: (value: boolean) => void;
}

export const useAppearance = create<AppearanceState>((set) => ({
  systemTransparency: true,
  userReducedTransparency: false,
  setSystemTransparency: (value) => set({ systemTransparency: value }),
  setUserReducedTransparency: (value) => set({ userReducedTransparency: value }),
}));

export const selectReducedTransparency = (s: AppearanceState): boolean =>
  s.userReducedTransparency || !s.systemTransparency;
```

`src/components/glass/GlassPanel.tsx`:

```tsx
import * as React from 'react';
import { LiquiGlass, type LiquiGlassProps } from '@liqui-design/glass';
import { useAppearance, selectReducedTransparency } from '@/features/appearance/appearance';

export type GlassPreset = 'bar' | 'sidebar' | 'sheet' | 'popover' | 'pill';

const PRESETS: Record<GlassPreset, Pick<LiquiGlassProps, 'radius' | 'refraction' | 'bezel'>> = {
  bar: { radius: 20, refraction: 150, bezel: 28 },
  sidebar: { radius: 20, refraction: 150, bezel: 28 },
  sheet: { radius: 24, refraction: 150, bezel: 28 },
  popover: { radius: 16, refraction: 90, bezel: 18 },
  pill: { radius: 999, refraction: 45, bezel: 11 },
};

export const OPAQUE_TINT = 'rgba(22, 24, 34, 0.92)';

export type GlassPanelProps = Omit<LiquiGlassProps, 'radius' | 'refraction' | 'bezel'> & {
  preset?: GlassPreset;
};

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(function GlassPanel(
  { preset = 'bar', style, ...rest },
  ref,
) {
  const reduced = useAppearance(selectReducedTransparency);
  const geometry = PRESETS[preset];
  const reducedStyle = reduced
    ? ({ '--lq-tint': OPAQUE_TINT, '--lq-tint-deep': OPAQUE_TINT } as React.CSSProperties)
    : undefined;
  return (
    <LiquiGlass
      ref={ref}
      {...geometry}
      {...rest}
      material={reduced ? 'clear' : rest.material}
      frost={reduced ? 1 : rest.frost}
      style={{ ...reducedStyle, ...style }}
    />
  );
});
```

`src/app/App.tsx`:

```tsx
import { LiquiThemeProvider, type LiquiGlassTheme } from '@liqui-design/glass';
import { GlassPanel } from '@/components/glass/GlassPanel';

export const jellyDeskGlassTheme: Partial<LiquiGlassTheme> = {
  profile: 'squircle',
  frost: 0.35,
  specular: 0.7,
  dispersion: 0.1,
  saturation: 1.6,
};

export function App() {
  return (
    <LiquiThemeProvider theme={{ glass: jellyDeskGlassTheme }}>
      <main className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#3b2a6b,transparent_55%),radial-gradient(circle_at_70%_80%,#0f4c5c,transparent_50%)]">
        <GlassPanel preset="sheet" className="px-10 py-8 text-2xl">
          JellyDesk
        </GlassPanel>
      </main>
    </LiquiThemeProvider>
  );
}
```

- [ ] **Step 5: Tests und Sichtprüfung**

Run: `npm test`
Expected: alle Tests grün (App, appearance, GlassPanel).
Run: `npm run tauri dev`
Expected: Glas-Sheet über dem Farbverlauf, mit sichtbarer Linsen-Brechung am Rand (Chromium). Screenshot nicht nötig, aber Rand muss den Verlauf verzerren, nicht nur verwischen.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: liqui ui glass theme, GlassPanel presets and appearance store

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Windows-Transparenz aus der Registry (Rust) + Appearance-Sync

**Files:**
- Create: `src-tauri/src/system.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/commands/system.rs`
- Create: `src/lib/tauri/system.ts`, `src/features/appearance/useSystemAppearanceSync.ts`
- Modify: `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src/app/App.tsx`
- Test: Rust-Unit-Test in `system.rs`; `src/features/appearance/useSystemAppearanceSync.test.tsx`

**Interfaces:**
- Produces: Rust-Command `system_transparency_enabled() -> bool`; TS `getSystemTransparencyEnabled(): Promise<boolean>` (`src/lib/tauri/system.ts`); Hook `useSystemAppearanceSync()` (liest einmal beim Mount und alle 30 s).

- [ ] **Step 1: Failing Rust-Test**

`src-tauri/src/system.rs`:

```rust
/// `EnableTransparency` fehlt auf frischen Systemen → Windows-Standard ist "an".
pub fn transparency_from_value(value: Option<u32>) -> bool {
    value.map_or(true, |v| v != 0)
}

#[cfg(target_os = "windows")]
pub fn system_transparency_enabled() -> bool {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    let value = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize")
        .ok()
        .and_then(|key| key.get_value::<u32, _>("EnableTransparency").ok());
    transparency_from_value(value)
}

#[cfg(not(target_os = "windows"))]
pub fn system_transparency_enabled() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::transparency_from_value;

    #[test]
    fn missing_value_means_enabled() {
        assert!(transparency_from_value(None));
    }

    #[test]
    fn zero_means_disabled() {
        assert!(!transparency_from_value(Some(0)));
    }

    #[test]
    fn one_means_enabled() {
        assert!(transparency_from_value(Some(1)));
    }
}
```

`src-tauri/Cargo.toml` unter `[dependencies]` ergänzen:

```toml
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[target.'cfg(windows)'.dependencies]
winreg = "0.55"
```

- [ ] **Step 2: Commands-Modul und Registrierung**

`src-tauri/src/commands/mod.rs`:

```rust
pub mod system;
```

`src-tauri/src/commands/system.rs`:

```rust
#[tauri::command]
pub fn system_transparency_enabled() -> bool {
    crate::system::system_transparency_enabled()
}
```

`src-tauri/src/lib.rs`:

```rust
mod commands;
mod system;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::system::system_transparency_enabled
        ])
        .run(tauri::generate_context!())
        .expect("error while running JellyDesk");
}
```

Run: `cd src-tauri && cargo test && cd ..`
Expected: 3 Tests bestanden.

- [ ] **Step 3: Failing Frontend-Test für den Sync-Hook**

`src/features/appearance/useSystemAppearanceSync.test.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useAppearance } from '@/features/appearance/appearance';
import { useSystemAppearanceSync } from '@/features/appearance/useSystemAppearanceSync';

vi.mock('@/lib/tauri/system', () => ({
  getSystemTransparencyEnabled: vi.fn(async () => false),
}));

describe('useSystemAppearanceSync', () => {
  it('übernimmt den Windows-Wert in den Store', async () => {
    useAppearance.setState({ systemTransparency: true });
    renderHook(() => useSystemAppearanceSync());
    await waitFor(() => expect(useAppearance.getState().systemTransparency).toBe(false));
  });
});
```

Run: `npm test -- useSystemAppearanceSync`
Expected: FAIL, Modul nicht gefunden.

- [ ] **Step 4: TS-Wrapper und Hook**

`src/lib/tauri/system.ts`:

```ts
import { invoke, isTauri } from '@tauri-apps/api/core';

export async function getSystemTransparencyEnabled(): Promise<boolean> {
  if (!isTauri()) return true;
  return invoke<boolean>('system_transparency_enabled');
}
```

`src/features/appearance/useSystemAppearanceSync.ts`:

```ts
import { useEffect } from 'react';
import { getSystemTransparencyEnabled } from '@/lib/tauri/system';
import { useAppearance } from '@/features/appearance/appearance';

const POLL_MS = 30_000;

export function useSystemAppearanceSync(): void {
  const setSystemTransparency = useAppearance((s) => s.setSystemTransparency);
  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      try {
        const enabled = await getSystemTransparencyEnabled();
        if (!cancelled) setSystemTransparency(enabled);
      } catch {
        /* Windows-Wert nicht lesbar → Standard beibehalten */
      }
    };
    void read();
    const id = window.setInterval(read, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [setSystemTransparency]);
}
```

In `src/app/App.tsx` innerhalb der Komponente `App` vor dem `return` einfügen: `useSystemAppearanceSync();` (Import ergänzen).

- [ ] **Step 5: Tests**

Run: `npm test && npm run typecheck`
Expected: grün.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: read windows transparency setting and sync reduced-transparency mode

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: i18n (de/en) mit Paritätstest

**Files:**
- Create: `src/lib/i18n/index.ts`, `src/lib/i18n/locales/de.json`, `src/lib/i18n/locales/en.json`
- Modify: `src/main.tsx`
- Test: `src/lib/i18n/i18n.test.ts`

**Interfaces:**
- Produces: `i18n` (i18next-Instanz, Default `de`), `t('key')` via `useTranslation()`; `setLanguage(lang: 'de' | 'en')`; Übersetzungs-Keys aus `de.json` (siehe unten), die spätere Tasks verwenden.

- [ ] **Step 1: Failing Test**

`src/lib/i18n/i18n.test.ts`:

```ts
import de from '@/lib/i18n/locales/de.json';
import en from '@/lib/i18n/locales/en.json';
import { i18n, setLanguage } from '@/lib/i18n';

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flatten(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe('i18n', () => {
  it('de und en haben identische Keys', () => {
    expect(flatten(de).sort()).toEqual(flatten(en).sort());
  });

  it('wechselt die Sprache', async () => {
    await setLanguage('en');
    expect(i18n.t('common.continue')).toBe('Continue');
    await setLanguage('de');
    expect(i18n.t('common.continue')).toBe('Weiter');
  });
});
```

Run: `npm test -- i18n`
Expected: FAIL.

- [ ] **Step 2: Implementieren**

```bash
npm i i18next react-i18next
```

`src/lib/i18n/locales/de.json`:

```json
{
  "common": {
    "continue": "Weiter",
    "back": "Zurück",
    "skip": "Überspringen",
    "cancel": "Abbrechen",
    "retry": "Erneut versuchen",
    "loading": "Lädt…",
    "signOut": "Abmelden",
    "close": "Schliessen",
    "minimize": "Minimieren",
    "maximize": "Maximieren"
  },
  "nav": {
    "home": "Start",
    "libraries": "Bibliotheken",
    "search": "Suche",
    "discover": "Discover",
    "downloads": "Downloads",
    "settings": "Einstellungen"
  },
  "onboarding": {
    "server": {
      "title": "Mit deinem Jellyfin-Server verbinden",
      "localUrl": "Lokale Adresse",
      "externalUrl": "Externe Adresse (optional)",
      "connect": "Verbinden",
      "reachable": "Erreichbar",
      "unreachable": "Nicht erreichbar",
      "continueAnyway": "Trotzdem weiter",
      "invalidUrl": "Bitte eine gültige Adresse eingeben (z. B. http://192.168.1.125:8096)"
    },
    "login": {
      "title": "Anmelden bei {{server}}",
      "quickConnect": "Quick Connect",
      "password": "Passwort",
      "username": "Benutzername",
      "passwordField": "Passwort",
      "signIn": "Anmelden",
      "quickConnectHint": "Gib diesen Code in einem angemeldeten Jellyfin-Client unter Einstellungen → Quick Connect ein.",
      "quickConnectDisabled": "Quick Connect ist auf diesem Server deaktiviert.",
      "waiting": "Warte auf Bestätigung…",
      "failed": "Anmeldung fehlgeschlagen. Bitte Eingaben prüfen."
    },
    "seerr": {
      "title": "Jellyseerr verbinden (optional)",
      "description": "Mit Jellyseerr kannst du Filme und Serien anfragen. Die Anmeldung erfolgt mit deinen Jellyfin-Zugangsdaten.",
      "localUrl": "Lokale Adresse",
      "externalUrl": "Externe Adresse (optional)",
      "passwordHint": "Du hast dich per Quick Connect angemeldet. Für Jellyseerr wird dein Jellyfin-Passwort einmalig benötigt. Es wird nur im Windows-Anmeldeinformationsverwalter gespeichert.",
      "connect": "Verbinden",
      "failed": "Verbindung zu Jellyseerr fehlgeschlagen."
    }
  },
  "home": {
    "greeting": "Hallo {{name}}"
  },
  "connection": {
    "offline": "Offline – Server nicht erreichbar",
    "external": "Verbunden über externe Adresse"
  }
}
```

`src/lib/i18n/locales/en.json`:

```json
{
  "common": {
    "continue": "Continue",
    "back": "Back",
    "skip": "Skip",
    "cancel": "Cancel",
    "retry": "Retry",
    "loading": "Loading…",
    "signOut": "Sign out",
    "close": "Close",
    "minimize": "Minimize",
    "maximize": "Maximize"
  },
  "nav": {
    "home": "Home",
    "libraries": "Libraries",
    "search": "Search",
    "discover": "Discover",
    "downloads": "Downloads",
    "settings": "Settings"
  },
  "onboarding": {
    "server": {
      "title": "Connect to your Jellyfin server",
      "localUrl": "Local address",
      "externalUrl": "External address (optional)",
      "connect": "Connect",
      "reachable": "Reachable",
      "unreachable": "Unreachable",
      "continueAnyway": "Continue anyway",
      "invalidUrl": "Please enter a valid address (e.g. http://192.168.1.125:8096)"
    },
    "login": {
      "title": "Sign in to {{server}}",
      "quickConnect": "Quick Connect",
      "password": "Password",
      "username": "Username",
      "passwordField": "Password",
      "signIn": "Sign in",
      "quickConnectHint": "Enter this code in a signed-in Jellyfin client under Settings → Quick Connect.",
      "quickConnectDisabled": "Quick Connect is disabled on this server.",
      "waiting": "Waiting for approval…",
      "failed": "Sign-in failed. Please check your input."
    },
    "seerr": {
      "title": "Connect Jellyseerr (optional)",
      "description": "Jellyseerr lets you request movies and shows. It signs in with your Jellyfin credentials.",
      "localUrl": "Local address",
      "externalUrl": "External address (optional)",
      "passwordHint": "You signed in with Quick Connect. Jellyseerr needs your Jellyfin password once. It is stored only in Windows Credential Manager.",
      "connect": "Connect",
      "failed": "Could not connect to Jellyseerr."
    }
  },
  "home": {
    "greeting": "Hello {{name}}"
  },
  "connection": {
    "offline": "Offline – server unreachable",
    "external": "Connected via external address"
  }
}
```

`src/lib/i18n/index.ts`:

```ts
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';

export type AppLanguage = 'de' | 'en';

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources: { de: { translation: de }, en: { translation: en } },
  lng: 'de',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export async function setLanguage(lang: AppLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}
```

In `src/main.tsx` als erste Import-Zeile ergänzen: `import '@/lib/i18n';`

- [ ] **Step 3: Test, Commit**

Run: `npm test && npm run typecheck`
Expected: grün.

```bash
git add -A
git commit -m "feat: i18n with german and english resources

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Rust-Basis: SQLite-Settings, Credential Manager, typisierte TS-Wrapper

**Files:**
- Create: `src-tauri/src/db.rs`, `src-tauri/src/credentials.rs`, `src-tauri/src/commands/settings.rs`, `src-tauri/src/commands/credentials.rs`
- Modify: `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/src/commands/mod.rs`
- Create: `src/lib/settings/keys.ts`, `src/lib/tauri/settings.ts`, `src/lib/tauri/credentials.ts`
- Test: Rust-Tests in `db.rs`; `src/lib/tauri/settings.test.ts`

**Interfaces:**
- Produces (Rust): `Db::open(path)`, `Db::open_in_memory()`, `get_setting(&str) -> Result<Option<String>>`, `set_setting(&str, &str)`, `delete_setting(&str)`; `AppState { db: Mutex<Db> }` als Tauri-State; Commands `settings_get(key) -> Option<String>`, `settings_set(key, value)`, `settings_delete(key)`, `credentials_get(key) -> Option<String>`, `credentials_set(key, secret)`, `credentials_delete(key)`.
- Produces (TS): `getSetting<T>(key: string): Promise<T | null>`, `setSetting<T>(key, value: T): Promise<void>`, `deleteSetting(key)`, `getCredential(key): Promise<string | null>`, `setCredential(key, secret)`, `deleteCredential(key)`; Konstanten `SettingKeys`, `CredentialKeys`.

- [ ] **Step 1: Failing Rust-Tests in db.rs**

`src-tauri/src/db.rs`:

```rust
use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;

pub struct Db {
    conn: Connection,
}

impl Db {
    pub fn open(path: &Path) -> rusqlite::Result<Self> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        let db = Self { conn };
        db.migrate()?;
        Ok(db)
    }

    pub fn open_in_memory() -> rusqlite::Result<Self> {
        let db = Self { conn: Connection::open_in_memory()? };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> rusqlite::Result<()> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);",
        )?;
        let version = self.schema_version()?;
        if version < 1 {
            self.conn.execute_batch(
                "CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                 INSERT INTO schema_version (version) VALUES (1);",
            )?;
        }
        Ok(())
    }

    pub fn schema_version(&self) -> rusqlite::Result<i64> {
        self.conn
            .query_row("SELECT COALESCE(MAX(version), 0) FROM schema_version", [], |r| r.get(0))
    }

    pub fn get_setting(&self, key: &str) -> rusqlite::Result<Option<String>> {
        self.conn
            .query_row("SELECT value FROM settings WHERE key = ?1", params![key], |r| r.get(0))
            .optional()
    }

    pub fn set_setting(&self, key: &str, value: &str) -> rusqlite::Result<()> {
        self.conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn delete_setting(&self, key: &str) -> rusqlite::Result<()> {
        self.conn.execute("DELETE FROM settings WHERE key = ?1", params![key])?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::Db;

    #[test]
    fn migrates_to_version_1() {
        let db = Db::open_in_memory().unwrap();
        assert_eq!(db.schema_version().unwrap(), 1);
    }

    #[test]
    fn migration_is_idempotent() {
        let db = Db::open_in_memory().unwrap();
        db.migrate().unwrap();
        assert_eq!(db.schema_version().unwrap(), 1);
    }

    #[test]
    fn setting_roundtrip_and_overwrite() {
        let db = Db::open_in_memory().unwrap();
        assert_eq!(db.get_setting("a").unwrap(), None);
        db.set_setting("a", "1").unwrap();
        assert_eq!(db.get_setting("a").unwrap(), Some("1".into()));
        db.set_setting("a", "2").unwrap();
        assert_eq!(db.get_setting("a").unwrap(), Some("2".into()));
        db.delete_setting("a").unwrap();
        assert_eq!(db.get_setting("a").unwrap(), None);
    }
}
```

`src-tauri/Cargo.toml` `[dependencies]` ergänzen:

```toml
rusqlite = { version = "0.32", features = ["bundled"] }
keyring = { version = "3", features = ["windows-native"] }
```

Run: `cd src-tauri && cargo test db:: && cd ..`
Expected: kompiliert nicht, weil `db` noch nicht in `lib.rs` eingebunden ist → nach Step 2 grün.

- [ ] **Step 2: credentials.rs, Commands, State, Registrierung**

`src-tauri/src/credentials.rs`:

```rust
const SERVICE: &str = "JellyDesk";

fn entry(key: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, key).map_err(|e| e.to_string())
}

pub fn get(key: &str) -> Result<Option<String>, String> {
    match entry(key)?.get_password() {
        Ok(secret) => Ok(Some(secret)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn set(key: &str, secret: &str) -> Result<(), String> {
    entry(key)?.set_password(secret).map_err(|e| e.to_string())
}

pub fn delete(key: &str) -> Result<(), String> {
    match entry(key)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
```

`src-tauri/src/commands/settings.rs`:

```rust
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn settings_get(state: State<'_, AppState>, key: String) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_setting(&key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn settings_set(state: State<'_, AppState>, key: String, value: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.set_setting(&key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn settings_delete(state: State<'_, AppState>, key: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_setting(&key).map_err(|e| e.to_string())
}
```

`src-tauri/src/commands/credentials.rs`:

```rust
#[tauri::command]
pub fn credentials_get(key: String) -> Result<Option<String>, String> {
    crate::credentials::get(&key)
}

#[tauri::command]
pub fn credentials_set(key: String, secret: String) -> Result<(), String> {
    crate::credentials::set(&key, &secret)
}

#[tauri::command]
pub fn credentials_delete(key: String) -> Result<(), String> {
    crate::credentials::delete(&key)
}
```

`src-tauri/src/commands/mod.rs`:

```rust
pub mod credentials;
pub mod settings;
pub mod system;
```

`src-tauri/src/lib.rs`:

```rust
mod commands;
mod credentials;
mod db;
mod system;

use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<db::Db>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let database = db::Db::open(&dir.join("jellydesk.db"))?;
            app.manage(AppState { db: Mutex::new(database) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::system_transparency_enabled,
            commands::settings::settings_get,
            commands::settings::settings_set,
            commands::settings::settings_delete,
            commands::credentials::credentials_get,
            commands::credentials::credentials_set,
            commands::credentials::credentials_delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running JellyDesk");
}
```

Run: `cd src-tauri && cargo test && cd ..`
Expected: 6 Tests bestanden (3 system, 3 db).

- [ ] **Step 3: Failing TS-Test für die Wrapper**

`src/lib/tauri/settings.test.ts`:

```ts
import { invoke } from '@tauri-apps/api/core';
import { getSetting, setSetting } from '@/lib/tauri/settings';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  isTauri: () => true,
}));

const invokeMock = vi.mocked(invoke);

describe('settings wrapper', () => {
  beforeEach(() => invokeMock.mockReset());

  it('serialisiert Werte als JSON', async () => {
    invokeMock.mockResolvedValueOnce(undefined);
    await setSetting('server.urls', { local: 'http://a', external: 'http://b' });
    expect(invokeMock).toHaveBeenCalledWith('settings_set', {
      key: 'server.urls',
      value: JSON.stringify({ local: 'http://a', external: 'http://b' }),
    });
  });

  it('parst gespeicherte Werte und liefert null bei fehlendem Key', async () => {
    invokeMock.mockResolvedValueOnce('{"local":"http://a"}');
    expect(await getSetting<{ local: string }>('server.urls')).toEqual({ local: 'http://a' });
    invokeMock.mockResolvedValueOnce(null);
    expect(await getSetting('missing')).toBeNull();
  });
});
```

Run: `npm test -- settings`
Expected: FAIL, Modul fehlt.

- [ ] **Step 4: Keys und Wrapper implementieren**

`src/lib/settings/keys.ts`:

```ts
export const SettingKeys = {
  serverUrls: 'server.urls',
  deviceId: 'device.id',
  authUser: 'auth.user',
  seerrUrls: 'seerr.urls',
  seerrUser: 'seerr.user',
  language: 'app.language',
  reducedTransparency: 'appearance.reducedTransparency',
} as const;

export const CredentialKeys = {
  jellyfinToken: 'jellyfin.token',
  seerrPassword: 'seerr.password',
} as const;
```

`src/lib/tauri/settings.ts`:

```ts
import { invoke, isTauri } from '@tauri-apps/api/core';

// Browser-Fallback (npm run dev ohne Tauri): localStorage, damit die UI entwickelbar bleibt.
const memory = new Map<string, string>();

async function rawGet(key: string): Promise<string | null> {
  if (!isTauri()) return memory.get(key) ?? localStorage.getItem(`jd.${key}`);
  return invoke<string | null>('settings_get', { key });
}

async function rawSet(key: string, value: string): Promise<void> {
  if (!isTauri()) {
    memory.set(key, value);
    localStorage.setItem(`jd.${key}`, value);
    return;
  }
  await invoke('settings_set', { key, value });
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const raw = await rawGet(key);
  if (raw === null || raw === undefined) return null;
  return JSON.parse(raw) as T;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await rawSet(key, JSON.stringify(value));
}

export async function deleteSetting(key: string): Promise<void> {
  if (!isTauri()) {
    memory.delete(key);
    localStorage.removeItem(`jd.${key}`);
    return;
  }
  await invoke('settings_delete', { key });
}
```

`src/lib/tauri/credentials.ts`:

```ts
import { invoke, isTauri } from '@tauri-apps/api/core';

// Browser-Fallback nur für die Entwicklung ohne Tauri; in der App landet nichts hier.
const devStore = new Map<string, string>();

export async function getCredential(key: string): Promise<string | null> {
  if (!isTauri()) return devStore.get(key) ?? null;
  return invoke<string | null>('credentials_get', { key });
}

export async function setCredential(key: string, secret: string): Promise<void> {
  if (!isTauri()) {
    devStore.set(key, secret);
    return;
  }
  await invoke('credentials_set', { key, secret });
}

export async function deleteCredential(key: string): Promise<void> {
  if (!isTauri()) {
    devStore.delete(key);
    return;
  }
  await invoke('credentials_delete', { key });
}
```

- [ ] **Step 5: Tests, Commit**

Run: `npm test && npm run typecheck && cd src-tauri && cargo clippy -- -D warnings && cd ..`
Expected: grün, keine Clippy-Warnungen.

```bash
git add -A
git commit -m "feat: sqlite settings store and windows credential manager bridge

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Router, Shell (Titlebar, Sidebar, Toolbar) und Backdrop-Ebene

**Files:**
- Create: `src/app/router.tsx`, `src/app/shell/Shell.tsx`, `src/app/shell/Titlebar.tsx`, `src/app/shell/Sidebar.tsx`, `src/app/shell/Toolbar.tsx`, `src/app/shell/BackdropLayer.tsx`, `src/lib/backdrop.ts`, `src/lib/tauri/window.ts`, `src/features/home/HomePage.tsx`, `src/features/onboarding/OnboardingPage.tsx` (Platzhalter)
- Modify: `src/app/App.tsx`, `src/styles/globals.css`
- Test: `src/lib/backdrop.test.ts`, `src/app/shell/Sidebar.test.tsx`, `src/app/shell/Titlebar.test.tsx`

**Interfaces:**
- Produces:
  - `useBackdrop` (Zustand): `{ url: string | null; setBackdrop(url: string | null): void }`.
  - `appWindow` (`src/lib/tauri/window.ts`): `{ minimize(): Promise<void>; toggleMaximize(): Promise<void>; close(): Promise<void>; setFullscreen(v: boolean): Promise<void> }`, im Browser No-ops.
  - Routen: `/onboarding` (ohne Shell), `/` → Shell mit Kind-Routen `/home` (Index-Redirect) und `/settings` (Platzhalter). Router-Instanz `router` aus `src/app/router.tsx`; `App` rendert `<RouterProvider router={router} />`.
  - `OnboardingPage` und `HomePage` als Platzhalter-Komponenten, die Task 10–13 ausbauen.

- [ ] **Step 1: Failing Tests**

`src/lib/backdrop.test.ts`:

```ts
import { useBackdrop } from '@/lib/backdrop';

describe('backdrop store', () => {
  it('setzt und löscht die URL', () => {
    useBackdrop.getState().setBackdrop('http://x/backdrop.jpg');
    expect(useBackdrop.getState().url).toBe('http://x/backdrop.jpg');
    useBackdrop.getState().setBackdrop(null);
    expect(useBackdrop.getState().url).toBeNull();
  });
});
```

`src/app/shell/Sidebar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/app/shell/Sidebar';

vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

describe('Sidebar', () => {
  it('zeigt die Hauptnavigation', () => {
    render(<Sidebar />);
    for (const label of ['Start', 'Suche', 'Discover', 'Downloads', 'Einstellungen']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
```

`src/app/shell/Titlebar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Titlebar } from '@/app/shell/Titlebar';
import { appWindow } from '@/lib/tauri/window';

vi.mock('@/lib/tauri/window', () => ({
  appWindow: { minimize: vi.fn(), toggleMaximize: vi.fn(), close: vi.fn(), setFullscreen: vi.fn() },
}));

describe('Titlebar', () => {
  it('ruft die Fensterfunktionen auf', async () => {
    render(<Titlebar />);
    await userEvent.click(screen.getByLabelText('Minimieren'));
    await userEvent.click(screen.getByLabelText('Maximieren'));
    await userEvent.click(screen.getByLabelText('Schliessen'));
    expect(appWindow.minimize).toHaveBeenCalled();
    expect(appWindow.toggleMaximize).toHaveBeenCalled();
    expect(appWindow.close).toHaveBeenCalled();
  });
});
```

Run: `npm test`
Expected: die drei neuen Tests FAIL (Module fehlen).

- [ ] **Step 2: Abhängigkeiten und Implementierung**

```bash
npm i @tanstack/react-router motion lucide-react
```

`src/lib/backdrop.ts`:

```ts
import { create } from 'zustand';

interface BackdropState {
  url: string | null;
  setBackdrop: (url: string | null) => void;
}

export const useBackdrop = create<BackdropState>((set) => ({
  url: null,
  setBackdrop: (url) => set({ url }),
}));
```

`src/lib/tauri/window.ts`:

```ts
import { isTauri } from '@tauri-apps/api/core';

async function current() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}

export const appWindow = {
  async minimize() {
    if (isTauri()) await (await current()).minimize();
  },
  async toggleMaximize() {
    if (isTauri()) await (await current()).toggleMaximize();
  },
  async close() {
    if (isTauri()) await (await current()).close();
  },
  async setFullscreen(value: boolean) {
    if (isTauri()) await (await current()).setFullscreen(value);
  },
};
```

`src/app/shell/BackdropLayer.tsx`:

```tsx
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useBackdrop } from '@/lib/backdrop';

export function BackdropLayer() {
  const url = useBackdrop((s) => s.url);
  const reduceMotion = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[var(--jd-base)]">
      <AnimatePresence>
        {url && (
          <motion.img
            key={url}
            src={url}
            alt=""
            draggable={false}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: reduceMotion ? 1.02 : 1.08 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.6 },
              scale: { duration: reduceMotion ? 0 : 30, ease: 'linear' },
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,10,15,0.45),rgba(10,10,15,0.75)_60%,#0a0a0f)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(90,70,160,0.25),transparent_50%),radial-gradient(circle_at_80%_90%,rgba(20,90,110,0.22),transparent_50%)]" />
    </div>
  );
}
```

`src/app/shell/Titlebar.tsx`:

```tsx
import { Minus, Square, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { appWindow } from '@/lib/tauri/window';
import { GlassPanel } from '@/components/glass/GlassPanel';

const btn =
  'flex h-8 w-10 items-center justify-center rounded-lg text-[var(--lq-text-dim)] hover:bg-white/10 hover:text-[var(--lq-text)]';

export function Titlebar() {
  const { t } = useTranslation();
  return (
    <GlassPanel
      preset="bar"
      className="mx-3 mt-3 h-11 shrink-0"
      contentClassName="flex h-full items-center pl-4 pr-1"
    >
      <div data-tauri-drag-region className="flex h-full flex-1 items-center gap-2 text-sm font-semibold">
        <span data-tauri-drag-region>JellyDesk</span>
      </div>
      <button aria-label={t('common.minimize')} className={btn} onClick={() => void appWindow.minimize()}>
        <Minus size={16} />
      </button>
      <button aria-label={t('common.maximize')} className={btn} onClick={() => void appWindow.toggleMaximize()}>
        <Square size={13} />
      </button>
      <button
        aria-label={t('common.close')}
        className={`${btn} hover:bg-[var(--lq-danger)]/80 hover:text-white`}
        onClick={() => void appWindow.close()}
      >
        <X size={16} />
      </button>
    </GlassPanel>
  );
}
```

`src/app/shell/Sidebar.tsx`:

```tsx
import { Link } from '@tanstack/react-router';
import { Compass, Download, Home, Search, Settings, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassPanel } from '@/components/glass/GlassPanel';

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { to: '/home', labelKey: 'nav.home', icon: Home },
  { to: '/search', labelKey: 'nav.search', icon: Search },
  { to: '/discover', labelKey: 'nav.discover', icon: Compass },
  { to: '/downloads', labelKey: 'nav.downloads', icon: Download },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function Sidebar() {
  const { t } = useTranslation();
  return (
    <GlassPanel preset="sidebar" className="m-3 mr-0 w-56 shrink-0" contentClassName="flex h-full flex-col p-3">
      <nav className="flex flex-col gap-1">
        {ITEMS.map(({ to, labelKey, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--lq-text-dim)] hover:bg-white/10 hover:text-[var(--lq-text)] [&.active]:bg-white/15 [&.active]:text-[var(--lq-text)]"
          >
            <Icon size={18} />
            <span>{t(labelKey)}</span>
          </Link>
        ))}
      </nav>
    </GlassPanel>
  );
}
```

`src/app/shell/Toolbar.tsx`:

```tsx
import { ArrowLeft } from 'lucide-react';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { GlassPanel } from '@/components/glass/GlassPanel';

export function Toolbar({ title }: { title?: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <GlassPanel preset="bar" className="mx-3 mt-3 h-11 shrink-0" contentClassName="flex h-full items-center gap-2 px-2">
      <button
        aria-label={t('common.back')}
        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
        onClick={() => router.history.back()}
      >
        <ArrowLeft size={18} />
      </button>
      <span className="text-sm font-medium">{title}</span>
    </GlassPanel>
  );
}
```

`src/app/shell/Shell.tsx`:

```tsx
import { Outlet } from '@tanstack/react-router';
import { BackdropLayer } from '@/app/shell/BackdropLayer';
import { Titlebar } from '@/app/shell/Titlebar';
import { Sidebar } from '@/app/shell/Sidebar';
import { Toolbar } from '@/app/shell/Toolbar';

export function Shell() {
  return (
    <div className="relative flex h-full flex-col">
      <BackdropLayer />
      <Titlebar />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Toolbar />
          <main className="min-h-0 flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
```

`src/features/home/HomePage.tsx` (Platzhalter, Task 14 ersetzt ihn):

```tsx
export function HomePage() {
  return <h1 className="text-3xl font-semibold">Start</h1>;
}
```

`src/features/onboarding/OnboardingPage.tsx` (Platzhalter, Task 11 ersetzt ihn):

```tsx
export function OnboardingPage() {
  return <div className="flex h-full items-center justify-center">Onboarding</div>;
}
```

`src/app/router.tsx`:

```tsx
import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { Shell } from '@/app/shell/Shell';
import { HomePage } from '@/features/home/HomePage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { BackdropLayer } from '@/app/shell/BackdropLayer';

export const rootRoute = createRootRoute({ component: () => <Outlet /> });

export const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  component: () => (
    <div className="relative h-full">
      <BackdropLayer />
      <div className="relative h-full">
        <OnboardingPage />
      </div>
    </div>
  ),
});

export const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  component: Shell,
});

export const indexRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/home' });
  },
});

export const homeRoute = createRoute({ getParentRoute: () => shellRoute, path: '/home', component: HomePage });
export const settingsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/settings',
  component: () => <h1 className="text-3xl font-semibold">Einstellungen</h1>,
});

const routeTree = rootRoute.addChildren([
  onboardingRoute,
  shellRoute.addChildren([indexRoute, homeRoute, settingsRoute]),
]);

export const router = createRouter({ routeTree, history: createHashHistory() });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

`src/app/App.tsx`:

```tsx
import { RouterProvider } from '@tanstack/react-router';
import { LiquiThemeProvider, type LiquiGlassTheme } from '@liqui-design/glass';
import { router } from '@/app/router';
import { useSystemAppearanceSync } from '@/features/appearance/useSystemAppearanceSync';

export const jellyDeskGlassTheme: Partial<LiquiGlassTheme> = {
  profile: 'squircle',
  frost: 0.35,
  specular: 0.7,
  dispersion: 0.1,
  saturation: 1.6,
};

export function App() {
  useSystemAppearanceSync();
  return (
    <LiquiThemeProvider theme={{ glass: jellyDeskGlassTheme }}>
      <RouterProvider router={router} />
    </LiquiThemeProvider>
  );
}
```

`src/app/App.test.tsx` anpassen: statt `getByText('JellyDesk')` prüfen, dass die Titelleiste da ist:

```tsx
import { render, screen } from '@testing-library/react';
import { App } from '@/app/App';

vi.mock('@/lib/tauri/system', () => ({ getSystemTransparencyEnabled: vi.fn(async () => true) }));

describe('App', () => {
  it('rendert die Shell mit Titelleiste', async () => {
    render(<App />);
    expect(await screen.findByText('JellyDesk')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Tests, Sichtprüfung, Commit**

Run: `npm test && npm run typecheck && npm run lint`
Expected: grün.
Run: `npm run tauri dev`
Expected: Glas-Titelleiste (Fenster lässt sich daran ziehen, Knöpfe funktionieren), Glas-Sidebar mit fünf Einträgen, Glas-Toolbar, dunkler Verlaufs-Hintergrund; `/#/settings` per Klick erreichbar.

```bash
git add -A
git commit -m "feat: router, glass shell with titlebar, sidebar, toolbar and backdrop layer

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: ConnectionManager (lokal/extern/offline) mit Tests

**Files:**
- Create: `src/lib/connection/url.ts`, `src/lib/connection/probe.ts`, `src/lib/connection/ConnectionManager.ts`
- Test: `src/lib/connection/url.test.ts`, `src/lib/connection/ConnectionManager.test.ts`, `src/lib/connection/probe.test.ts`

**Interfaces:**
- Produces:
  - `normalizeServerUrl(input: string): string | null` (Schema ergänzen, Trailing-Slash entfernen, `null` bei ungültig).
  - `deriveSeerrUrl(jellyfinUrl: string): string` (gleicher Host, Port 5055, Schema beibehalten).
  - `ProbeResult = { ok: true; serverName: string; version: string; id: string } | { ok: false; error: string }`.
  - `probeJellyfin(url: string, timeoutMs: number, fetchImpl?: typeof fetch): Promise<ProbeResult>`.
  - `ConnectionMode = 'local' | 'external' | 'offline'`; `ServerUrls = { local: string; external?: string }`.
  - `class ConnectionManager` mit `constructor(urls: ServerUrls, deps: { probe: (url: string, timeoutMs: number) => Promise<ProbeResult> }, options?: Partial<ConnectionOptions>)`, `connect(): Promise<ConnectionState>`, `getState(): ConnectionState`, `subscribe(fn: (s: ConnectionState) => void): () => void`, `baseUrl(): string | null`, `reportFailure(): void`, `reportSuccess(): void`, `startRecheck(): void`, `stop(): void`.
  - `ConnectionState = { mode: ConnectionMode; baseUrl: string | null; consecutiveFailures: number }`.

- [ ] **Step 1: Failing Tests**

`src/lib/connection/url.test.ts`:

```ts
import { normalizeServerUrl, deriveSeerrUrl } from '@/lib/connection/url';

describe('normalizeServerUrl', () => {
  it('ergänzt http und entfernt Slash', () => {
    expect(normalizeServerUrl('192.168.1.125:8096/')).toBe('http://192.168.1.125:8096');
  });
  it('behält https und Pfad', () => {
    expect(normalizeServerUrl('https://jf.example.com/jellyfin/')).toBe('https://jf.example.com/jellyfin');
  });
  it('trimmt Leerzeichen', () => {
    expect(normalizeServerUrl('  http://a:8096 ')).toBe('http://a:8096');
  });
  it('liefert null bei Unsinn', () => {
    expect(normalizeServerUrl('')).toBeNull();
    expect(normalizeServerUrl('not a url')).toBeNull();
  });
});

describe('deriveSeerrUrl', () => {
  it('setzt Port 5055 auf gleichem Host', () => {
    expect(deriveSeerrUrl('http://192.168.1.125:8096')).toBe('http://192.168.1.125:5055');
    expect(deriveSeerrUrl('https://jf.example.com')).toBe('https://jf.example.com:5055');
  });
});
```

`src/lib/connection/probe.test.ts`:

```ts
import { probeJellyfin } from '@/lib/connection/probe';

describe('probeJellyfin', () => {
  it('liest die öffentliche System-Info', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ServerName: 'NAS', Version: '10.10.3', Id: 'abc' }), { status: 200 }),
    ) as unknown as typeof fetch;
    const r = await probeJellyfin('http://a:8096', 1000, fetchImpl);
    expect(r).toEqual({ ok: true, serverName: 'NAS', version: '10.10.3', id: 'abc' });
    expect(fetchImpl).toHaveBeenCalledWith('http://a:8096/System/Info/Public', expect.anything());
  });

  it('meldet Fehler bei Netzwerkproblem', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    const r = await probeJellyfin('http://a:8096', 1000, fetchImpl);
    expect(r.ok).toBe(false);
  });

  it('meldet Fehler bei HTTP 500', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch;
    const r = await probeJellyfin('http://a:8096', 1000, fetchImpl);
    expect(r).toEqual({ ok: false, error: 'HTTP 500' });
  });
});
```

`src/lib/connection/ConnectionManager.test.ts`:

```ts
import { ConnectionManager, type ProbeResult } from '@/lib/connection/ConnectionManager';

const ok: ProbeResult = { ok: true, serverName: 'NAS', version: '10.10', id: '1' };
const fail: ProbeResult = { ok: false, error: 'timeout' };

function probeFor(map: Record<string, () => ProbeResult>) {
  return vi.fn(async (url: string) => map[url]?.() ?? fail);
}

describe('ConnectionManager', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('wählt lokal, wenn erreichbar', async () => {
    const probe = probeFor({ 'http://local': () => ok, 'http://ext': () => ok });
    const cm = new ConnectionManager({ local: 'http://local', external: 'http://ext' }, { probe });
    const s = await cm.connect();
    expect(s.mode).toBe('local');
    expect(cm.baseUrl()).toBe('http://local');
    expect(probe).toHaveBeenCalledWith('http://local', 2500);
  });

  it('fällt auf extern zurück', async () => {
    const probe = probeFor({ 'http://ext': () => ok });
    const cm = new ConnectionManager({ local: 'http://local', external: 'http://ext' }, { probe });
    const s = await cm.connect();
    expect(s.mode).toBe('external');
    expect(probe).toHaveBeenCalledWith('http://ext', 6000);
  });

  it('ist offline, wenn nichts antwortet', async () => {
    const cm = new ConnectionManager({ local: 'http://local' }, { probe: probeFor({}) });
    expect((await cm.connect()).mode).toBe('offline');
    expect(cm.baseUrl()).toBeNull();
  });

  it('wechselt im externen Modus still zurück auf lokal', async () => {
    let localUp = false;
    const probe = probeFor({ 'http://local': () => (localUp ? ok : fail), 'http://ext': () => ok });
    const cm = new ConnectionManager({ local: 'http://local', external: 'http://ext' }, { probe });
    await cm.connect();
    cm.startRecheck();
    localUp = true;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(cm.getState().mode).toBe('local');
    cm.stop();
  });

  it('wechselt nach drei Fehlern in Folge den Modus', async () => {
    let localUp = true;
    const probe = probeFor({ 'http://local': () => (localUp ? ok : fail), 'http://ext': () => ok });
    const cm = new ConnectionManager({ local: 'http://local', external: 'http://ext' }, { probe });
    await cm.connect();
    localUp = false;
    cm.reportFailure();
    cm.reportFailure();
    expect(cm.getState().mode).toBe('local');
    cm.reportFailure();
    await vi.runOnlyPendingTimersAsync();
    expect(cm.getState().mode).toBe('external');
  });

  it('setzt den Fehlerzähler bei Erfolg zurück', async () => {
    const cm = new ConnectionManager({ local: 'http://local' }, { probe: probeFor({ 'http://local': () => ok }) });
    await cm.connect();
    cm.reportFailure();
    cm.reportSuccess();
    expect(cm.getState().consecutiveFailures).toBe(0);
  });

  it('benachrichtigt Abonnenten', async () => {
    const cm = new ConnectionManager({ local: 'http://local' }, { probe: probeFor({ 'http://local': () => ok }) });
    const listener = vi.fn();
    cm.subscribe(listener);
    await cm.connect();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ mode: 'local' }));
  });
});
```

Run: `npm test -- connection`
Expected: FAIL (Module fehlen).

- [ ] **Step 2: Implementieren**

`src/lib/connection/url.ts`:

```ts
export function normalizeServerUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (!url.hostname || /\s/.test(trimmed)) return null;
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.protocol}//${url.host}${path}`;
}

export function deriveSeerrUrl(jellyfinUrl: string): string {
  const url = new URL(jellyfinUrl);
  return `${url.protocol}//${url.hostname}:5055`;
}
```

`src/lib/connection/probe.ts`:

```ts
export type ProbeResult =
  | { ok: true; serverName: string; version: string; id: string }
  | { ok: false; error: string };

interface PublicSystemInfo {
  ServerName?: string;
  Version?: string;
  Id?: string;
}

export async function probeJellyfin(
  url: string,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${url}/System/Info/Public`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const info = (await res.json()) as PublicSystemInfo;
    return {
      ok: true,
      serverName: info.ServerName ?? '',
      version: info.Version ?? '',
      id: info.Id ?? '',
    };
  } catch (e) {
    const name = e instanceof Error ? e.name : 'Error';
    return { ok: false, error: name === 'AbortError' ? 'timeout' : String(e) };
  } finally {
    clearTimeout(timer);
  }
}
```

`src/lib/connection/ConnectionManager.ts`:

```ts
import type { ProbeResult } from '@/lib/connection/probe';

export type { ProbeResult };
export type ConnectionMode = 'local' | 'external' | 'offline';

export interface ServerUrls {
  local: string;
  external?: string;
}

export interface ConnectionState {
  mode: ConnectionMode;
  baseUrl: string | null;
  consecutiveFailures: number;
}

export interface ConnectionDeps {
  probe: (url: string, timeoutMs: number) => Promise<ProbeResult>;
}

export interface ConnectionOptions {
  localTimeoutMs: number;
  externalTimeoutMs: number;
  recheckMs: number;
  failureThreshold: number;
}

const DEFAULTS: ConnectionOptions = {
  localTimeoutMs: 2500,
  externalTimeoutMs: 6000,
  recheckMs: 60_000,
  failureThreshold: 3,
};

type Listener = (state: ConnectionState) => void;

export class ConnectionManager {
  private state: ConnectionState = { mode: 'offline', baseUrl: null, consecutiveFailures: 0 };
  private listeners = new Set<Listener>();
  private recheckTimer: ReturnType<typeof setInterval> | null = null;
  private readonly options: ConnectionOptions;

  constructor(
    private readonly urls: ServerUrls,
    private readonly deps: ConnectionDeps,
    options: Partial<ConnectionOptions> = {},
  ) {
    this.options = { ...DEFAULTS, ...options };
  }

  getState(): ConnectionState {
    return this.state;
  }

  baseUrl(): string | null {
    return this.state.baseUrl;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async connect(): Promise<ConnectionState> {
    if (await this.isUp(this.urls.local, this.options.localTimeoutMs)) {
      return this.set('local', this.urls.local);
    }
    if (this.urls.external && (await this.isUp(this.urls.external, this.options.externalTimeoutMs))) {
      return this.set('external', this.urls.external);
    }
    return this.set('offline', null);
  }

  startRecheck(): void {
    this.stop();
    this.recheckTimer = setInterval(() => void this.recheck(), this.options.recheckMs);
  }

  stop(): void {
    if (this.recheckTimer) clearInterval(this.recheckTimer);
    this.recheckTimer = null;
  }

  reportSuccess(): void {
    if (this.state.consecutiveFailures !== 0) this.set(this.state.mode, this.state.baseUrl, 0);
  }

  reportFailure(): void {
    const failures = this.state.consecutiveFailures + 1;
    if (failures >= this.options.failureThreshold) {
      this.set(this.state.mode, this.state.baseUrl, 0);
      setTimeout(() => void this.connect(), 0);
      return;
    }
    this.set(this.state.mode, this.state.baseUrl, failures);
  }

  private async recheck(): Promise<void> {
    if (this.state.mode === 'local') return;
    if (await this.isUp(this.urls.local, this.options.localTimeoutMs)) {
      this.set('local', this.urls.local);
      return;
    }
    if (this.state.mode === 'offline') await this.connect();
  }

  private async isUp(url: string, timeoutMs: number): Promise<boolean> {
    const result = await this.deps.probe(url, timeoutMs);
    return result.ok;
  }

  private set(mode: ConnectionMode, baseUrl: string | null, consecutiveFailures = 0): ConnectionState {
    this.state = { mode, baseUrl, consecutiveFailures };
    for (const l of this.listeners) l(this.state);
    return this.state;
  }
}
```

- [ ] **Step 3: Tests, Commit**

Run: `npm test -- connection && npm run typecheck`
Expected: alle Connection-Tests grün.

```bash
git add -A
git commit -m "feat: connection manager with local-first, external fallback and recheck

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Jellyfin-SDK-Wrapper und Auth (Passwort, Quick Connect)

**Files:**
- Create: `src/lib/jellyfin/client.ts`, `src/lib/jellyfin/auth.ts`, `src/test/msw.ts`
- Test: `src/lib/jellyfin/auth.test.ts`

**Interfaces:**
- Produces:
  - `createJellyfin(device: { id: string; name: string }, version: string): Jellyfin`.
  - `createApi(jellyfin: Jellyfin, baseUrl: string, accessToken?: string): Api`.
  - `AuthResult = { accessToken: string; userId: string; userName: string }`.
  - `loginWithPassword(api: Api, username: string, password: string): Promise<AuthResult>`.
  - `isQuickConnectEnabled(api): Promise<boolean>`.
  - `initiateQuickConnect(api): Promise<{ secret: string; code: string }>`.
  - `checkQuickConnect(api, secret): Promise<boolean>` (true = bestätigt).
  - `authenticateWithQuickConnect(api, secret): Promise<AuthResult>`.
  - `msw` Test-Server (`src/test/msw.ts`): `server` (setupServer), Basis-URL `http://jf.test`.

- [ ] **Step 1: Abhängigkeiten**

```bash
npm i @jellyfin/sdk axios
npm i -D msw
```

- [ ] **Step 2: Failing Tests**

`src/test/msw.ts`:

```ts
import { setupServer } from 'msw/node';

export const JF = 'http://jf.test';
export const server = setupServer();
```

In `src/test/setup.ts` ergänzen (am Ende):

```ts
import { server } from '@/test/msw';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

`src/lib/jellyfin/auth.test.ts`:

```ts
import { http, HttpResponse } from 'msw';
import { server, JF } from '@/test/msw';
import { createJellyfin, createApi } from '@/lib/jellyfin/client';
import {
  loginWithPassword,
  isQuickConnectEnabled,
  initiateQuickConnect,
  checkQuickConnect,
  authenticateWithQuickConnect,
} from '@/lib/jellyfin/auth';

const jellyfin = createJellyfin({ id: 'dev-1', name: 'TestPC' }, '0.1.0');
const api = () => createApi(jellyfin, JF);

describe('jellyfin auth', () => {
  it('meldet mit Passwort an und sendet den MediaBrowser-Header', async () => {
    let authHeader = '';
    server.use(
      http.post(`${JF}/Users/AuthenticateByName`, async ({ request }) => {
        authHeader = request.headers.get('authorization') ?? '';
        const body = (await request.json()) as { Username: string; Pw: string };
        expect(body).toEqual({ Username: 'julian', Pw: 'geheim' });
        return HttpResponse.json({ AccessToken: 'tok', User: { Id: 'u1', Name: 'julian' } });
      }),
    );
    const r = await loginWithPassword(api(), 'julian', 'geheim');
    expect(r).toEqual({ accessToken: 'tok', userId: 'u1', userName: 'julian' });
    expect(authHeader).toContain('Client="JellyDesk"');
    expect(authHeader).toContain('DeviceId="dev-1"');
  });

  it('erkennt deaktiviertes Quick Connect', async () => {
    server.use(http.get(`${JF}/QuickConnect/Enabled`, () => HttpResponse.json(false)));
    expect(await isQuickConnectEnabled(api())).toBe(false);
  });

  it('führt den Quick-Connect-Ablauf durch', async () => {
    server.use(
      http.post(`${JF}/QuickConnect/Initiate`, () =>
        HttpResponse.json({ Secret: 's3', Code: '123456', Authenticated: false }),
      ),
      http.get(`${JF}/QuickConnect/Connect`, ({ request }) => {
        const secret = new URL(request.url).searchParams.get('secret');
        return HttpResponse.json({ Secret: secret, Code: '123456', Authenticated: true });
      }),
      http.post(`${JF}/Users/AuthenticateWithQuickConnect`, async ({ request }) => {
        expect(await request.json()).toEqual({ Secret: 's3' });
        return HttpResponse.json({ AccessToken: 'qc-tok', User: { Id: 'u1', Name: 'julian' } });
      }),
    );
    const a = api();
    const { secret, code } = await initiateQuickConnect(a);
    expect(code).toBe('123456');
    expect(await checkQuickConnect(a, secret)).toBe(true);
    expect(await authenticateWithQuickConnect(a, secret)).toEqual({
      accessToken: 'qc-tok',
      userId: 'u1',
      userName: 'julian',
    });
  });
});
```

Run: `npm test -- jellyfin`
Expected: FAIL.

- [ ] **Step 3: Implementieren**

`src/lib/jellyfin/client.ts`:

```ts
import { Jellyfin, type Api } from '@jellyfin/sdk';

export type { Api };

export function createJellyfin(device: { id: string; name: string }, version: string): Jellyfin {
  return new Jellyfin({
    clientInfo: { name: 'JellyDesk', version },
    deviceInfo: { name: device.name, id: device.id },
  });
}

export function createApi(jellyfin: Jellyfin, baseUrl: string, accessToken?: string): Api {
  return jellyfin.createApi(baseUrl, accessToken);
}
```

`src/lib/jellyfin/auth.ts`:

```ts
import type { Api } from '@jellyfin/sdk';
import { getQuickConnectApi } from '@jellyfin/sdk/lib/utils/api/quick-connect-api';
import { getUserApi } from '@jellyfin/sdk/lib/utils/api/user-api';
import type { AuthenticationResult } from '@jellyfin/sdk/lib/generated-client/models';

export interface AuthResult {
  accessToken: string;
  userId: string;
  userName: string;
}

function toAuthResult(r: AuthenticationResult): AuthResult {
  if (!r.AccessToken || !r.User?.Id) throw new Error('Authentication response incomplete');
  return { accessToken: r.AccessToken, userId: r.User.Id, userName: r.User.Name ?? '' };
}

export async function loginWithPassword(api: Api, username: string, password: string): Promise<AuthResult> {
  const { data } = await getUserApi(api).authenticateUserByName({
    authenticateUserByName: { Username: username, Pw: password },
  });
  return toAuthResult(data);
}

export async function isQuickConnectEnabled(api: Api): Promise<boolean> {
  const { data } = await getQuickConnectApi(api).getQuickConnectEnabled();
  return data === true;
}

export async function initiateQuickConnect(api: Api): Promise<{ secret: string; code: string }> {
  const { data } = await getQuickConnectApi(api).initiateQuickConnect();
  if (!data.Secret || !data.Code) throw new Error('Quick Connect initiate failed');
  return { secret: data.Secret, code: data.Code };
}

export async function checkQuickConnect(api: Api, secret: string): Promise<boolean> {
  const { data } = await getQuickConnectApi(api).getQuickConnectState({ secret });
  return data.Authenticated === true;
}

export async function authenticateWithQuickConnect(api: Api, secret: string): Promise<AuthResult> {
  const { data } = await getUserApi(api).authenticateWithQuickConnect({
    quickConnectDto: { Secret: secret },
  });
  return toAuthResult(data);
}
```

Hinweis: Falls die SDK-Version die Methoden anders benennt (`npm ls @jellyfin/sdk` und `node_modules/@jellyfin/sdk/lib/generated-client/api/quick-connect-api.d.ts` prüfen), die Namen hier anpassen. Der Test bleibt gleich, er prüft nur HTTP.

- [ ] **Step 4: Tests, Commit**

Run: `npm test && npm run typecheck`
Expected: grün.

```bash
git add -A
git commit -m "feat: jellyfin sdk client and password/quick-connect auth

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Session-Store, Boot-Gate und Routen-Guard

**Files:**
- Create: `src/features/auth/session.ts`
- Modify: `src/app/App.tsx`, `src/app/router.tsx`, `src/app/App.test.tsx`, `src/lib/tauri/system.ts`, `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, `package.json`
- Test: `src/features/auth/session.test.ts`

**Interfaces:**
- Produces:
  - `useSession` (Zustand): `{ status: 'booting' | 'signedOut' | 'signedIn'; urls: ServerUrls | null; user: StoredUser | null; deviceId: string | null; deviceName: string; jellyfin: Jellyfin | null; api: Api | null; connection: ConnectionManager | null; connectionMode: ConnectionMode; boot(): Promise<void>; signIn(input: SignInInput): Promise<void>; signOut(): Promise<void> }`.
  - `StoredUser = { userId: string; userName: string; viaQuickConnect: boolean }`.
  - `SignInInput = { urls: ServerUrls; auth: AuthResult; viaQuickConnect: boolean }`.
  - `getDeviceName(): Promise<string>` in `src/lib/tauri/system.ts` (Hostname über `@tauri-apps/plugin-os`, Fallback `'Windows PC'`).
  - Routen-Guard: `shellRoute.beforeLoad` leitet bei `signedOut` nach `/onboarding`; `onboardingRoute.beforeLoad` leitet bei `signedIn` nach `/home`.

- [ ] **Step 1: OS-Plugin hinzufügen (Hostname)**

```bash
npm i @tauri-apps/plugin-os
cd src-tauri && cargo add tauri-plugin-os && cd ..
```

`src-tauri/src/lib.rs`: nach `.plugin(tauri_plugin_opener::init())` die Zeile `.plugin(tauri_plugin_os::init())` einfügen.
`src-tauri/capabilities/default.json`: `"os:default"` zur `permissions`-Liste hinzufügen.

`src/lib/tauri/system.ts` ergänzen:

```ts
export async function getDeviceName(): Promise<string> {
  if (!isTauri()) return 'Browser';
  try {
    const { hostname } = await import('@tauri-apps/plugin-os');
    return (await hostname()) ?? 'Windows PC';
  } catch {
    return 'Windows PC';
  }
}
```

- [ ] **Step 2: Failing Test**

`src/features/auth/session.test.ts`:

```ts
import { useSession } from '@/features/auth/session';
import { SettingKeys, CredentialKeys } from '@/lib/settings/keys';

const settings = new Map<string, string>();
const creds = new Map<string, string>();

vi.mock('@/lib/tauri/settings', () => ({
  getSetting: vi.fn(async (k: string) => (settings.has(k) ? JSON.parse(settings.get(k)!) : null)),
  setSetting: vi.fn(async (k: string, v: unknown) => void settings.set(k, JSON.stringify(v))),
  deleteSetting: vi.fn(async (k: string) => void settings.delete(k)),
}));
vi.mock('@/lib/tauri/credentials', () => ({
  getCredential: vi.fn(async (k: string) => creds.get(k) ?? null),
  setCredential: vi.fn(async (k: string, v: string) => void creds.set(k, v)),
  deleteCredential: vi.fn(async (k: string) => void creds.delete(k)),
}));
vi.mock('@/lib/tauri/system', () => ({
  getSystemTransparencyEnabled: vi.fn(async () => true),
  getDeviceName: vi.fn(async () => 'TestPC'),
}));
vi.mock('@/lib/connection/probe', () => ({
  probeJellyfin: vi.fn(async (url: string) =>
    url === 'http://local' ? { ok: true, serverName: 'NAS', version: '10', id: '1' } : { ok: false, error: 'x' },
  ),
}));

const auth = { accessToken: 'tok', userId: 'u1', userName: 'julian' };

describe('session', () => {
  beforeEach(() => {
    settings.clear();
    creds.clear();
    useSession.getState().connection?.stop();
    useSession.setState({ status: 'booting', api: null, connection: null, user: null, urls: null });
  });

  it('startet ohne Daten abgemeldet und erzeugt eine DeviceId', async () => {
    await useSession.getState().boot();
    expect(useSession.getState().status).toBe('signedOut');
    expect(useSession.getState().deviceId).toMatch(/[0-9a-f-]{36}/);
    expect(settings.get(SettingKeys.deviceId)).toBeDefined();
  });

  it('meldet an, speichert Token im Credential Manager und Benutzer in Settings', async () => {
    await useSession.getState().boot();
    await useSession.getState().signIn({ urls: { local: 'http://local' }, auth, viaQuickConnect: false });
    const s = useSession.getState();
    expect(s.status).toBe('signedIn');
    expect(s.api?.basePath).toBe('http://local');
    expect(creds.get(CredentialKeys.jellyfinToken)).toBe('tok');
    expect(JSON.parse(settings.get(SettingKeys.authUser)!)).toEqual({
      userId: 'u1',
      userName: 'julian',
      viaQuickConnect: false,
    });
  });

  it('stellt eine gespeicherte Session beim Start wieder her', async () => {
    settings.set(SettingKeys.serverUrls, JSON.stringify({ local: 'http://local' }));
    settings.set(SettingKeys.authUser, JSON.stringify({ userId: 'u1', userName: 'julian', viaQuickConnect: true }));
    creds.set(CredentialKeys.jellyfinToken, 'tok');
    await useSession.getState().boot();
    const s = useSession.getState();
    expect(s.status).toBe('signedIn');
    expect(s.connectionMode).toBe('local');
    expect(s.api?.accessToken).toBe('tok');
  });

  it('löscht beim Abmelden Token und Benutzer, behält aber die Server-URLs', async () => {
    await useSession.getState().boot();
    await useSession.getState().signIn({ urls: { local: 'http://local' }, auth, viaQuickConnect: false });
    await useSession.getState().signOut();
    expect(useSession.getState().status).toBe('signedOut');
    expect(creds.has(CredentialKeys.jellyfinToken)).toBe(false);
    expect(settings.has(SettingKeys.authUser)).toBe(false);
    expect(settings.has(SettingKeys.serverUrls)).toBe(true);
  });
});
```

Run: `npm test -- session`
Expected: FAIL.

- [ ] **Step 3: Session-Store implementieren**

`src/features/auth/session.ts`:

```ts
import { create } from 'zustand';
import type { Jellyfin } from '@jellyfin/sdk';
import { createApi, createJellyfin, type Api } from '@/lib/jellyfin/client';
import type { AuthResult } from '@/lib/jellyfin/auth';
import { ConnectionManager, type ConnectionMode, type ServerUrls } from '@/lib/connection/ConnectionManager';
import { probeJellyfin } from '@/lib/connection/probe';
import { getSetting, setSetting, deleteSetting } from '@/lib/tauri/settings';
import { getCredential, setCredential, deleteCredential } from '@/lib/tauri/credentials';
import { getDeviceName } from '@/lib/tauri/system';
import { SettingKeys, CredentialKeys } from '@/lib/settings/keys';

export const APP_VERSION = '0.1.0';

export type SessionStatus = 'booting' | 'signedOut' | 'signedIn';

export interface StoredUser {
  userId: string;
  userName: string;
  viaQuickConnect: boolean;
}

export interface SignInInput {
  urls: ServerUrls;
  auth: AuthResult;
  viaQuickConnect: boolean;
}

export interface SessionState {
  status: SessionStatus;
  urls: ServerUrls | null;
  user: StoredUser | null;
  deviceId: string | null;
  deviceName: string;
  jellyfin: Jellyfin | null;
  api: Api | null;
  connection: ConnectionManager | null;
  connectionMode: ConnectionMode;
  boot: () => Promise<void>;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
}

async function ensureDevice(): Promise<{ deviceId: string; deviceName: string; jellyfin: Jellyfin }> {
  let deviceId = await getSetting<string>(SettingKeys.deviceId);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    await setSetting(SettingKeys.deviceId, deviceId);
  }
  const deviceName = await getDeviceName();
  return { deviceId, deviceName, jellyfin: createJellyfin({ id: deviceId, name: deviceName }, APP_VERSION) };
}

export const useSession = create<SessionState>((set, get) => {
  async function activate(urls: ServerUrls, token: string, user: StoredUser): Promise<void> {
    get().connection?.stop();
    const { jellyfin } = get().jellyfin ? { jellyfin: get().jellyfin! } : await ensureDevice();
    const connection = new ConnectionManager(urls, { probe: probeJellyfin });
    connection.subscribe((state) => {
      const base = state.baseUrl ?? urls.local;
      set({ connectionMode: state.mode, api: createApi(jellyfin, base, token) });
    });
    const state = await connection.connect();
    connection.startRecheck();
    set({
      status: 'signedIn',
      urls,
      user,
      jellyfin,
      connection,
      connectionMode: state.mode,
      api: createApi(jellyfin, state.baseUrl ?? urls.local, token),
    });
  }

  return {
    status: 'booting',
    urls: null,
    user: null,
    deviceId: null,
    deviceName: 'Windows PC',
    jellyfin: null,
    api: null,
    connection: null,
    connectionMode: 'offline',

    async boot() {
      const { deviceId, deviceName, jellyfin } = await ensureDevice();
      set({ deviceId, deviceName, jellyfin });
      const urls = await getSetting<ServerUrls>(SettingKeys.serverUrls);
      const user = await getSetting<StoredUser>(SettingKeys.authUser);
      const token = await getCredential(CredentialKeys.jellyfinToken);
      if (urls && user && token) {
        await activate(urls, token, user);
        return;
      }
      set({ status: 'signedOut', urls, user: null, api: null });
    },

    async signIn({ urls, auth, viaQuickConnect }) {
      const user: StoredUser = { userId: auth.userId, userName: auth.userName, viaQuickConnect };
      await setSetting(SettingKeys.serverUrls, urls);
      await setSetting(SettingKeys.authUser, user);
      await setCredential(CredentialKeys.jellyfinToken, auth.accessToken);
      await activate(urls, auth.accessToken, user);
    },

    async signOut() {
      get().connection?.stop();
      await deleteCredential(CredentialKeys.jellyfinToken);
      await deleteCredential(CredentialKeys.seerrPassword);
      await deleteSetting(SettingKeys.authUser);
      await deleteSetting(SettingKeys.seerrUser);
      set({ status: 'signedOut', user: null, api: null, connection: null, connectionMode: 'offline' });
    },
  };
});
```

- [ ] **Step 4: Boot-Gate in App und Guards im Router**

`src/app/App.tsx`:

```tsx
import { useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { LiquiThemeProvider, type LiquiGlassTheme } from '@liqui-design/glass';
import { router } from '@/app/router';
import { useSystemAppearanceSync } from '@/features/appearance/useSystemAppearanceSync';
import { useSession } from '@/features/auth/session';

export const jellyDeskGlassTheme: Partial<LiquiGlassTheme> = {
  profile: 'squircle',
  frost: 0.35,
  specular: 0.7,
  dispersion: 0.1,
  saturation: 1.6,
};

export function App() {
  useSystemAppearanceSync();
  const status = useSession((s) => s.status);
  const boot = useSession((s) => s.boot);
  useEffect(() => {
    if (status === 'booting') void boot();
  }, [status, boot]);

  return (
    <LiquiThemeProvider theme={{ glass: jellyDeskGlassTheme }}>
      {status === 'booting' ? <div className="h-full bg-[var(--jd-base)]" /> : <RouterProvider router={router} />}
    </LiquiThemeProvider>
  );
}
```

`src/app/router.tsx`: Import `useSession` ergänzen und die beiden Routen so ändern:

```tsx
export const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  beforeLoad: () => {
    if (useSession.getState().status === 'signedIn') throw redirect({ to: '/home' });
  },
  component: () => (
    <div className="relative flex h-full flex-col">
      <BackdropLayer />
      <Titlebar />
      <div className="relative min-h-0 flex-1">
        <OnboardingPage />
      </div>
    </div>
  ),
});

export const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  beforeLoad: () => {
    if (useSession.getState().status !== 'signedIn') throw redirect({ to: '/onboarding' });
  },
  component: Shell,
});
```

(`Titlebar` importieren aus `@/app/shell/Titlebar`.)

`src/app/App.test.tsx` ersetzen:

```tsx
import { render, screen } from '@testing-library/react';
import { App } from '@/app/App';
import { useSession } from '@/features/auth/session';

vi.mock('@/lib/tauri/system', () => ({
  getSystemTransparencyEnabled: vi.fn(async () => true),
  getDeviceName: vi.fn(async () => 'TestPC'),
}));

describe('App', () => {
  it('zeigt nach dem Boot ohne Session das Onboarding', async () => {
    useSession.setState({ status: 'signedOut' });
    render(<App />);
    expect(await screen.findByText('Mit deinem Jellyfin-Server verbinden')).toBeInTheDocument();
  });
});
```

Hinweis: Dieser Test wird erst nach Task 11 grün (Onboarding-Titel). Bis dahin in `OnboardingPage` (Platzhalter) den Text `t('onboarding.server.title')` rendern, damit der Test sofort läuft:

```tsx
import { useTranslation } from 'react-i18next';
export function OnboardingPage() {
  const { t } = useTranslation();
  return <div className="flex h-full items-center justify-center">{t('onboarding.server.title')}</div>;
}
```

- [ ] **Step 5: Tests, Commit**

Run: `npm test && npm run typecheck && npm run lint`
Expected: grün.
Run: `npm run tauri dev`
Expected: App startet direkt im Onboarding (Titelleiste sichtbar), `/#/home` leitet zurück auf Onboarding.

```bash
git add -A
git commit -m "feat: session store with boot restore, sign-in/out and route guards

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Onboarding-Wizard und Server-Schritt

**Files:**
- Create: `src/components/form/TextInput.tsx`, `src/features/onboarding/ServerStep.tsx`, `src/features/onboarding/wizard.ts`
- Modify: `src/features/onboarding/OnboardingPage.tsx`
- Test: `src/features/onboarding/ServerStep.test.tsx`, `src/features/onboarding/wizard.test.ts`

**Interfaces:**
- Produces:
  - `TextInput` props: `{ label: string; value: string; onChange(v: string): void; placeholder?: string; type?: 'text' | 'password'; error?: string; autoFocus?: boolean }`.
  - `ServerStepResult = { urls: ServerUrls; local: ProbeResult; external?: ProbeResult }`.
  - `ServerStep` props: `{ initial?: ServerUrls; onContinue(result: ServerStepResult): void; probe?: typeof probeJellyfin }`.
  - Wizard-Reducer (`wizard.ts`): `WizardState = { step: 'server' | 'login' | 'seerr'; server?: ServerStepResult; auth?: AuthResult; viaQuickConnect?: boolean; password?: string }`; `wizardReducer(state, action)` mit Actions `{ type: 'serverDone'; result }`, `{ type: 'loginDone'; auth; viaQuickConnect; password? }`, `{ type: 'back' }`.
  - `serverBaseUrl(result: ServerStepResult): string` (lokal wenn erreichbar, sonst extern, sonst lokal).

- [ ] **Step 1: Failing Tests**

`src/features/onboarding/wizard.test.ts`:

```ts
import { wizardReducer, serverBaseUrl, type WizardState } from '@/features/onboarding/wizard';

const ok = { ok: true as const, serverName: 'NAS', version: '10', id: '1' };
const fail = { ok: false as const, error: 'x' };

describe('wizard', () => {
  it('geht von server zu login zu seerr', () => {
    let s: WizardState = { step: 'server' };
    s = wizardReducer(s, { type: 'serverDone', result: { urls: { local: 'http://l' }, local: ok } });
    expect(s.step).toBe('login');
    s = wizardReducer(s, {
      type: 'loginDone',
      auth: { accessToken: 't', userId: 'u', userName: 'n' },
      viaQuickConnect: true,
    });
    expect(s.step).toBe('seerr');
    expect(s.viaQuickConnect).toBe(true);
  });

  it('geht zurück', () => {
    const s = wizardReducer({ step: 'login' }, { type: 'back' });
    expect(s.step).toBe('server');
  });

  it('wählt die Basis-URL', () => {
    expect(serverBaseUrl({ urls: { local: 'http://l', external: 'http://e' }, local: ok, external: ok })).toBe('http://l');
    expect(serverBaseUrl({ urls: { local: 'http://l', external: 'http://e' }, local: fail, external: ok })).toBe('http://e');
    expect(serverBaseUrl({ urls: { local: 'http://l' }, local: fail })).toBe('http://l');
  });
});
```

`src/features/onboarding/ServerStep.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServerStep } from '@/features/onboarding/ServerStep';

describe('ServerStep', () => {
  it('prüft beide Adressen und geht weiter', async () => {
    const probe = vi.fn(async (url: string) =>
      url === 'http://192.168.1.125:8096'
        ? { ok: true as const, serverName: 'NAS', version: '10.10', id: '1' }
        : { ok: false as const, error: 'timeout' },
    );
    const onContinue = vi.fn();
    render(<ServerStep onContinue={onContinue} probe={probe} />);
    await userEvent.type(screen.getByLabelText('Lokale Adresse'), '192.168.1.125:8096');
    await userEvent.type(screen.getByLabelText('Externe Adresse (optional)'), 'https://jf.example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Verbinden' }));
    expect(await screen.findByText(/NAS/)).toBeInTheDocument();
    expect(screen.getByText('Nicht erreichbar')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(onContinue).toHaveBeenCalledWith({
      urls: { local: 'http://192.168.1.125:8096', external: 'https://jf.example.com' },
      local: { ok: true, serverName: 'NAS', version: '10.10', id: '1' },
      external: { ok: false, error: 'timeout' },
    });
  });

  it('zeigt einen Fehler bei ungültiger Adresse', async () => {
    render(<ServerStep onContinue={vi.fn()} probe={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Lokale Adresse'), 'not a url');
    await userEvent.click(screen.getByRole('button', { name: 'Verbinden' }));
    expect(screen.getByText(/gültige Adresse/)).toBeInTheDocument();
  });

  it('bietet "Trotzdem weiter", wenn lokal nicht erreichbar ist', async () => {
    const probe = vi.fn(async () => ({ ok: false as const, error: 'timeout' }));
    const onContinue = vi.fn();
    render(<ServerStep onContinue={onContinue} probe={probe} />);
    await userEvent.type(screen.getByLabelText('Lokale Adresse'), 'http://a:8096');
    await userEvent.click(screen.getByRole('button', { name: 'Verbinden' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Trotzdem weiter' }));
    expect(onContinue).toHaveBeenCalled();
  });
});
```

Run: `npm test -- onboarding`
Expected: FAIL.

- [ ] **Step 2: Implementieren**

`src/components/form/TextInput.tsx`:

```tsx
import { useId } from 'react';

export interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password';
  error?: string;
  autoFocus?: boolean;
}

export function TextInput({ label, value, onChange, placeholder, type = 'text', error, autoFocus }: TextInputProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-[var(--lq-text-dim)]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-[var(--lq-text)] outline-none placeholder:text-white/30 focus:border-[var(--lq-accent)]"
      />
      {error && <span className="text-xs text-[var(--lq-danger-text)]">{error}</span>}
    </div>
  );
}
```

`src/features/onboarding/wizard.ts`:

```ts
import type { AuthResult } from '@/lib/jellyfin/auth';
import type { ServerUrls } from '@/lib/connection/ConnectionManager';
import type { ProbeResult } from '@/lib/connection/probe';

export interface ServerStepResult {
  urls: ServerUrls;
  local: ProbeResult;
  external?: ProbeResult;
}

export interface WizardState {
  step: 'server' | 'login' | 'seerr';
  server?: ServerStepResult;
  auth?: AuthResult;
  viaQuickConnect?: boolean;
  password?: string;
}

export type WizardAction =
  | { type: 'serverDone'; result: ServerStepResult }
  | { type: 'loginDone'; auth: AuthResult; viaQuickConnect: boolean; password?: string }
  | { type: 'back' };

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'serverDone':
      return { ...state, step: 'login', server: action.result };
    case 'loginDone':
      return {
        ...state,
        step: 'seerr',
        auth: action.auth,
        viaQuickConnect: action.viaQuickConnect,
        password: action.password,
      };
    case 'back':
      return { ...state, step: state.step === 'seerr' ? 'login' : 'server' };
  }
}

export function serverBaseUrl(result: ServerStepResult): string {
  if (result.local.ok) return result.urls.local;
  if (result.external?.ok && result.urls.external) return result.urls.external;
  return result.urls.local;
}
```

`src/features/onboarding/ServerStep.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/form/TextInput';
import { normalizeServerUrl } from '@/lib/connection/url';
import { probeJellyfin, type ProbeResult } from '@/lib/connection/probe';
import type { ServerUrls } from '@/lib/connection/ConnectionManager';
import type { ServerStepResult } from '@/features/onboarding/wizard';

export interface ServerStepProps {
  initial?: ServerUrls;
  onContinue: (result: ServerStepResult) => void;
  probe?: typeof probeJellyfin;
}

function ProbeLine({ label, result }: { label: string; result?: ProbeResult }) {
  const { t } = useTranslation();
  if (!result) return null;
  return (
    <div className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-2 text-sm">
      <span className="text-[var(--lq-text-dim)]">{label}</span>
      {result.ok ? (
        <span className="text-emerald-300">
          {t('onboarding.server.reachable')} · {result.serverName} {result.version}
        </span>
      ) : (
        <span className="text-[var(--lq-danger-text)]">{t('onboarding.server.unreachable')}</span>
      )}
    </div>
  );
}

export function ServerStep({ initial, onContinue, probe = probeJellyfin }: ServerStepProps) {
  const { t } = useTranslation();
  const [local, setLocal] = useState(initial?.local ?? '');
  const [external, setExternal] = useState(initial?.external ?? '');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ServerStepResult>();

  async function connect() {
    const localUrl = normalizeServerUrl(local);
    const externalUrl = external.trim() ? normalizeServerUrl(external) : undefined;
    if (!localUrl || (external.trim() && !externalUrl)) {
      setError(t('onboarding.server.invalidUrl'));
      return;
    }
    setError(undefined);
    setBusy(true);
    setResult(undefined);
    const [localProbe, externalProbe] = await Promise.all([
      probe(localUrl, 5000),
      externalUrl ? probe(externalUrl, 5000) : Promise.resolve(undefined),
    ]);
    setResult({
      urls: externalUrl ? { local: localUrl, external: externalUrl } : { local: localUrl },
      local: localProbe,
      external: externalProbe,
    });
    setBusy(false);
  }

  const anyReachable = result?.local.ok || result?.external?.ok;

  return (
    <div className="flex w-[440px] flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('onboarding.server.title')}</h1>
      <TextInput
        label={t('onboarding.server.localUrl')}
        value={local}
        onChange={setLocal}
        placeholder="http://192.168.1.125:8096"
        autoFocus
        error={error}
      />
      <TextInput
        label={t('onboarding.server.externalUrl')}
        value={external}
        onChange={setExternal}
        placeholder="https://jellyfin.example.com"
      />
      <ProbeLine label={t('onboarding.server.localUrl')} result={result?.local} />
      <ProbeLine label={t('onboarding.server.externalUrl')} result={result?.external} />
      <div className="flex justify-end gap-2 pt-2">
        {result && !anyReachable && (
          <Button variant="glass" onClick={() => onContinue(result)}>
            {t('onboarding.server.continueAnyway')}
          </Button>
        )}
        {result && anyReachable ? (
          <Button variant="accent" onClick={() => onContinue(result)}>
            {t('common.continue')}
          </Button>
        ) : (
          <Button variant="accent" disabled={busy} onClick={() => void connect()}>
            {busy ? t('common.loading') : t('onboarding.server.connect')}
          </Button>
        )}
      </div>
    </div>
  );
}
```

Hinweis: Die generierte Liqui-`Button`-Komponente in `src/components/ui/button.tsx` prüfen: Falls `variant`-Namen abweichen (`glass`/`accent`/`danger` laut Registry) oder `disabled` anders heisst, hier anpassen.

`src/features/onboarding/OnboardingPage.tsx`:

```tsx
import { useReducer } from 'react';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { ServerStep } from '@/features/onboarding/ServerStep';
import { wizardReducer } from '@/features/onboarding/wizard';
import { useSession } from '@/features/auth/session';

export function OnboardingPage() {
  const storedUrls = useSession((s) => s.urls);
  const [state, dispatch] = useReducer(wizardReducer, { step: 'server' });

  return (
    <div className="flex h-full items-center justify-center">
      <GlassPanel preset="sheet" className="p-8" contentClassName="p-0">
        {state.step === 'server' && (
          <ServerStep
            initial={storedUrls ?? undefined}
            onContinue={(result) => dispatch({ type: 'serverDone', result })}
          />
        )}
        {state.step === 'login' && <div className="w-[440px]">Login (Task 12)</div>}
        {state.step === 'seerr' && <div className="w-[440px]">Jellyseerr (Task 13)</div>}
      </GlassPanel>
    </div>
  );
}
```

- [ ] **Step 3: Tests, Sichtprüfung, Commit**

Run: `npm test && npm run typecheck && npm run lint`
Expected: grün (inkl. `App.test.tsx`).
Run: `npm run tauri dev` → lokale Adresse `http://192.168.1.125:8096` eingeben, Verbinden → Servername und Version erscheinen.

```bash
git add -A
git commit -m "feat: onboarding wizard with server step and reachability probe

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Login-Schritt (Quick Connect + Passwort)

**Files:**
- Create: `src/features/onboarding/useQuickConnect.ts`, `src/features/onboarding/LoginStep.tsx`, `src/components/form/Segmented.tsx`
- Modify: `src/features/onboarding/OnboardingPage.tsx`
- Test: `src/features/onboarding/useQuickConnect.test.tsx`, `src/features/onboarding/LoginStep.test.tsx`

**Interfaces:**
- Produces:
  - `useQuickConnect(api: Api | null, onSuccess: (auth: AuthResult) => void): QuickConnectState` mit `QuickConnectState = { status: 'idle' | 'disabled' | 'waiting' | 'done' | 'error'; code?: string; error?: string }`; Polling alle 2 000 ms; räumt beim Unmount auf.
  - `Segmented` props: `{ options: { value: string; label: string }[]; value: string; onChange(v: string): void }`.
  - `LoginStep` props: `{ api: Api; serverName: string; onSuccess(auth: AuthResult, viaQuickConnect: boolean, password?: string): void; onBack(): void }`.

- [ ] **Step 1: Failing Tests**

`src/features/onboarding/useQuickConnect.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react';
import { useQuickConnect } from '@/features/onboarding/useQuickConnect';
import * as auth from '@/lib/jellyfin/auth';
import type { Api } from '@/lib/jellyfin/client';

vi.mock('@/lib/jellyfin/auth');

const api = {} as Api;
const result = { accessToken: 't', userId: 'u', userName: 'n' };

describe('useQuickConnect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(auth.isQuickConnectEnabled).mockResolvedValue(true);
    vi.mocked(auth.initiateQuickConnect).mockResolvedValue({ secret: 's', code: '424242' });
    vi.mocked(auth.authenticateWithQuickConnect).mockResolvedValue(result);
  });
  afterEach(() => vi.useRealTimers());

  it('zeigt den Code und meldet nach Bestätigung an', async () => {
    vi.mocked(auth.checkQuickConnect).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const onSuccess = vi.fn();
    const { result: hook } = renderHook(() => useQuickConnect(api, onSuccess));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(hook.current.status).toBe('waiting');
    expect(hook.current.code).toBe('424242');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(onSuccess).toHaveBeenCalledWith(result);
    expect(hook.current.status).toBe('done');
  });

  it('meldet, wenn Quick Connect deaktiviert ist', async () => {
    vi.mocked(auth.isQuickConnectEnabled).mockResolvedValue(false);
    const { result: hook } = renderHook(() => useQuickConnect(api, vi.fn()));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(hook.current.status).toBe('disabled');
  });

  it('stoppt das Polling beim Unmount', async () => {
    vi.mocked(auth.checkQuickConnect).mockResolvedValue(false);
    const { unmount } = renderHook(() => useQuickConnect(api, vi.fn()));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    const calls = vi.mocked(auth.checkQuickConnect).mock.calls.length;
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(vi.mocked(auth.checkQuickConnect).mock.calls.length).toBe(calls);
  });
});
```

`src/features/onboarding/LoginStep.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginStep } from '@/features/onboarding/LoginStep';
import * as auth from '@/lib/jellyfin/auth';
import type { Api } from '@/lib/jellyfin/client';

vi.mock('@/lib/jellyfin/auth');
vi.mock('@/features/onboarding/useQuickConnect', () => ({
  useQuickConnect: () => ({ status: 'waiting', code: '111111' }),
}));

const api = {} as Api;

describe('LoginStep', () => {
  it('meldet mit Passwort an und reicht das Passwort weiter', async () => {
    vi.mocked(auth.loginWithPassword).mockResolvedValue({ accessToken: 't', userId: 'u', userName: 'julian' });
    const onSuccess = vi.fn();
    render(<LoginStep api={api} serverName="NAS" onSuccess={onSuccess} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Passwort' }));
    await userEvent.type(screen.getByLabelText('Benutzername'), 'julian');
    await userEvent.type(screen.getByLabelText('Passwort'), 'geheim');
    await userEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect(auth.loginWithPassword).toHaveBeenCalledWith(api, 'julian', 'geheim');
    expect(onSuccess).toHaveBeenCalledWith({ accessToken: 't', userId: 'u', userName: 'julian' }, false, 'geheim');
  });

  it('zeigt einen Fehler bei falschen Zugangsdaten', async () => {
    vi.mocked(auth.loginWithPassword).mockRejectedValue(new Error('401'));
    render(<LoginStep api={api} serverName="NAS" onSuccess={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Passwort' }));
    await userEvent.type(screen.getByLabelText('Benutzername'), 'julian');
    await userEvent.type(screen.getByLabelText('Passwort'), 'falsch');
    await userEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect(await screen.findByText(/fehlgeschlagen/)).toBeInTheDocument();
  });

  it('zeigt den Quick-Connect-Code', () => {
    render(<LoginStep api={api} serverName="NAS" onSuccess={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('111111')).toBeInTheDocument();
  });
});
```

Run: `npm test -- onboarding`
Expected: FAIL.

- [ ] **Step 2: Implementieren**

`src/features/onboarding/useQuickConnect.ts`:

```ts
import { useEffect, useRef, useState } from 'react';
import type { Api } from '@/lib/jellyfin/client';
import {
  authenticateWithQuickConnect,
  checkQuickConnect,
  initiateQuickConnect,
  isQuickConnectEnabled,
  type AuthResult,
} from '@/lib/jellyfin/auth';

export interface QuickConnectState {
  status: 'idle' | 'disabled' | 'waiting' | 'done' | 'error';
  code?: string;
  error?: string;
}

export const QUICK_CONNECT_POLL_MS = 2000;

export function useQuickConnect(api: Api | null, onSuccess: (auth: AuthResult) => void): QuickConnectState {
  const [state, setState] = useState<QuickConnectState>({ status: 'idle' });
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    (async () => {
      try {
        if (!(await isQuickConnectEnabled(api))) {
          if (!cancelled) setState({ status: 'disabled' });
          return;
        }
        const { secret, code } = await initiateQuickConnect(api);
        if (cancelled) return;
        setState({ status: 'waiting', code });
        timer = setInterval(async () => {
          try {
            if (!(await checkQuickConnect(api, secret))) return;
            stop();
            const auth = await authenticateWithQuickConnect(api, secret);
            if (cancelled) return;
            setState({ status: 'done', code });
            onSuccessRef.current(auth);
          } catch (e) {
            stop();
            if (!cancelled) setState({ status: 'error', error: String(e) });
          }
        }, QUICK_CONNECT_POLL_MS);
      } catch (e) {
        if (!cancelled) setState({ status: 'error', error: String(e) });
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [api]);

  return state;
}
```

`src/components/form/Segmented.tsx`:

```tsx
export interface SegmentedProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function Segmented({ options, value, onChange }: SegmentedProps) {
  return (
    <div role="tablist" className="flex rounded-xl bg-black/30 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition ${
            o.value === value ? 'bg-white/15 text-[var(--lq-text)]' : 'text-[var(--lq-text-dim)] hover:text-[var(--lq-text)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

`src/features/onboarding/LoginStep.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/form/TextInput';
import { Segmented } from '@/components/form/Segmented';
import { useQuickConnect } from '@/features/onboarding/useQuickConnect';
import { loginWithPassword, type AuthResult } from '@/lib/jellyfin/auth';
import type { Api } from '@/lib/jellyfin/client';

export interface LoginStepProps {
  api: Api;
  serverName: string;
  onSuccess: (auth: AuthResult, viaQuickConnect: boolean, password?: string) => void;
  onBack: () => void;
}

export function LoginStep({ api, serverName, onSuccess, onBack }: LoginStepProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'quick' | 'password'>('quick');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const quick = useQuickConnect(mode === 'quick' ? api : null, (auth) => onSuccess(auth, true));

  async function submit() {
    setBusy(true);
    setError(undefined);
    try {
      const auth = await loginWithPassword(api, username, password);
      onSuccess(auth, false, password);
    } catch {
      setError(t('onboarding.login.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-[440px] flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('onboarding.login.title', { server: serverName })}</h1>
      <Segmented
        value={mode}
        onChange={(v) => setMode(v as 'quick' | 'password')}
        options={[
          { value: 'quick', label: t('onboarding.login.quickConnect') },
          { value: 'password', label: t('onboarding.login.password') },
        ]}
      />
      {mode === 'quick' ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          {quick.status === 'disabled' && <p className="text-sm text-[var(--lq-text-dim)]">{t('onboarding.login.quickConnectDisabled')}</p>}
          {quick.status === 'error' && <p className="text-sm text-[var(--lq-danger-text)]">{quick.error}</p>}
          {(quick.status === 'waiting' || quick.status === 'done') && (
            <>
              <span className="font-mono text-4xl tracking-[0.3em]">{quick.code}</span>
              <p className="text-sm text-[var(--lq-text-dim)]">{t('onboarding.login.quickConnectHint')}</p>
              <p className="text-xs text-[var(--lq-text-dim)]">{t('onboarding.login.waiting')}</p>
            </>
          )}
          {quick.status === 'idle' && <p className="text-sm text-[var(--lq-text-dim)]">{t('common.loading')}</p>}
        </div>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <TextInput label={t('onboarding.login.username')} value={username} onChange={setUsername} autoFocus />
          <TextInput label={t('onboarding.login.passwordField')} value={password} onChange={setPassword} type="password" error={error} />
          <div className="flex justify-end pt-1">
            <Button variant="accent" type="submit" disabled={busy || !username}>
              {t('onboarding.login.signIn')}
            </Button>
          </div>
        </form>
      )}
      <div className="flex justify-start">
        <Button variant="glass" onClick={onBack}>
          {t('common.back')}
        </Button>
      </div>
    </div>
  );
}
```

`src/features/onboarding/OnboardingPage.tsx` – Login-Schritt einhängen:

```tsx
import { useMemo, useReducer } from 'react';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { ServerStep } from '@/features/onboarding/ServerStep';
import { LoginStep } from '@/features/onboarding/LoginStep';
import { serverBaseUrl, wizardReducer } from '@/features/onboarding/wizard';
import { useSession } from '@/features/auth/session';
import { createApi } from '@/lib/jellyfin/client';

export function OnboardingPage() {
  const storedUrls = useSession((s) => s.urls);
  const jellyfin = useSession((s) => s.jellyfin);
  const [state, dispatch] = useReducer(wizardReducer, { step: 'server' });

  const api = useMemo(
    () => (state.server && jellyfin ? createApi(jellyfin, serverBaseUrl(state.server)) : null),
    [state.server, jellyfin],
  );
  const serverName =
    (state.server?.local.ok ? state.server.local.serverName : undefined) ??
    (state.server?.external?.ok ? state.server.external.serverName : undefined) ??
    state.server?.urls.local ??
    '';

  return (
    <div className="flex h-full items-center justify-center">
      <GlassPanel preset="sheet" className="p-8" contentClassName="p-0">
        {state.step === 'server' && (
          <ServerStep initial={storedUrls ?? undefined} onContinue={(result) => dispatch({ type: 'serverDone', result })} />
        )}
        {state.step === 'login' && api && (
          <LoginStep
            api={api}
            serverName={serverName}
            onBack={() => dispatch({ type: 'back' })}
            onSuccess={(auth, viaQuickConnect, password) =>
              dispatch({ type: 'loginDone', auth, viaQuickConnect, password })
            }
          />
        )}
        {state.step === 'seerr' && <div className="w-[440px]">Jellyseerr (Task 13)</div>}
      </GlassPanel>
    </div>
  );
}
```

- [ ] **Step 3: Tests, Sichtprüfung, Commit**

Run: `npm test && npm run typecheck && npm run lint`
Expected: grün.
Run: `npm run tauri dev` → Server verbinden → Quick-Connect-Code erscheint; in einem anderen Jellyfin-Client bestätigen → Schritt wechselt auf "Jellyseerr (Task 13)". Zurück, Passwort-Tab testen.

```bash
git add -A
git commit -m "feat: login step with quick connect polling and password sign-in

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Jellyseerr-Client (Rust, Cookie-Session) und Jellyseerr-Schritt

**Files:**
- Create: `src-tauri/src/seerr.rs`, `src-tauri/src/commands/seerr.rs`, `src/lib/seerr/client.ts`, `src/features/onboarding/SeerrStep.tsx`
- Modify: `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/src/commands/mod.rs`, `src/features/onboarding/OnboardingPage.tsx`
- Test: Rust-Tests in `seerr.rs` (wiremock); `src/features/onboarding/SeerrStep.test.tsx`

**Interfaces:**
- Produces (Rust): `SeerrClient::new()`, `set_base_url(String)`, `login(&str, &str) -> Result<Value, SeerrError>`, `request(&str, &str, &[(String, String)], Option<Value>) -> Result<Value, SeerrError>`; `SeerrError { NotConfigured, Unreachable(String), Unauthorized, Http { status, body } }`; Commands `seerr_set_base_url(url)`, `seerr_login(username, password) -> Value`, `seerr_request(method, path, query?, body?) -> Value` (bei 401 einmaliger Re-Login mit `seerr.user`-Setting + `seerr.password`-Credential).
- Produces (TS): `seerrSetBaseUrl(url: string)`, `seerrLogin(username, password): Promise<SeerrUser>`, `seerrRequest<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, opts?: { query?: Record<string, string>; body?: unknown }): Promise<T>`; `SeerrUser = { id: number; displayName: string; permissions: number }`.
- `SeerrStep` props: `{ jellyfinUrls: ServerUrls; username: string; password?: string; onDone(): void }`.

- [ ] **Step 1: Cargo-Abhängigkeiten**

`src-tauri/Cargo.toml` ergänzen:

```toml
[dependencies]
reqwest = { version = "0.12", features = ["json", "cookies"] }
tokio = { version = "1", features = ["sync"] }
thiserror = "2"

[dev-dependencies]
wiremock = "0.6"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

- [ ] **Step 2: Failing Rust-Tests und Client**

`src-tauri/src/seerr.rs`:

```rust
use serde_json::Value;
use std::time::Duration;
use tokio::sync::RwLock;

#[derive(Debug, thiserror::Error, serde::Serialize)]
#[serde(tag = "kind", content = "detail")]
pub enum SeerrError {
    #[error("Jellyseerr is not configured")]
    NotConfigured,
    #[error("Jellyseerr unreachable: {0}")]
    Unreachable(String),
    #[error("Jellyseerr rejected the session")]
    Unauthorized,
    #[error("Jellyseerr HTTP {status}")]
    Http { status: u16, body: String },
}

pub struct SeerrClient {
    http: reqwest::Client,
    base_url: RwLock<Option<String>>,
}

impl Default for SeerrClient {
    fn default() -> Self {
        Self::new()
    }
}

impl SeerrClient {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .cookie_store(true)
            .timeout(Duration::from_secs(20))
            .build()
            .expect("reqwest client");
        Self { http, base_url: RwLock::new(None) }
    }

    pub async fn set_base_url(&self, url: String) {
        *self.base_url.write().await = Some(url.trim_end_matches('/').to_string());
    }

    async fn base(&self) -> Result<String, SeerrError> {
        self.base_url.read().await.clone().ok_or(SeerrError::NotConfigured)
    }

    pub async fn login(&self, username: &str, password: &str) -> Result<Value, SeerrError> {
        let base = self.base().await?;
        let res = self
            .http
            .post(format!("{base}/api/v1/auth/jellyfin"))
            .json(&serde_json::json!({ "username": username, "password": password }))
            .send()
            .await
            .map_err(|e| SeerrError::Unreachable(e.to_string()))?;
        Self::into_json(res).await
    }

    pub async fn request(
        &self,
        method: &str,
        path: &str,
        query: &[(String, String)],
        body: Option<Value>,
    ) -> Result<Value, SeerrError> {
        let base = self.base().await?;
        let method = reqwest::Method::from_bytes(method.as_bytes())
            .map_err(|e| SeerrError::Unreachable(e.to_string()))?;
        let mut req = self.http.request(method, format!("{base}/api/v1{path}")).query(query);
        if let Some(body) = body {
            req = req.json(&body);
        }
        let res = req.send().await.map_err(|e| SeerrError::Unreachable(e.to_string()))?;
        Self::into_json(res).await
    }

    async fn into_json(res: reqwest::Response) -> Result<Value, SeerrError> {
        let status = res.status();
        if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
            return Err(SeerrError::Unauthorized);
        }
        let body = res.text().await.map_err(|e| SeerrError::Unreachable(e.to_string()))?;
        if !status.is_success() {
            return Err(SeerrError::Http { status: status.as_u16(), body });
        }
        if body.trim().is_empty() {
            return Ok(Value::Null);
        }
        serde_json::from_str(&body).map_err(|e| SeerrError::Http { status: status.as_u16(), body: e.to_string() })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{header, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[tokio::test]
    async fn login_sets_cookie_and_requests_carry_it() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/api/v1/auth/jellyfin"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(serde_json::json!({ "id": 1, "displayName": "julian", "permissions": 2 }))
                    .insert_header("set-cookie", "connect.sid=abc; Path=/; HttpOnly"),
            )
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v1/auth/me"))
            .and(header("cookie", "connect.sid=abc"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({ "id": 1 })))
            .mount(&server)
            .await;

        let client = SeerrClient::new();
        client.set_base_url(server.uri()).await;
        let user = client.login("julian", "pw").await.unwrap();
        assert_eq!(user["displayName"], "julian");
        let me = client.request("GET", "/auth/me", &[], None).await.unwrap();
        assert_eq!(me["id"], 1);
    }

    #[tokio::test]
    async fn unauthorized_is_typed() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v1/request"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&server)
            .await;
        let client = SeerrClient::new();
        client.set_base_url(server.uri()).await;
        let err = client.request("GET", "/request", &[], None).await.unwrap_err();
        assert!(matches!(err, SeerrError::Unauthorized));
    }

    #[tokio::test]
    async fn not_configured_without_base_url() {
        let client = SeerrClient::new();
        let err = client.request("GET", "/auth/me", &[], None).await.unwrap_err();
        assert!(matches!(err, SeerrError::NotConfigured));
    }
}
```

`src-tauri/src/commands/seerr.rs`:

```rust
use crate::AppState;
use serde_json::Value;
use tauri::State;

use crate::seerr::SeerrError;

#[tauri::command]
pub async fn seerr_set_base_url(state: State<'_, AppState>, url: String) -> Result<(), SeerrError> {
    state.seerr.set_base_url(url).await;
    Ok(())
}

#[tauri::command]
pub async fn seerr_login(
    state: State<'_, AppState>,
    username: String,
    password: String,
) -> Result<Value, SeerrError> {
    state.seerr.login(&username, &password).await
}

#[tauri::command]
pub async fn seerr_request(
    state: State<'_, AppState>,
    method: String,
    path: String,
    query: Option<Vec<(String, String)>>,
    body: Option<Value>,
) -> Result<Value, SeerrError> {
    let query = query.unwrap_or_default();
    match state.seerr.request(&method, &path, &query, body.clone()).await {
        Err(SeerrError::Unauthorized) => {
            let (username, password) = stored_credentials(&state)?;
            state.seerr.login(&username, &password).await?;
            state.seerr.request(&method, &path, &query, body).await
        }
        other => other,
    }
}

fn stored_credentials(state: &State<'_, AppState>) -> Result<(String, String), SeerrError> {
    let user_json = {
        let db = state.db.lock().map_err(|_| SeerrError::NotConfigured)?;
        db.get_setting("seerr.user").map_err(|_| SeerrError::NotConfigured)?
    }
    .ok_or(SeerrError::NotConfigured)?;
    let user: Value = serde_json::from_str(&user_json).map_err(|_| SeerrError::NotConfigured)?;
    let username = user["username"].as_str().ok_or(SeerrError::NotConfigured)?.to_string();
    let password = crate::credentials::get("seerr.password")
        .map_err(|_| SeerrError::NotConfigured)?
        .ok_or(SeerrError::NotConfigured)?;
    Ok((username, password))
}
```

`src-tauri/src/commands/mod.rs`: `pub mod seerr;` ergänzen.

`src-tauri/src/lib.rs`: `mod seerr;` ergänzen, `AppState` erweitern und Commands registrieren:

```rust
pub struct AppState {
    pub db: Mutex<db::Db>,
    pub seerr: seerr::SeerrClient,
}
// im setup: app.manage(AppState { db: Mutex::new(database), seerr: seerr::SeerrClient::new() });
// im generate_handler! ergänzen:
//   commands::seerr::seerr_set_base_url,
//   commands::seerr::seerr_login,
//   commands::seerr::seerr_request,
```

Run: `cd src-tauri && cargo test && cargo clippy -- -D warnings && cd ..`
Expected: 9 Tests bestanden (3 system, 3 db, 3 seerr).

- [ ] **Step 3: Failing Frontend-Test**

`src/features/onboarding/SeerrStep.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeerrStep } from '@/features/onboarding/SeerrStep';
import * as seerr from '@/lib/seerr/client';
import { setSetting } from '@/lib/tauri/settings';
import { setCredential } from '@/lib/tauri/credentials';
import { SettingKeys, CredentialKeys } from '@/lib/settings/keys';

vi.mock('@/lib/seerr/client');
vi.mock('@/lib/tauri/settings', () => ({ setSetting: vi.fn(async () => undefined), getSetting: vi.fn(async () => null) }));
vi.mock('@/lib/tauri/credentials', () => ({ setCredential: vi.fn(async () => undefined) }));

const urls = { local: 'http://192.168.1.125:8096', external: 'https://jf.example.com' };

describe('SeerrStep', () => {
  it('belegt die Adressen vor, meldet an und speichert', async () => {
    vi.mocked(seerr.seerrLogin).mockResolvedValue({ id: 1, displayName: 'julian', permissions: 2 });
    const onDone = vi.fn();
    render(<SeerrStep jellyfinUrls={urls} username="julian" password="pw" onDone={onDone} />);
    expect(screen.getByLabelText('Lokale Adresse')).toHaveValue('http://192.168.1.125:5055');
    expect(screen.getByLabelText('Externe Adresse (optional)')).toHaveValue('https://jf.example.com:5055');
    await userEvent.click(screen.getByRole('button', { name: 'Verbinden' }));
    expect(seerr.seerrSetBaseUrl).toHaveBeenCalledWith('http://192.168.1.125:5055');
    expect(seerr.seerrLogin).toHaveBeenCalledWith('julian', 'pw');
    expect(setSetting).toHaveBeenCalledWith(SettingKeys.seerrUrls, {
      local: 'http://192.168.1.125:5055',
      external: 'https://jf.example.com:5055',
    });
    expect(setSetting).toHaveBeenCalledWith(SettingKeys.seerrUser, {
      id: 1,
      displayName: 'julian',
      permissions: 2,
      username: 'julian',
    });
    expect(setCredential).toHaveBeenCalledWith(CredentialKeys.seerrPassword, 'pw');
    expect(onDone).toHaveBeenCalled();
  });

  it('fragt nach dem Passwort, wenn keins vorliegt', () => {
    render(<SeerrStep jellyfinUrls={urls} username="julian" onDone={vi.fn()} />);
    expect(screen.getByLabelText('Passwort')).toBeInTheDocument();
    expect(screen.getByText(/Quick Connect/)).toBeInTheDocument();
  });

  it('lässt sich überspringen', async () => {
    const onDone = vi.fn();
    render(<SeerrStep jellyfinUrls={urls} username="julian" password="pw" onDone={onDone} />);
    await userEvent.click(screen.getByRole('button', { name: 'Überspringen' }));
    expect(onDone).toHaveBeenCalled();
  });
});
```

Run: `npm test -- SeerrStep`
Expected: FAIL.

- [ ] **Step 4: TS-Client und SeerrStep**

`src/lib/seerr/client.ts`:

```ts
import { invoke } from '@tauri-apps/api/core';

export interface SeerrUser {
  id: number;
  displayName: string;
  permissions: number;
}

export type SeerrMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export async function seerrSetBaseUrl(url: string): Promise<void> {
  await invoke('seerr_set_base_url', { url });
}

export async function seerrLogin(username: string, password: string): Promise<SeerrUser> {
  const user = await invoke<{ id: number; displayName?: string; permissions?: number }>('seerr_login', {
    username,
    password,
  });
  return { id: user.id, displayName: user.displayName ?? username, permissions: user.permissions ?? 0 };
}

export async function seerrRequest<T>(
  method: SeerrMethod,
  path: string,
  opts: { query?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  return invoke<T>('seerr_request', {
    method,
    path,
    query: opts.query ? Object.entries(opts.query) : null,
    body: opts.body ?? null,
  });
}
```

`src/features/onboarding/SeerrStep.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/form/TextInput';
import { deriveSeerrUrl, normalizeServerUrl } from '@/lib/connection/url';
import { seerrLogin, seerrSetBaseUrl } from '@/lib/seerr/client';
import { setSetting } from '@/lib/tauri/settings';
import { setCredential } from '@/lib/tauri/credentials';
import { SettingKeys, CredentialKeys } from '@/lib/settings/keys';
import type { ServerUrls } from '@/lib/connection/ConnectionManager';

export interface SeerrStepProps {
  jellyfinUrls: ServerUrls;
  username: string;
  password?: string;
  onDone: () => void;
}

export function SeerrStep({ jellyfinUrls, username, password, onDone }: SeerrStepProps) {
  const { t } = useTranslation();
  const [local, setLocal] = useState(deriveSeerrUrl(jellyfinUrls.local));
  const [external, setExternal] = useState(jellyfinUrls.external ? deriveSeerrUrl(jellyfinUrls.external) : '');
  const [pw, setPw] = useState(password ?? '');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const needsPassword = password === undefined;

  async function connect() {
    const localUrl = normalizeServerUrl(local);
    const externalUrl = external.trim() ? normalizeServerUrl(external) : undefined;
    if (!localUrl || (external.trim() && !externalUrl)) {
      setError(t('onboarding.server.invalidUrl'));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await seerrSetBaseUrl(localUrl);
      const user = await seerrLogin(username, pw);
      await setSetting(SettingKeys.seerrUrls, externalUrl ? { local: localUrl, external: externalUrl } : { local: localUrl });
      await setSetting(SettingKeys.seerrUser, { ...user, username });
      await setCredential(CredentialKeys.seerrPassword, pw);
      onDone();
    } catch {
      setError(t('onboarding.seerr.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-[440px] flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('onboarding.seerr.title')}</h1>
      <p className="text-sm text-[var(--lq-text-dim)]">{t('onboarding.seerr.description')}</p>
      <TextInput label={t('onboarding.seerr.localUrl')} value={local} onChange={setLocal} />
      <TextInput label={t('onboarding.seerr.externalUrl')} value={external} onChange={setExternal} />
      {needsPassword && (
        <>
          <p className="text-xs text-[var(--lq-text-dim)]">{t('onboarding.seerr.passwordHint')}</p>
          <TextInput label={t('onboarding.login.passwordField')} value={pw} onChange={setPw} type="password" />
        </>
      )}
      {error && <span className="text-xs text-[var(--lq-danger-text)]">{error}</span>}
      <div className="flex justify-between pt-2">
        <Button variant="glass" onClick={onDone}>
          {t('common.skip')}
        </Button>
        <Button variant="accent" disabled={busy || !pw} onClick={() => void connect()}>
          {busy ? t('common.loading') : t('onboarding.seerr.connect')}
        </Button>
      </div>
    </div>
  );
}
```

`src/features/onboarding/OnboardingPage.tsx` – Seerr-Schritt einhängen und Session abschliessen:

```tsx
// Imports ergänzen:
import { SeerrStep } from '@/features/onboarding/SeerrStep';
import { useNavigate } from '@tanstack/react-router';

// in der Komponente:
const signIn = useSession((s) => s.signIn);
const navigate = useNavigate();

async function finish() {
  if (!state.server || !state.auth) return;
  await signIn({ urls: state.server.urls, auth: state.auth, viaQuickConnect: state.viaQuickConnect ?? false });
  await navigate({ to: '/home' });
}

// Platzhalter ersetzen:
{state.step === 'seerr' && state.server && state.auth && (
  <SeerrStep
    jellyfinUrls={state.server.urls}
    username={state.auth.userName}
    password={state.password}
    onDone={() => void finish()}
  />
)}
```

- [ ] **Step 5: Tests, Sichtprüfung, Commit**

Run: `npm test && npm run typecheck && npm run lint`
Expected: grün.
Run: `npm run tauri dev` → kompletter Ablauf bis Jellyseerr: Verbinden mit `http://192.168.1.125:5055` klappt (bei Quick Connect vorher Passwort eingeben), danach landet die App auf `/home`.

```bash
git add -A
git commit -m "feat: jellyseerr cookie-session client in rust and onboarding step

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Startseiten-Attrappe, Abmelden, Verbindungsbanner, CI und README

**Files:**
- Modify: `src/features/home/HomePage.tsx`, `src/app/shell/Shell.tsx`, `README.md`
- Create: `.github/workflows/ci.yml`
- Test: `src/features/home/HomePage.test.tsx`

**Interfaces:**
- Produces: `HomePage` zeigt `home.greeting` mit `user.userName` und einen Abmelden-Button, der `signOut()` aufruft und nach `/onboarding` navigiert. `Shell` zeigt ein Banner bei `connectionMode === 'offline' | 'external'`.

- [ ] **Step 1: Failing Test**

`src/features/home/HomePage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from '@/features/home/HomePage';
import { useSession } from '@/features/auth/session';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navigate,
}));

describe('HomePage', () => {
  it('begrüsst den Benutzer und meldet ab', async () => {
    const signOut = vi.fn(async () => undefined);
    useSession.setState({ user: { userId: 'u', userName: 'Julian', viaQuickConnect: false }, signOut });
    render(<HomePage />);
    expect(screen.getByText('Hallo Julian')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abmelden' }));
    expect(signOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({ to: '/onboarding' });
  });
});
```

Run: `npm test -- HomePage`
Expected: FAIL.

- [ ] **Step 2: Implementieren**

`src/features/home/HomePage.tsx`:

```tsx
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth/session';

export function HomePage() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    await navigate({ to: '/onboarding' });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">{t('home.greeting', { name: user?.userName ?? '' })}</h1>
      <div>
        <Button variant="glass" onClick={() => void handleSignOut()}>
          {t('common.signOut')}
        </Button>
      </div>
    </div>
  );
}
```

`src/app/shell/Shell.tsx` – Banner ergänzen (innerhalb des Content-Spalten-`div`, vor `<Toolbar />`):

```tsx
import { useTranslation } from 'react-i18next';
import { useSession } from '@/features/auth/session';

function ConnectionBanner() {
  const { t } = useTranslation();
  const mode = useSession((s) => s.connectionMode);
  if (mode === 'local') return null;
  return (
    <div className="mx-3 mt-3 rounded-xl bg-amber-500/20 px-3 py-1.5 text-xs text-amber-100">
      {mode === 'offline' ? t('connection.offline') : t('connection.external')}
    </div>
  );
}
// im JSX: <ConnectionBanner /> direkt vor <Toolbar />
```

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test

  rust:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri
      - run: npm ci
      - run: npm run build
      - run: cargo test --manifest-path src-tauri/Cargo.toml
      - run: cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

`README.md` ergänzen (Abschnitt "Entwicklung"):

```markdown
## Entwicklung

Voraussetzungen: Node 22+, Rust (rustup, stable-msvc), Visual Studio Build Tools 2022 mit "Desktopentwicklung mit C++", WebView2-Runtime.

```bash
npm ci
npm run tauri dev      # App im Dev-Modus
npm test               # Frontend-Tests
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build    # NSIS-Installer (per-user) unter src-tauri/target/release/bundle/nsis/
```

Die App speichert Einstellungen in `%APPDATA%\ch.hintermann.jellydesk\jellydesk.db` und Zugangsdaten im Windows-Anmeldeinformationsverwalter (Eintrag `JellyDesk`).
```

- [ ] **Step 3: Tests, Commit, Push, CI prüfen**

Run: `npm test && npm run typecheck && npm run lint && cd src-tauri && cargo test && cd ..`
Expected: grün.

```bash
git add -A
git commit -m "feat: home placeholder with sign-out, connection banner, ci workflow

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
gh run watch --exit-status
```

Expected: beide CI-Jobs grün.

- [ ] **Step 4: Manueller Abnahme-Test gegen das NAS**

1. `npm run tauri dev`, Onboarding komplett mit Quick Connect durchlaufen, Jellyseerr verbinden → Startseite "Hallo Julian".
2. App schliessen und neu starten → direkt Startseite (Session wiederhergestellt), kein Onboarding.
3. Abmelden → Onboarding mit vorbelegter lokaler URL.
4. Windows-Einstellung "Transparenzeffekte" ausschalten → innerhalb von 30 s werden alle Glasflächen opak.
5. Externe URL eingeben, lokale URL absichtlich falsch → Banner "Verbunden über externe Adresse".

Ergebnis im Vault dokumentieren (`Projekte/JellyDesk/`).

---

## Roadmap der Folgepläne

Jeder Plan wird erst geschrieben, wenn der vorherige umgesetzt ist, damit er auf dem realen Code aufsetzt.

| Plan | Inhalt | Spec-Abschnitte |
|---|---|---|
| Plan 2 – Cache & Datenzugriff | `jfimg://`-Bild-Cache in Rust (Disk-LRU, SQLite `image_cache`), TanStack Query mit IndexedDB-Persistenz, Jellyfin-WebSocket mit Invalidierung, Query-Hooks für Items/Views/Userdata | 6.1, 6.2, 12 (WebSocket) |
| Plan 3 – Browse | Start (Weiterschauen, Nächste Folgen, Zuletzt hinzugefügt), Bibliotheken mit virtualisiertem Raster/Filtern/Sortierung, Film-/Serien-/Episoden-/Person-/Sammlung-/Playlist-/Genre-Seiten, Suche (Jellyfin), Kontextmenüs, Gesehen/Favorit, Backdrop-Steuerung | 4.2, 4.3, 5.1 |
| Plan 4 – Player | DeviceProfile-Probing, PlaybackInfo, Direct Play/Remux/HLS (hls.js), Glas-Steuerleiste, Trickplay, Audio/Untertitel (VTT, libass, Burn-in), Kapitel, Geschwindigkeit, Nächste Folge, Intro-Skipper, Fortschrittsmeldung, Tastatur, PiP, SMTC (Rust), Standby-Sperre | 7 |
| Plan 5 – Jellyseerr | Discover-Tabs, gemischte Suche, Detail mit Verfügbarkeit, Anfrage mit Staffelwahl/4K, Meine Anfragen, Status-Polling mit Toasts | 10.2 |
| Plan 6 – Downloads & Offline | Rust-Download-Manager (Zustandsautomat, Resume, Parallelität), Original/Transcode-Entscheidung, Downloads-Seite, Offline-Modus, Fortschritts-Warteschlange | 8, 6.3 |
| Plan 7 – SyncPlay | Gruppen, WebSocket-Befehle, Zeitabgleich, Puffer-/Bereit-Meldungen, Player-Popover | 9 |
| Plan 8 – Installer, Updater, Einstellungen, Feinschliff | Einstellungen-Seite komplett, Tauri-Updater mit Minisign + GitHub Releases, `release.yml`, README für Endnutzer (SmartScreen), Performance-Messung, Tastaturnavigation, Fehlerpfade | 4.2 (Einstellungen), 11, 12, 13 |

---

## Self-Review (durchgeführt beim Schreiben)

- **Spec-Abdeckung Plan 1:** Abschnitt 2 (Stack, Struktur, Verantwortlichkeiten) → Tasks 1–3, 6; 3.1/3.2 (Onboarding, Speicherung) → Tasks 10–13; 3.3 (ConnectionManager inkl. Timeouts, Recheck, Fehler-Schwelle, Bitrate-Einstellung pro Modus → letztere kommt mit den Einstellungen in Plan 8) → Task 8; 4.1 (Fensterrahmen, Sidebar, Toolbar) → Task 7; 5.1–5.5 (Glas-Ebenen, Optik, Reduzierte Transparenz, Typografie mit Inter → Inter-Webfont wird in Plan 8 gebündelt, bis dahin Segoe UI Variable) → Tasks 3, 4, 7; 10.1 (Seerr-Client) → Task 13; 11 (NSIS currentUser, CSP) → Task 2, CI → Task 14; 12 (401 → Login) → Session-Store liefert die Grundlage, Auto-Redirect bei 401 kommt mit dem Query-Layer in Plan 2; 13 (Vitest, MSW, cargo test) → alle Tasks.
- **Platzhalter:** keine "TBD"/"später"; jeder Code-Schritt enthält den Code. Die beiden Platzhalter-Komponenten in Task 7/11 werden im selben Plan ersetzt (Task 11/12/13/14).
- **Typkonsistenz geprüft:** `ProbeResult` (Task 8) wird in Task 9–11 identisch verwendet; `AuthResult` (Task 9) in Task 10–13; `ServerUrls`/`ConnectionMode` (Task 8) in Task 10–13; `GlassPanel`-Presets (Task 3) in Task 7/11; `SettingKeys`/`CredentialKeys` (Task 6) in Task 10/13; `appWindow` (Task 7) in Titlebar; `useSession`-Felder (Task 10) in Task 11–14; Rust `AppState` wächst von `{ db }` (Task 6) zu `{ db, seerr }` (Task 13).
