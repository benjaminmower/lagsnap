/**
 * popup.js
 * Wires UI elements to Optimizer and Clipboard helpers.
 */

'use strict';

(function () {
  const btnOptimize   = document.getElementById('btn-optimize');
  const statusEl      = document.getElementById('status');
  const inputMaxDim   = document.getElementById('max-dimension');
  const inputTargetKB = document.getElementById('target-kb');
  const selectFormat  = document.getElementById('output-format');

  const SETTINGS_INPUTS = [inputMaxDim, inputTargetKB, selectFormat];

  // --- Persist & restore settings via chrome.storage.sync ---

  function getStorage() {
    // Future-proof a bit (Safari/Firefox often expose `browser`).
    return (globalThis.browser?.storage ?? globalThis.chrome?.storage) || null;
  }

  async function loadSettings() {
    const storage = getStorage();
    if (!storage?.sync) return;

    try {
      const saved = await storage.sync.get(['maxDimension', 'targetKB', 'format']);

      if (typeof saved.maxDimension === 'number') inputMaxDim.value = String(saved.maxDimension);
      if (typeof saved.targetKB === 'number')     inputTargetKB.value = String(saved.targetKB);
      if (typeof saved.format === 'string')       selectFormat.value = saved.format;
    } catch (_) {
      // Storage unavailable; defaults remain.
    }
  }

  async function saveSettings() {
    const storage = getStorage();
    if (!storage?.sync) return;

    try {
      await storage.sync.set({
        maxDimension: Number(inputMaxDim.value) || 1600,
        targetKB:     Number(inputTargetKB.value) || 900,
        format:       selectFormat.value || 'auto',
      });
    } catch (_) {
      // Ignore storage errors.
    }
  }

  // Save on typing for number inputs; on change for select.
  inputMaxDim.addEventListener('input', saveSettings);
  inputTargetKB.addEventListener('input', saveSettings);
  selectFormat.addEventListener('change', saveSettings);

  // --- Status helpers ---

  function setStatus(msg, type = '') {
    statusEl.textContent = msg;
    statusEl.className   = 'status' + (type ? ' ' + type : '');
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function setUIBusy(busy) {
    btnOptimize.disabled = busy;
    SETTINGS_INPUTS.forEach((el) => { el.disabled = busy; });
  }

  // --- Main handler ---

  btnOptimize.addEventListener('click', async () => {
    setUIBusy(true);
    setStatus('Reading clipboard…', 'working');

    // Snapshot settings before any await so mid-flight changes don't affect the run.
    const opts = {
      maxDimension: Math.max(100, parseInt(inputMaxDim.value, 10) || 1600),
      targetKB:     Math.max(10,  parseInt(inputTargetKB.value, 10) || 900),
      format:       selectFormat.value || 'auto',
    };

    let bitmap = null;

    try {
      // 1. Read image from clipboard
      const { blob: srcBlob, mimeType: srcMime } = await Clipboard.readImage();
      const srcBytes = srcBlob.size;

      setStatus('Decoding image…', 'working');

      // 2. Decode to ImageBitmap
      bitmap = await createImageBitmap(srcBlob);

      setStatus('Optimizing…', 'working');

      // 3. Optimize (NOTE: Optimizer should NOT close bitmap; caller owns it.)
      const result = await Optimizer.optimizeImage(bitmap, opts);

      // 4. Write back to clipboard (preserve optimized mime)
      setStatus('Writing to clipboard…', 'working');
      await Clipboard.writeImage(result.blob);

      // 5. Report success
      const saved = srcBytes - result.outBytes;
      const pct   = srcBytes > 0 ? Math.round((saved / srcBytes) * 100) : 0;

      const wasResized = result.srcW !== result.outW || result.srcH !== result.outH;
      const dimLine    = wasResized
        ? `Dimensions: ${result.srcW}×${result.srcH} → ${result.outW}×${result.outH}\n`
        : `Dimensions: ${result.srcW}×${result.srcH} (unchanged)\n`;

      const targetNote = !result.targetMet
        ? ` ⚠ target ${opts.targetKB} KB not met at minimum quality`
        : '';

      const srcFmt = srcMime.replace('image/', '');
      const dstFmt = result.format; // 'jpeg' | 'png'

      setStatus(
        `✓ Done! Copied optimized image.\n` +
        dimLine +
        `Size: ${formatBytes(srcBytes)} → ${formatBytes(result.outBytes)}` +
        (saved > 0 ? ` (−${pct}% saved)` : '') + targetNote + `\n` +
        `Format: ${srcFmt} → ${dstFmt}`,
        'success'
      );
    } catch (err) {
      setStatus('✗ ' + (err?.message || String(err)), 'error');
    } finally {
      // Only close here (caller owns lifecycle).
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
      setUIBusy(false);
    }
  });

  // --- Init ---
  loadSettings();
  setStatus('Ready. Copy an image then click Optimize.');
})();
