# JellyDesk

Nativer Jellyfin-Client für Windows im Apple-Liquid-Glass-Design, mit Jellyseerr-Integration, Offline-Downloads, SyncPlay, lokalem Cache und Per-User-Installer ohne Admin-Rechte.

Design-Spezifikation: [docs/superpowers/specs/2026-09-11-jellydesk-design.md](docs/superpowers/specs/2026-09-11-jellydesk-design.md)

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
