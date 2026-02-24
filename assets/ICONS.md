# Icon Placeholders

The following icon files are required but **not included** in the repository
because they are binary assets. Create or export them before loading the
extension in Chrome:

| File         | Size       | Usage                                      |
|--------------|------------|--------------------------------------------|
| icon16.png   | 16 × 16 px | Favicon / small toolbar icon               |
| icon32.png   | 32 × 32 px | Windows taskbar / high-DPI toolbar icon    |
| icon48.png   | 48 × 48 px | Extension management page                  |
| icon128.png  | 128 × 128 px | Chrome Web Store listing                  |

## Quick placeholder generation (macOS / Linux with ImageMagick)

```bash
for size in 16 32 48 128; do
  convert -size ${size}x${size} xc:'#cba6f7' \
    -fill '#1e1e2e' -gravity Center \
    -font Helvetica-Bold -pointsize $((size/2)) \
    -annotate 0 'LS' \
    assets/icon${size}.png
done
```

Or simply drop any same-sized PNG files named as above into this directory.
