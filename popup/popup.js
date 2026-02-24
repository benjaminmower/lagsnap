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

  async function loadSettings() {
    try {
      const saved = await chrome.storage.sync.get(['maxDimension', 'targetKB', 'format']);
      if (saved.maxDimension) inputMaxDim.value   = saved.maxDimension;
      if (saved.targetKB)     inputTargetKB.value = saved.targetKB;
      if (saved.format)       selectFormat.value  = saved.format;
    } catch (_) {
      // Storage unavailable; defaults remain.
    }
  }

  async function saveSettings() {
    try {
      await chrome.storage.sync.set({
        maxDimension: inputMaxDim.value,
        targetKB:     inputTargetKB.value,
        format:       selectFormat.value,
      });
    } catch (_) {
      // Ignore storage errors.
    }
  }

  SETTINGS_INPUTS.forEach((el) => el.addEventListener('change', saveSettings));

  // --- Status helpers ---

  function setStatus(msg, type = '') {
    statusEl.textContent = msg;
    statusEl.className   = 'status' + (type ? ' ' + type : '');
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    return (bytes / 1024).toFixed(1) + ' KB';
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
      maxDimension: Math.max(100,  parseInt(inputMaxDim.value,   10) || 1600),
      targetKB:     Math.max(10,   parseInt(inputTargetKB.value, 10) || 900),
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

      // 3. Optimize
      const result = await Optimizer.optimizeImage(bitmap, opts);

      // 4. Write back to clipboard
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
        ? ` ⚠ target ${opts.targetKB} KB not met at min quality`
        : '';

      setStatus(
        `✓ Done! Copied optimized image.\n` +
        dimLine +
        `Size: ${formatBytes(srcBytes)} → ${formatBytes(result.outBytes)}` +
        (saved > 0 ? ` (−${pct}% saved)` : '') + targetNote + `\n` +
        `Format: ${srcMime.replace('image/', '')} → ${result.format}`,
        'success'
      );
    } catch (err) {
      setStatus('✗ ' + (err.message || String(err)), 'error');
    } finally {
      if (bitmap) bitmap.close();
      setUIBusy(false);
    }
  });

  // --- Init ---
  loadSettings();
  setStatus('Ready. Copy an image then click Optimize.');
})();
