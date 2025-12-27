# Viva la Preservation Coffee — Ambient Player

A minimal single-purpose web app that streams ambient recordings from Preservation Coffee & Tea on loop.

## What it does

- Streams bundled audio recordings (`preservation.m4a`, `preservation2.m4a`) from the `sound/` folder.
- Simple player UI with Play/Pause, Volume, Loop, Seek and a Source selector to choose between the two recordings.
- Keyboard shortcuts: Space (Play/Pause), ← / → (Previous / Next track), ↑ / ↓ (Volume ±5%).
- Light / Dark theme toggle; the inline SVG logo and site text respond to theme changes.
- Accessible hints and status messages for actions and shortcuts.
- Support link and footer attribution included.

## Notes

- The page uses an HTML5 `<audio>` element; supported formats depend on the browser (commonly: MP3, M4A/AAC, OGG, WAV).
- Users select only between the two bundled recordings — uploading arbitrary files was intentionally removed.
