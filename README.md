# Lag Snap --- Chrome Extension

A lightweight **Manifest V3 Chrome Extension** that instantly shrinks
large screenshots and copied images so your chat apps and LLM browser
conversations don't lag.

------------------------------------------------------------------------

## Why Lag Snap?

Modern screenshots are often 3--8MB.\
Pasting them into ChatGPT, Gmail, Slack, or other web apps can cause
noticeable UI lag.

**Lag Snap optimizes them before you paste.**

------------------------------------------------------------------------

## Features

-   **One-click optimization** --- reads the current clipboard image,
    resizes and re-encodes it, then writes the optimized version back to
    the clipboard --- ready to paste.
-   **Smart downscaling** --- caps the long edge at a configurable max
    dimension (default **1600 px**). Images already within limits are
    never upscaled.
-   **Intelligent JPEG quality loop** --- reduces compression quality
    gradually until the file meets the target size (default **900 KB**).
-   **Transparency-aware auto mode** --- defaults to JPEG for smaller
    files, but keeps PNG when transparency is detected.
-   **Before / After stats** --- see dimensions and file size changes
    after every optimization.
-   **Persistent settings** --- preferences are saved per browser
    profile using `localStorage`.
-   **Zero dependencies** --- pure vanilla JavaScript, HTML, and CSS.

------------------------------------------------------------------------

## File Structure

    lagsnap/
    ├── manifest.json          # MV3 manifest
    ├── popup/
    │   ├── popup.html         # Extension popup UI
    │   ├── popup.css          # Dark theme styling
    │   └── popup.js           # UI controller (Optimizer + Clipboard)
    ├── lib/
    │   ├── optimize.js        # Resize + encode engine
    │   └── clipboard.js       # Clipboard read/write helpers
    ├── assets/
    │   ├── ICONS.md           # Icon generation instructions
    │   ├── icon16.png
    │   ├── icon32.png
    │   ├── icon48.png
    │   └── icon128.png
    └── README.md

------------------------------------------------------------------------

## Installation (Developer Mode)

1.  Generate icons using the instructions in `assets/ICONS.md`.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer mode** (top-right toggle).
4.  Click **Load unpacked** and select the repository folder.
5.  The Lag Snap icon will appear in your toolbar.

------------------------------------------------------------------------

## Usage

1.  Copy an image to the clipboard (`Ctrl+C` / `Cmd+C`, or right-click →
    Copy Image).
2.  Click the **Lag Snap** toolbar icon.
3.  Click **Optimize Clipboard Image**.
4.  View the before/after stats.
5.  Paste the optimized image anywhere (`Ctrl+V` / `Cmd+V`).

------------------------------------------------------------------------

## Settings

  -----------------------------------------------------------------------
  Setting                              Default        Description
  ------------------------------------ -------------- -------------------
  Max dimension (px)                   1600           Maximum long-edge
                                                      pixel size

  Target max size                      900 KB         JPEG compression
                                                      adjusts to fit this
                                                      limit

  Output format                        Auto           Auto → JPEG by
                                                      default; PNG only
                                                      if transparency is
                                                      detected. You can
                                                      force JPEG or PNG
                                                      manually.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## Technical Notes

-   Clipboard operations run inside the **popup page during a user
    gesture**, satisfying browser security requirements for the
    Clipboard API.
-   Resizing uses `createImageBitmap` and `OffscreenCanvas` when
    available (falls back to `HTMLCanvasElement`).
-   JPEG encoding starts at quality **0.88** and steps down gradually to
    a minimum of **0.70** to meet the target size.
-   Transparency detection uses lightweight downsampling rather than
    scanning every pixel.
-   Optimized images preserve their chosen format --- **JPEG remains
    JPEG** (no forced PNG re-encoding).
-   No external libraries or build tools are required.

------------------------------------------------------------------------

## Permissions

  Permission   Reason
  ------------ --------------------------------------------------------
  `storage`    Persist user settings (dimension, size target, format)
