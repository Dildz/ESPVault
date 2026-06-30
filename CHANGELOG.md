# Changelog

All notable changes to ESP Board Vault are documented in this file.

## 2.1.2 - 2026-06-30

### Changed

- Projects with no cover photo now show the same camera placeholder icon as
  boards, instead of a separate empty state.
- The app icon now has a transparent background.

## 2.1.1 - 2026-06-30

### Added

- Pin layout now flags each pin's special chip role — strapping, flash, input-only,
  and USB — with a warning marker and tooltip, so you don't accidentally reuse a
  boot-critical pin. Roles are derived from your board's detected chip family.
- Added the Waveshare ESP32-C6-LCD-1.47 to the board model picker.

## 2.1.0 - 2026-06-30

### Added

- Pin layout viewer: open a board to see an interactive pinout and label what
  each GPIO is wired to in your build. Pick your exact board model for a matching
  image (57 boards, with models for your scanned chip floated to the top), or use
  the generic layout. Each pin can hold a label, a function (with presets like
  LED, sensor, or power), and notes. Assignments save per board and are included
  in backups.
- On the generic layout, GPIOs that don't exist on the board's chip are dimmed.
- Boards can now have tags — add and remove freeform chips in the board detail to
  group and find boards your own way.

### Changed

- The app window now opens maximized by default.

## 2.0.4 - 2026-06-29

### Added

- Each board now has a firmware history — log what you flashed (name, version,
  date flashed, source, notes), with a button to open an http(s) source link.
  Entries are stored per board and included in backups.

### Changed

- The empty board-photo placeholder now uses a clearer camera graphic.

## 2.0.3 - 2026-06-26

### Fixed

- Aligned the About page's top two cards with the detail cards below them (equal
  height and matching column gap).

## 2.0.2 - 2026-06-26

### Added

- Projects can now record a code folder, a repository URL, and the IDE/toolchain
  used. The project detail panel has buttons to open the code folder in your file
  manager and the repository in your browser.

### Changed

- Removed the duplicate "Paper Light" theme.

### Fixed

- The update notification message is now readable across all themes.
- Enabling startup update checks no longer shows a redundant banner.
- Fixed auto-update downloads returning a 404 by removing spaces from the release
  asset file names (GitHub rewrote spaces differently from the update manifest).

## 2.0.1 - 2026-06-26

### Added

- In-app updates via electron-updater. Settings has an opt-in "check for updates
  on startup" toggle and a manual "check for updates now" button. When an update
  is found you can download & install (the app restarts onto the new version),
  remind me later, or skip the version. The Updates section is disabled with a
  reason for builds that can't self-update (portable, Linux .deb/.tar.gz, macOS).

### Fixed

- Fixed a startup crash in packaged builds ("Cannot destructure property
  'autoUpdater'...") caused by how electron-updater was imported.

## 2.0.0 - 2026-06-26

First release of the customized fork (`Dildz/ESPVault`).

### Added

- Theme system with multiple selectable color schemes, with appearance controls
  moved into Settings.

### Changed

- Decomposed the large `DashboardPage` component into per-domain insight
  composables, each unit-tested (no behavior change).

### Removed

- In-app "Buy Me a Coffee" support link.
- Orphaned scan-success event.

## 1.0.29

### Fixed

- Fixed missing Linux desktop panel icons ([#5](https://github.com/thelastoutpostworkshop/ESPVault/issues/5)).
- Hide legacy Linux `/dev/ttyS*` ports by default in the serial picker while
  keeping them available behind a toggle ([#6](https://github.com/thelastoutpostworkshop/ESPVault/issues/6)).

## 1.0.28

### Fixed

- Build macOS DMG artifacts with an APFS filesystem to avoid HFS+ disk image
  mount failures on macOS Tahoe.
- Let the native macOS GitHub Actions matrix control x64 and arm64 packaging so
  each macOS job produces only its requested architecture.

## 1.0.27 - 2026-06-25

### Changed

- Recommend the macOS arm64 ZIP as the Apple Silicon download while DMG
  generation is under investigation.
- Validate macOS DMG artifacts in CI before uploading release assets, and omit a
  failing arm64 DMG while keeping the working arm64 ZIP available.

## 1.0.26 - 2026-06-25

### Fixed

- Generate macOS DMG artifacts with the `ULFO` disk image format to match the
  working ESPConnect macOS release packaging path.

## 1.0.25 - 2026-06-25

### Fixed

- Reset the ad-hoc macOS app signature after flipping Electron fuses so unsigned
  Apple Silicon builds are not killed by macOS code-signature validation.

## 1.0.24 - 2026-06-25

### Changed

- Build macOS x64 and arm64 release artifacts on separate native GitHub-hosted
  macOS runners to reduce architecture-specific packaging risk.
- Clarified macOS release architecture notes.
- Include the matching changelog section in generated GitHub release notes.

## 1.0.23 - 2026-06-22

### Added

- Added README support links, including the Buy Me a Coffee link.
- Added release update instructions for installing newer app versions over an
  existing install.

### Changed

- Refined README installation and release guidance.

## 1.0.22 - 2026-06-22

### Added

- Added README installation instructions and a clickable README banner.
- Added release install notes for desktop release assets.

### Changed

- Improved tooling descriptions.
- Updated npm dependencies.
- Moved board metadata fields higher in the editor for easier scan review.
- Show board location in the detail summary.
- Marked scan-detected board fields more clearly.

### Fixed

- Fixed serial scan permission handling for multi-port scan flows.

## 1.0.21 - 2026-06-14

### Changed

- Preferred Windows portable ZIP instructions in release documentation.
- Updated GitHub Actions release builds for newer Node runners.

## 1.0.20 - 2026-06-14

### Changed

- Linked release notes directly to installer assets.
