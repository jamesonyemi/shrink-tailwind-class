# Changelog

## [0.1.2] - 2026-11-11

### Added
- Preview the markup and generated CSS before applying an extraction.
- Revalidate source and stylesheet changes before applying the preview.
- Detect existing selector conflicts and reuse only identical rules.

## [0.1.1] - 2026-11-11

### Updated
- Rebranded command and settings display names as ChunkTail.
- Kept the `shortail.*` setting keys to preserve existing user preferences.
- Updated the README and added an animated usage preview.

## [0.1.0] — 2026-02-12

### Added
- Initial release
- Code Action provider for long Tailwind class detection
- `Shortail: Extract to @apply` command
- `Shortail: Quick Extract (no grouping)` command
- Smart class categorization (Layout, Spacing, Colors, Typography, etc.)
- Configurable class threshold, target CSS file, and grouping behavior
- State variant preservation option
- Support for HTML, JSX, TSX, Vue, Svelte, Astro, PHP, ERB, and Edge templates
- Keyboard shortcut: Ctrl+Alt+T / Cmd+Alt+T
