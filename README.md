# Lag Snap — Chrome Extension

A Chrome Extension (Manifest V3) that **optimizes the current clipboard image**
for pasting into chat apps and LLM browser conversations.

---

## Features

- **One-click optimization** — reads the image from your clipboard, resizes and
  re-encodes it, and writes it back — ready to paste.
- **Smart downscaling** — long edge is capped at a configurable max dimension
  (default 1600 px). Images already within the limit are not upscaled.
- **JPEG quality loop** — iteratively reduces quality until the file fits inside
  the target size (default 900 KB).
- **Transparency detection** — images with transparent pixels are kept as PNG
  by default; you can force JPEG via the settings panel.
- **Before / after stats** — dimensions and file size are shown after each
  optimization.
- **Persistent settings** — max dimension, target KB, and output format are
  saved per-browser-profile via `localStorage`.

---

## File Structure

```
lagsnap/
├── manifest.json          # MV3 manifest
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Styles (Catppuccin-inspired dark theme)
│   └── popup.js           # UI logic / wires Optimizer + Clipboard
├── lib/
│   ├── optimize.js        # Core resize + encode logic (canvas / OffscreenCanvas)
│   └── clipboard.js       # Clipboard read/write helpers
├── assets/
│   ├── ICONS.md           # Instructions for required icon files
│   ├── icon16.png         # (create — see ICONS.md)
│   ├── icon32.png         # (create — see ICONS.md)
│   ├── icon48.png         # (create — see ICONS.md)
│   └── icon128.png        # (create — see ICONS.md)
└── README.md
```

---

## Installation (Developer Mode)

1. **Generate icons** — follow the instructions in [`assets/ICONS.md`](assets/ICONS.md).
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select this repository folder.
5. The Lag Snap icon will appear in the toolbar.

---

## Usage

1. Copy any image to the clipboard (`Ctrl+C` / `Cmd+C`, or right-click → Copy Image).
2. Click the Lag Snap toolbar icon.
3. Click **Optimize Clipboard Image**.
4. After a moment the status area shows before/after dimensions and sizes.
5. Paste the optimized image wherever you need it (`Ctrl+V` / `Cmd+V`).

---

## Settings

| Setting            | Default | Description                                          |
|--------------------|---------|------------------------------------------------------|
| Max dimension (px) | 1600    | Maximum long-edge pixel count                        |
| Target max size    | 900 KB  | JPEG quality is reduced until the blob fits          |
| Output format      | Auto    | Auto → JPEG (or PNG if transparent); Force JPEG/PNG  |

---

## Technical Notes

- All clipboard I/O runs in the **popup page** inside a user gesture, satisfying
  the browser security requirements for the Clipboard API.
- Resizing uses `createImageBitmap` + `OffscreenCanvas` (falls back to
  `HTMLCanvasElement`).
- JPEG encoding loops from quality 0.92 down to 0.30 in steps of 0.08 until
  the target KB is met.
- The Clipboard API only accepts `image/png` for `ClipboardItem` writes in
  Chrome; optimized JPEG blobs are transparently re-encoded to PNG before
  writing (the visual quality difference is negligible after JPEG compression).
- No external dependencies — vanilla JS, HTML, and CSS only.

---

## Permissions

| Permission      | Reason                              |
|-----------------|-------------------------------------|
| `clipboardRead` | Read the source image from clipboard |
| `clipboardWrite`| Write the optimized image back       |
