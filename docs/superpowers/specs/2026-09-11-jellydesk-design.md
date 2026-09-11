# JellyDesk – Design-Spezifikation

**Datum:** 2026-09-11
**Status:** Freigegeben von Julian (2026-09-11)
**Projekt:** JellyDesk – nativer Jellyfin-Client für Windows im Apple-Liquid-Glass-Design

## 1. Ziel

JellyDesk ist ein nativ auf Windows installierter Jellyfin-Client mit dem Funktionsumfang etablierter Clients (Jellyfin Web, Streamyfin, Jellyfin Media Player), einer Jellyseerr-Integration nach dem Vorbild von Streamyfin (iOS), einem konsequenten Apple-Liquid-Glass-Design nach den Regeln von https://liquidglassdesign.com, einem Per-User-Installer ohne Admin-Rechte, Auto-Updates über GitHub Releases und einem lokalen Cache, damit wiederkehrende Daten nicht jedes Mal vom NAS geladen werden.

### 1.1 Anforderungen (verbindlich)

| # | Anforderung |
|---|---|
| R1 | Nativer Windows-Client, Windows 10 1809+ / Windows 11, x64 |
| R2 | Funktionsumfang wie andere Jellyfin-Clients (siehe Abschnitt 4 und 7) |
| R3 | Jellyseerr-Integration wie Streamyfin: Discover, Suche, Anfragen, Anfragestatus |
| R4 | Flüssig, responsiv, schnell: Start < 1 s bis zur gecachten Startseite, 60 fps Scrollen |
| R5 | Design 1:1 Apple Liquid Glass (echte Refraktion, nicht nur Blur) |
| R6 | Startflow: Server-URL (lokal primär, extern Fallback) → Login per Quick Connect oder Username/Passwort |
| R7 | Installer ohne Admin-Rechte (Per-User) |
| R8 | Cache-System für Bilder und Metadaten |
| R9 | Downloads / Offline-Wiedergabe |
| R10 | SyncPlay |
| R11 | Auto-Update über GitHub Releases |
| R12 | Oberfläche Deutsch und Englisch, Standard folgt der Jellyfin-Benutzersprache |

### 1.2 Entscheidungen

| Thema | Entscheidung |
|---|---|
| Wiedergabe nicht nativ abspielbarer Formate | Server transkodiert (NAS hat HW-Transcoding). Direct Play wo möglich |
| Umfang v1 | Filme, Serien, Bibliotheken, Suche, Detailseiten, Player, Fortsetzen, Gesehen-Status, Sammlungen, Playlists, Nächste Folge, Favoriten, Downloads/Offline, SyncPlay, Jellyseerr |
| Nicht in v1 | Musik-Player, Live TV & Aufnahmen, Admin-Funktionen |
| Jellyseerr-Login | Mit Jellyfin-Zugangsdaten. Nach Quick Connect wird das Passwort einmalig für Jellyseerr abgefragt |
| Design-Grundlage | Immer dunkel, Medien-Backdrops hinter der Glas-Ebene |
| Downloads | Original wenn abspielbar, sonst transkodiert in wählbarer Qualität |
| Benutzer | Ein Benutzer pro Installation (Julian), kein Profil-Screen |
| Updates | GitHub Releases + Tauri-Updater, Repo `julianhintermann-cmd/jellydesk` (öffentlich) |

### 1.3 Bestehende Infrastruktur

- Jellyfin: `http://192.168.1.125:8096` (lokal), extern über Reverse Proxy (URL wird beim Onboarding eingegeben)
- Jellyseerr: `http://192.168.1.125:5055`
- Jellyseerr ist mit Jellyfin verknüpft (gleiche Zugangsdaten)

## 2. Architektur

### 2.1 Stack

| Schicht | Technologie | Begründung |
|---|---|---|
| Native Hülle | Tauri 2 (Rust), WebView2 | 5–10 MB Installer, Start < 1 s, wenig RAM; WebView2 = Edge-Chromium mit H.264/HEVC/AAC/AC3/EAC3-Decodern |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 | Voraussetzung für Liqui UI |
| Glas | Liqui UI (`@liqui-design/glass` + Komponenten als Quellcode via shadcn-CLI), Base UI | Canvas-generierte Displacement-Map + SVG-Filter = echte Refraktion in Chromium |
| Server-State | TanStack Query mit Persistenz in IndexedDB | Stale-while-revalidate, Offline-Erststart aus Cache |
| UI-State | Zustand | Player, Navigation, Einstellungen |
| Jellyfin-API | `@jellyfin/sdk` (TypeScript) + Jellyfin-WebSocket | Offizielles SDK, typisiert |
| Routing | TanStack Router | Typisierte Routen, Preloading |
| Listen | TanStack Virtual | Grosse Bibliotheken flüssig |
| Animation | `motion` (Framer Motion) | Springs, Layout-Morphing |
| Video | HTML5 `<video>`, hls.js, JavascriptSubtitlesOctopus (libass-WASM) | Wie jellyfin-web, bewährt |
| i18n | i18next + react-i18next | de/en |
| Rust-Seite | rusqlite (bundled), reqwest (cookie store), keyring, tokio, souvlaki (Media-Tasten) | Cache, Downloads, Jellyseerr-Session, Credentials, SMTC |
| Tauri-Plugins | updater, process, shell (open), notification, os, window-state, single-instance, dialog, fs | Standardfunktionen |
| Installer | NSIS via Tauri, `installMode: currentUser`, WebView2-Bootstrapper | Kein UAC |
| CI | GitHub Actions + `tauri-apps/tauri-action` | Baut Installer + `latest.json` bei Tag `v*` |

### 2.2 Repo-Struktur

```
JellyDesk/
├── src/                      # React-Frontend
│   ├── app/                  # Router, Provider, Shell (Titlebar, Sidebar, Toolbar)
│   ├── components/ui/        # Liqui-UI-Komponenten (generiert, im Repo gepflegt)
│   ├── components/           # Eigene Komponenten (Cards, Rails, Hero, Player-UI …)
│   ├── features/
│   │   ├── onboarding/       # Server, Login, Jellyseerr-Setup
│   │   ├── home/  library/  item/  search/  discover/  downloads/  settings/  player/  syncplay/
│   ├── lib/
│   │   ├── jellyfin/         # SDK-Wrapper, Query-Hooks, WebSocket, DeviceProfile, Playback-Entscheidung
│   │   ├── seerr/            # Jellyseerr-Client (über Rust-Command)
│   │   ├── connection/       # ConnectionManager (lokal/extern)
│   │   ├── cache/            # Query-Persister, Bild-URL-Builder (jfimg://)
│   │   ├── tauri/            # Typisierte Wrapper für Rust-Commands
│   │   └── i18n/
│   └── styles/               # globals.css (Tailwind, --lq-* Tokens, Design-Tokens)
├── src-tauri/
│   ├── src/
│   │   ├── main.rs / lib.rs
│   │   ├── commands/         # settings, credentials, image_cache, downloads, seerr, media_keys, window
│   │   ├── image_cache.rs    # Disk-LRU, Custom-Protocol-Handler
│   │   ├── downloads.rs      # Download-Manager (Zustandsautomat, Resume)
│   │   ├── seerr.rs          # reqwest-Client mit Cookie-Store, Re-Login
│   │   ├── db.rs             # SQLite (settings, downloads, offline_items, progress_queue)
│   │   └── credentials.rs    # keyring
│   ├── tauri.conf.json
│   └── Cargo.toml
├── docs/superpowers/specs/   # diese Spec
├── docs/superpowers/plans/   # Implementierungspläne
├── .github/workflows/        # ci.yml (Lint/Test), release.yml (Tag → Installer)
└── README.md
```

### 2.3 Verantwortlichkeiten Frontend vs. Rust

**Frontend (WebView2)** spricht direkt mit Jellyfin (CORS ist bei Jellyfin offen, Auth per Header), rendert alles, spielt Video ab, hält den Query-Cache.

**Rust** übernimmt ausschliesslich das, was WebView2 nicht kann oder nicht sicher kann:
- Bild-Cache auf Disk hinter dem Custom-Protokoll `jfimg://`
- Download-Manager (Streams auf Disk, Resume, Parallelität)
- Jellyseerr-HTTP mit Cookie-Session (WebView2 kann fremde Session-Cookies nicht halten)
- Zugangsdaten im Windows Credential Manager
- SQLite für Einstellungen, Downloads, Offline-Metadaten, Fortschritts-Warteschlange
- Fenster (rahmenlos, Titelleisten-Aktionen, Vollbild), Media-Tasten (SMTC), Updater, Auslesen der Windows-Transparenz-Einstellung

Alle Rust-Commands sind in `src/lib/tauri/` typisiert gekapselt. Frontend-Code ruft nie `invoke` direkt auf.

## 3. Onboarding & Authentifizierung

### 3.1 Ablauf

Erster Start (oder nach Abmelden) zeigt einen dreistufigen Assistenten als Glas-Sheet über einem ruhigen, animierten dunklen Verlauf.

**Schritt 1 – Server**
- Felder: Lokale URL (Pflicht), Externe URL (optional). Eingaben werden normalisiert (Schema ergänzen, Slash entfernen, Port beibehalten).
- "Verbinden" ruft `GET /System/Info/Public` auf beiden URLs parallel (Timeout 5 s) und zeigt pro URL Servername, Version, Status.
- Weiter nur, wenn mindestens die lokale URL antwortet oder der Benutzer explizit "Trotzdem weiter" wählt (z. B. unterwegs).

**Schritt 2 – Login** (zwei Tabs)
- *Quick Connect:* `POST /QuickConnect/Initiate` → Code anzeigen → alle 2 s `GET /QuickConnect/Connect?secret=` bis `Authenticated` → `POST /Users/AuthenticateWithQuickConnect`. Fehlt Quick Connect serverseitig (`GET /QuickConnect/Enabled` = false), ist der Tab deaktiviert mit Hinweis.
- *Username/Passwort:* `POST /Users/AuthenticateByName`.
- Auth-Header: `MediaBrowser Client="JellyDesk", Device="<Computername>", DeviceId="<stabile UUID>", Version="<AppVersion>", Token="…"`. DeviceId wird einmal erzeugt und in SQLite gespeichert.

**Schritt 3 – Jellyseerr** (überspringbar, später in Einstellungen nachholbar)
- Felder: Lokale URL, Externe URL. Vorbelegung: Host der jeweiligen Jellyfin-URL mit Port 5055.
- Login via Rust: `POST /api/v1/auth/jellyfin` mit `username`, `password`. Nach Quick Connect wird das Passwort hier einmalig abgefragt; ein Hinweis erklärt, dass es nur im Windows Credential Manager liegt und ausschliesslich für Jellyseerr verwendet wird.
- Erfolg: Jellyseerr-Benutzer und Berechtigungen (z. B. 4K-Anfragen, Auto-Approve) werden gespeichert.

### 3.2 Speicherung

| Datum | Ort |
|---|---|
| Jellyfin-Token, Jellyseerr-Passwort | Windows Credential Manager (keyring, Service `JellyDesk`) |
| Server-URLs, UserId, DeviceId, Jellyseerr-URLs, Einstellungen | SQLite `settings` |
| Jellyseerr-Session-Cookie | Nur im Rust-Prozess (Cookie-Store), bei Ablauf stiller Re-Login |

Abmelden löscht Token, Passwort, Query-Cache und Offline-Fortschritts-Warteschlange; Server-URLs bleiben vorbelegt.

### 3.3 ConnectionManager

- Zustand: `{ mode: 'local' | 'external' | 'offline', baseUrl, lastCheck }`.
- Beim Start: lokal probieren (Timeout 2,5 s), dann extern (Timeout 6 s), sonst Offline-Modus.
- Im Modus `external`: alle 60 s und bei Netzwerkwechsel (Browser `online`-Event) lokal erneut probieren; bei Erfolg still auf lokal wechseln. Laufende Wiedergabe wechselt die URL erst beim nächsten Start eines Titels.
- Bei drei aufeinanderfolgenden Fehlern im aktiven Modus: Fallback in den anderen Modus, danach Offline-Banner.
- Alle Request-Builder (SDK-Client, Bild-URLs, Stream-URLs, WebSocket) beziehen die Basis-URL vom ConnectionManager. Bild-URLs werden serverseitig-relativ gecacht (Schlüssel enthält keine Basis-URL).
- Einstellungen pro Modus: maximale Bitrate (Standard lokal unbegrenzt, extern 20 Mbit/s).

## 4. Screens & Navigation

### 4.1 Fensterrahmen

- Rahmenloses Fenster (`decorations: false`), Mindestgrösse 1024×640, Fensterzustand wird gespeichert.
- Eigene Glas-Titelleiste mit App-Name/Seitentitel, Drag-Region, Minimieren/Maximieren/Schliessen, Snap-Layouts-kompatibel über den Maximieren-Button.
- Glas-Sidebar links (einklappbar auf Icons): Start, Bibliotheken (dynamisch aus `/UserViews`), Suche, Discover, Downloads, Einstellungen. Unten Benutzer-Avatar mit Menü (Abmelden, SyncPlay-Status).
- Glas-Toolbar oben im Content-Bereich: Zurück, Titel, Kontextaktionen, Suche-Schnellzugriff.
- Player öffnet als eigene Vollbild-Route über der Shell (Sidebar/Toolbar ausgeblendet), verlässt sich mit Esc/Zurück.

### 4.2 Seiten

| Seite | Inhalt | Datenquellen |
|---|---|---|
| Start | Weiterschauen, Nächste Folgen, Zuletzt hinzugefügt je Bibliothek, Trending (Jellyseerr, wenn verbunden) | `/Users/{id}/Items/Resume`, `/Shows/NextUp`, `/Users/{id}/Items/Latest`, Seerr `/discover/trending` |
| Bibliothek | Virtualisiertes Poster-Raster oder Liste; Filter Genre/Jahr/Ungesehen/Bewertung/Tags; Sortierung Name/Datum/Bewertung/Laufzeit/Zufall; Buchstabenleiste; Zähler | `/Users/{id}/Items` mit `StartIndex/Limit` (Seiten à 100), `/Genres`, `/Years` |
| Film | Backdrop-Hero mit Logo, Poster, Titel, Jahr, Laufzeit, Bewertung, Altersfreigabe, Genres, Overview; Abspielen/Fortsetzen; Version, Audio-, Untertitelwahl; Trailer; Gesehen/Favorit; Cast; Ähnliche; Sammlung; Mediendaten (Codec, Bitrate, Auflösung, Dateigrösse) | `/Users/{id}/Items/{itemId}`, `/Items/{id}/Similar`, `/Items/{id}/PlaybackInfo` |
| Serie | Hero, Staffeln (horizontal), Episodenliste der gewählten Staffel mit Vorschaubild, Fortschritt, Gesehen-Toggle, "Nächste Folge abspielen"; Staffel komplett als gesehen markieren | `/Shows/{id}/Seasons`, `/Shows/{id}/Episodes` |
| Episode | Wie Film, zusätzlich Serien-/Staffel-Navigation, Vorherige/Nächste | |
| Person | Bio, Filmografie in der Bibliothek | `/Persons/{id}`, Items mit `PersonIds` |
| Sammlung / Playlist / Genre | Raster der enthaltenen Titel, bei Playlist Reihenfolge | `/Items?ParentId=`, `/Playlists/{id}/Items` |
| Suche | Eingabe mit Debounce 250 ms; Gruppen: Filme, Serien, Episoden, Personen, Sammlungen; darunter "Nicht in deiner Bibliothek" aus Jellyseerr mit Anfrage-Button | `/Items?SearchTerm=`, `/Persons?SearchTerm=`, Seerr `/search` |
| Discover | Tabs: Trending, Filme beliebt, Serien beliebt, Demnächst, Genres; Detail mit TMDB-Daten, Verfügbarkeit (verfügbar / angefragt / in Bearbeitung / teilweise), Anfrage mit Staffelwahl und 4K-Option; "Meine Anfragen" mit Status und Stornieren | Seerr `/discover/*`, `/movie/{id}`, `/tv/{id}`, `/request` |
| Downloads | Liste mit Poster, Titel, Qualität, Grösse, Fortschritt; Pause/Fortsetzen/Abbrechen/Löschen; Speicherverbrauch; Speicherort öffnen | Rust `downloads_*` |
| Einstellungen | Server (URLs, Verbindungsstatus, Test), Konto (Benutzer, Abmelden), Wiedergabe (Bitrate lokal/extern, bevorzugte Audio-/Untertitelsprache, Untertitelmodus, Autoplay nächste Folge, Intro überspringen, Trickplay), Downloads (Ordner, Qualität, Parallelität), Design (Reduzierte Transparenz, Backdrop-Intensität, Animationen), Sprache, Cache (Grösse, Limit, Leeren), Jellyseerr (URLs, Verbindung), Updates (Version, Prüfen, Auto), Über | SQLite `settings` |

### 4.3 Wiederkehrende Bausteine

- `PosterCard` (2:3), `BackdropCard` (16:9), `EpisodeCard`, `PersonCard`, jeweils mit Fortschrittsbalken, Ungesehen-Badge, Favorit, Kontextmenü (Abspielen, Von Anfang, Gesehen, Favorit, Download, Zur Playlist, Zur Sammlung, Details).
- `Rail` (horizontale Reihe mit Pfeilen, Tastatur-Navigation), `Grid` (virtualisiert), `Hero`, `MetaChips`, `TrackPicker`.
- Bilder immer mit fester Grösse und `jfimg://`-URL, Blur-Up-Platzhalter aus `BlurHash`.

## 5. Liquid-Glass-Design-System

### 5.1 Ebenenmodell

1. **Basis:** `#0A0A0F` (nahe Schwarz).
2. **Backdrop-Ebene:** Backdrop des aktuellen Kontexts (Item, Serie, auf Start rotierend aus Weiterschauen), skaliert, gedimmt (Overlay 55 %), vertikaler Verlauf nach unten zu Basis, Cross-Fade 600 ms beim Wechsel, leichte Ken-Burns-Bewegung (30 s, deaktiviert bei Reduce Motion).
3. **Content:** solide Karten, Text, Listen, Hero. Kein Glas.
4. **Glas-Ebene (Liqui):** Titelleiste, Sidebar, Toolbar, Player-Steuerleiste, Menüs, Popover, Dialoge/Sheets, Toasts, schwebende Play-Buttons, Filter-Chips-Leiste.
5. Nie mehr als zwei Glas-Ebenen übereinander (z. B. Dialog über Toolbar erlaubt, Menü über Dialog über Toolbar nicht).

### 5.2 Optik (LiquiThemeProvider)

| Parameter | Wert |
|---|---|
| profile | `squircle` |
| refractionScale | Liqui-Referenz (150 px) |
| bezelScale | Liqui-Referenz (28 px) |
| frost | 0.35 (Standard), 1.0 bei Reduzierter Transparenz |
| blur | 1 px |
| specular | 0.7 |
| dispersion | niedrig (0.1–0.2) |
| tint | neutral-dunkel, Akzent bei `accent`-Varianten |

Die exakten Zahlen werden beim Setup mit dem Liqui-Theme-Editor abgeglichen und in `globals.css` (`--lq-*`) und im Provider fixiert.

### 5.3 Reduzierte Transparenz

- Quelle 1: Windows-Einstellung "Transparenzeffekte" (Registry `HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize\EnableTransparency`), von Rust gelesen und bei Änderung gemeldet.
- Quelle 2: App-Einstellung "Reduzierte Transparenz".
- Wirkung: alle Glasflächen wechseln auf die opake "Tinted"-Variante (frost 1.0, feste Hintergrundfarbe mit 92 % Deckung), Refraktion aus. Kontrast bleibt in beiden Varianten ≥ 4.5:1 für Text.

### 5.4 Typografie, Form, Bewegung

- Schrift: Inter (gebündelt, variable), Fallback Segoe UI Variable. Grössen: 13/15/17/22/28/34 px, Zeilenhöhe 1.3–1.45.
- Radien konzentrisch: Fenster 12 px, Sidebar/Toolbar 20 px, Karten 12 px, Buttons 12–999 px (Pill), Sheets 24 px.
- Bewegung: Spring-Presets (`snappy` 0.3 s, `smooth` 0.45 s), Layout-Morphing bei Zustandswechseln (Button → Menü, Chip → Popover), Hover-Lift 1.02 bei Karten, respektiert `prefers-reduced-motion` und App-Einstellung.
- Fokus: sichtbarer Glas-Ring für Tastaturnavigation.

### 5.5 Performance-Regeln

- Maximal rund acht refraktierende Flächen gleichzeitig sichtbar; scrollende Inhalte nie in Glas.
- Backdrop-Bilder maximal 1920 px breit, als WebP vom Server (`format=webp`).
- Alle Listen > 40 Elemente virtualisiert; Bilder lazy mit fester Grösse.
- Glasflächen in eigener Compositing-Ebene (`will-change: transform` sparsam).

## 6. Cache-System

### 6.1 Bild-Cache (Rust)

- Custom-Protokoll `jfimg://<itemId>/<ImageType>/<index>?tag=<ImageTag>&w=<breite>&h=<höhe>&q=<qualität>`.
- Handler: Schlüssel = SHA-256 über `(itemId, type, index, tag, w, h)` → Datei `%LOCALAPPDATA%\JellyDesk\cache\images\<ab>\<hash>`. Treffer: Datei liefern mit `Cache-Control: immutable`. Fehltreffer: vom aktiven Server laden (`/Items/{id}/Images/{type}/{index}?tag=&fillWidth=&quality=&format=webp`), speichern, liefern.
- LRU über SQLite-Tabelle `image_cache(hash, size, last_access)`; Limit einstellbar (Standard 2 GB), Räumung asynchron bei Überschreitung um 10 %.
- Da der ImageTag Teil des Schlüssels ist, führen geänderte Bilder automatisch zu neuen Einträgen.
- Einstellungen zeigen Grösse und bieten "Leeren".

### 6.2 Metadaten-Cache (Frontend)

- TanStack Query mit `persistQueryClient` auf IndexedDB (idb-keyval), `maxAge` 7 Tage, `gcTime` 7 Tage, `staleTime` 5 min.
- Verhalten: sofort aus Cache rendern, im Hintergrund erneuern, UI aktualisiert sich still.
- Invalidierung über Jellyfin-WebSocket (`/socket`): `LibraryChanged` → betroffene Items/Listen, `UserDataChanged` → Item-Userdata, `RefreshProgress` ignoriert.
- Query-Schlüssel enthalten `userId`, nie die Basis-URL.
- Beim Abmelden wird der Cache gelöscht.

### 6.3 Offline-Daten (Rust/SQLite)

- `offline_items(item_id, json, poster_hash, backdrop_hash)` für heruntergeladene Titel inkl. Serien-/Staffelkontext.
- `progress_queue(item_id, position_ticks, played, updated_at)` für Fortschritt ohne Server; wird bei Verbindung als `/Sessions/Playing/Progress` bzw. `/Users/{id}/PlayedItems/{id}` nachgemeldet und geleert.

## 7. Player

### 7.1 Geräteprofil & Wiedergabeentscheidung

- Beim Start wird ein `DeviceProfile` durch Probing gebaut: `video.canPlayType` / `MediaSource.isTypeSupported` für Container (mp4, webm, ts/hls), Video (h264, hevc inkl. main10, av1, vp9), Audio (aac, mp3, ac3, eac3, opus, flac), Untertitel (Text extern als VTT, ASS über libass, PGS/VOBSUB → Burn-in), maximale Bitrate je Verbindungsmodus.
- `POST /Items/{id}/PlaybackInfo` mit Profil, `MediaSourceId`, `AudioStreamIndex`, `SubtitleStreamIndex`, `StartTimeTicks`.
- Antwort → `SupportsDirectPlay` (Stream `/Videos/{id}/stream?Static=true`), `SupportsDirectStream` (Remux), sonst `TranscodingUrl` (HLS über hls.js). MKV-Container werden vom Server remuxt, da WebView2 MKV nicht nativ spielt.
- Wiedergabefehler (MediaError) → einmaliger Neuversuch mit erzwungenem Transcode, danach Fehlerdialog.
- Beim Beenden: `POST /Sessions/Playing/Stopped` und `DELETE /Videos/ActiveEncodings?deviceId=&playSessionId=`.

### 7.2 Funktionen

- Play/Pause, Seek (Klick, Drag, ±10 s), Trickplay-Vorschau beim Hover (`/Videos/{id}/Trickplay/{width}/{index}.jpg` + Manifest, wenn vorhanden), Lautstärke, Stumm.
- Audio- und Untertitelspur wechseln (Text: nativer `<track>` mit VTT von `/Videos/{id}/{source}/Subtitles/{index}/Stream.vtt`; ASS/SSA: JavascriptSubtitlesOctopus; Bildformate: Server brennt ein → Neustart des Streams an gleicher Position).
- Geschwindigkeit 0.5–2.0, Kapitel-Menü, Vollbild, Bild-in-Bild (Chromium-PiP).
- Nächste Folge: Countdown-Karte 15 s vor Ende (aus `/Shows/NextUp`), Autoplay konfigurierbar.
- Intro/Abspann überspringen: `GET /Episode/{id}/IntroSkipperSegments` (Intro-Skipper-Plugin), falls 404 → Feature unsichtbar.
- Fortschritt: `/Sessions/Playing` beim Start, `/Sessions/Playing/Progress` alle 10 s und bei Pause/Seek, `/Sessions/Playing/Stopped` am Ende.
- Tastatur: Space/K Play-Pause, ←/→ ±10 s, J/L ±30 s, ↑/↓ Lautstärke, M Stumm, F Vollbild, S Untertitel, A Audio, N Nächste, Esc Zurück, 0–9 Sprung in Prozent.
- Bevorzugte Audio-/Untertitelsprache aus Einstellungen (Fallback: Jellyfin-Benutzerkonfiguration).
- Media-Tasten und Windows-Medienintegration (SMTC) über Rust (souvlaki): Play/Pause/Next/Stop, Titel und Cover.
- Bildschirmschoner/Standby während Wiedergabe verhindern (Windows `SetThreadExecutionState`).

### 7.3 Player-UI

- Steuerleiste als Glasfläche unten, blendet nach 3 s Inaktivität aus; oben Glas-Leiste mit Titel, Zurück, Track-/Kapitel-/SyncPlay-Menüs.
- Seek-Leiste mit Kapitelmarken, Puffer-Anzeige, Trickplay-Thumbnail.
- Ladezustand mit Spinner auf Glas, Fehlerzustand mit Ursache und "Mit Transcoding erneut versuchen".

## 8. Downloads & Offline

### 8.1 Download-Manager (Rust)

- Zustandsautomat pro Download: `queued → downloading → (paused) → completed | failed | cancelled`. Persistiert in SQLite `downloads(id, item_id, media_source_id, mode, quality, path, bytes_done, bytes_total, state, error, created_at)`.
- Parallelität einstellbar (Standard 2). Fehler: 3 Versuche mit Backoff 5/15/45 s.
- **Modus Original:** wenn `PlaybackInfo` DirectPlay meldet → `GET /Items/{id}/Download` mit `Range`-Resume.
- **Modus Transcode:** sonst `GET /Videos/{id}/stream.mp4?…&VideoBitrate=&MaxWidth=&AudioCodec=aac&VideoCodec=h264&SubtitleMethod=Embed` in gewählter Qualität (Presets 4K 40 Mbit, 1080p 10 Mbit, 1080p 6 Mbit, 720p 3 Mbit); kein Resume, Neustart bei Abbruch.
- Textuntertitel werden als VTT mitgeladen, Metadaten und Bilder in `offline_items`/Bild-Cache abgelegt.
- Speicherort: Standard `%LOCALAPPDATA%\JellyDesk\downloads`, in Einstellungen änderbar (Dialog), bestehende Downloads bleiben am alten Ort.
- Fortschritt per Tauri-Event an das Frontend (max. 4 Updates/s).

### 8.2 Offline-Modus

- Erkennung: ConnectionManager im Modus `offline`.
- Shell zeigt Banner "Offline", Sidebar reduziert auf Downloads und Einstellungen.
- Wiedergabe lokaler Dateien über das Tauri-Asset-Protokoll (`asset://`), gleiche Player-UI.
- Fortschritt in `progress_queue`, Nachmeldung bei Verbindung (Abschnitt 6.3).

## 9. SyncPlay

- REST: `/SyncPlay/List`, `/SyncPlay/New`, `/SyncPlay/Join`, `/SyncPlay/Leave`, `/SyncPlay/Ready`, `/SyncPlay/Buffering`, `/SyncPlay/Ping`, `/SyncPlay/SetPlaylistItem`, `/SyncPlay/Queue`, `/SyncPlay/NextItem`, `/SyncPlay/PreviousItem`, `/SyncPlay/Unpause`, `/SyncPlay/Pause`, `/SyncPlay/Seek`, `/SyncPlay/Stop`.
- WebSocket: `SyncPlayGroupUpdate` (Gruppenstatus, Playlist, Teilnehmer), `SyncPlayCommand` (Unpause/Pause/Seek/Stop mit `PositionTicks`, `When`, `EmittedAt`).
- Zeitabgleich nach jellyfin-web `TimeSyncCore`: periodisch `GET /GetUtcTime`, Offset und Round-Trip schätzen, Befehle zur berechneten lokalen Zeit ausführen; Drift > 0,5 s durch leichtes Anpassen der Geschwindigkeit (0.95–1.05) korrigieren, > 2 s durch Seek.
- UI: In der Player-Leiste und im Benutzermenü ein Glas-Popover: Gruppen auflisten, erstellen, beitreten, verlassen; Teilnehmer; Warteschlange. Lokale Steuerung sendet Befehle an die Gruppe statt direkt an den Player.

## 10. Jellyseerr-Integration

### 10.1 Rust-Client

- `reqwest` mit `cookie_store`, Basis-URL vom Seerr-ConnectionManager (gleiche Logik lokal/extern wie Jellyfin, unabhängiger Zustand).
- Command `seerr_request(method, path, query, body)` → JSON; bei 401/403 einmaliger Re-Login mit gespeicherten Zugangsdaten, dann Wiederholung.
- Fehler werden typisiert gemeldet (`unreachable`, `unauthorized`, `http(status)`).

### 10.2 Funktionen

- Discover: `/discover/trending`, `/discover/movies`, `/discover/tv`, `/discover/movies/upcoming`, `/discover/tv/upcoming`, `/discover/genreslider/*`, `/genres/*`.
- Suche: `/search?query=` gemischt mit Jellyfin-Suche; Treffer, die per `mediaInfo.jellyfinMediaId` in der Bibliothek sind, verlinken auf die Jellyfin-Detailseite.
- Detail: `/movie/{tmdbId}`, `/tv/{tmdbId}` mit Verfügbarkeit (`mediaInfo.status`), Empfehlungen, Ähnliche.
- Anfrage: `POST /request` mit `mediaType`, `mediaId`, `seasons` (TV: Staffelwahl, "Alle"), `is4k` wenn erlaubt. Erfolgs-Toast, Status-Badge aktualisiert.
- Meine Anfragen: `GET /request?filter=all&sort=added&requestedBy={id}`, Stornieren `DELETE /request/{id}` (nur `pending`).
- Status-Polling alle 5 min: Änderungen (`approved`, `available`, `declined`) als Toast und Windows-Benachrichtigung (Tauri notification).
- Ausfall: Discover/Anfragen zeigen eine ruhige Fehlerkarte; Rest der App unberührt.

## 11. Installer, Updates, CI

- `tauri.conf.json`: `bundle.targets = ["nsis"]`, `bundle.windows.nsis.installMode = "currentUser"`, `webviewInstallMode = downloadBootstrapper`, Produktname `JellyDesk`, Identifier `ch.hintermann.jellydesk`.
- Installationsziel `%LOCALAPPDATA%\Programs\JellyDesk`, Startmenü-Eintrag, Deinstallation über Apps & Features, kein UAC.
- Updater: `tauri-plugin-updater`, Endpoint `https://github.com/julianhintermann-cmd/jellydesk/releases/latest/download/latest.json`, Minisign-Schlüsselpaar (privat als GitHub-Secret `TAURI_SIGNING_PRIVATE_KEY`, öffentlich in der Config). Prüfung beim Start (max. 1×/Tag) und manuell; Download mit Fortschritt im Glas-Sheet, Installation und Neustart auf Klick.
- CI: `ci.yml` (Push/PR: Lint, Typecheck, Vitest, cargo test), `release.yml` (Tag `v*`: `tauri-action` auf `windows-latest`, lädt NSIS-Installer, `.sig` und `latest.json` als GitHub Release hoch).
- Versionierung SemVer, Version zentral in `tauri.conf.json` und `package.json`, `CHANGELOG.md`.
- Ohne Authenticode-Zertifikat warnt SmartScreen beim ersten Start; README dokumentiert "Weitere Informationen → Trotzdem ausführen".

## 12. Fehlerbehandlung

| Situation | Verhalten |
|---|---|
| Server nicht erreichbar | Banner, ConnectionManager wechselt Modus, Cache-Inhalte bleiben nutzbar |
| 401 von Jellyfin | Token verwerfen, Login-Schritt mit vorbelegtem Server |
| Wiedergabefehler | Einmaliger Transcode-Fallback, dann Fehlerdialog mit Details |
| Jellyseerr nicht erreichbar / 401 | Re-Login-Versuch, sonst Fehlerkarte nur in Discover/Anfragen |
| Download-Fehler | 3 Versuche mit Backoff, dann `failed` mit Fehlertext und "Erneut versuchen" |
| WebSocket getrennt | Reconnect mit Backoff 1/2/5/10 s, dann alle 30 s |
| Update-Fehler | Toast, App läuft weiter |
| Unerwarteter Frontend-Fehler | Error Boundary pro Route mit "Neu laden" |

## 13. Tests & Qualität

- **Vitest:** ConnectionManager (Fallback, Rückwechsel), DeviceProfile-Builder (mit gemocktem `canPlayType`), Playback-Entscheidung, SyncPlay-Zeitabgleich, Bild-URL-Builder, Query-Schlüssel, i18n-Vollständigkeit (jeder Key in de und en).
- **MSW:** API-Module gegen einen Mock-Jellyfin/Jellyseerr.
- **Rust:** Bild-Cache-LRU, Download-Zustandsautomat, Settings-Migrationen.
- **Manuell gegen NAS:** Onboarding beide Login-Wege, Direct Play/Remux/Transcode je ein Titel, Untertiteltypen, Offline-Start, SyncPlay mit zweitem Client, Update von Version n auf n+1.
- **Leistungsbudget:** Kaltstart < 1,5 s, Warmstart < 1 s bis Startseite aus Cache, Bibliothek mit 2000 Titeln scrollt bei 60 fps, RAM im Leerlauf < 250 MB.
- Lint: ESLint + Prettier, `cargo clippy -D warnings`.

## 14. Umsetzungsreihenfolge

1. Grundgerüst: Tauri 2 + React + Tailwind v4 + Liqui UI, Shell (Titelleiste, Sidebar, Toolbar), Design-Tokens, i18n, Router.
2. Onboarding, Auth, ConnectionManager, Credential-Speicher, SQLite-Settings.
3. Cache: `jfimg://`-Protokoll, Query-Persistenz, WebSocket-Invalidierung.
4. Browse: Start, Bibliothek, Detailseiten, Suche, Person/Sammlung/Playlist/Genre.
5. Player komplett (Abschnitt 7).
6. Jellyseerr (Abschnitt 10).
7. Downloads & Offline (Abschnitt 8).
8. SyncPlay (Abschnitt 9).
9. Installer, Updater, CI, README.
10. Feinschliff: Performance-Messung, Tastaturnavigation, Reduzierte Transparenz, Fehlerpfade.

## 15. Nicht-Ziele (v1)

Musik-Player, Live TV/Aufnahmen, Admin-Funktionen (Server-Dashboard, Benutzerverwaltung), Multi-Server, Profil-Wechsel-Screen, Chromecast/DLNA, Trakt.

## 16. Voraussetzungen auf dem Entwicklungs-PC

- Rust-Toolchain (rustup) und Visual Studio Build Tools 2022 (Workload "Desktopentwicklung mit C++"). Die Build-Tools brauchen einmalig Admin-Rechte zur Installation; die fertige App braucht sie nicht.
- WebView2-Runtime ist auf dem Entwicklungs-PC vorhanden (Version 153).
- Für HEVC-Direct-Play muss die Windows-"HEVC-Videoerweiterungen" installiert sein; sonst transkodiert der Server.
