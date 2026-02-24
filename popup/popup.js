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

  // --- Persist & restore settings ---

  function loadSettings() {
    const saved = JSON.parse(localStorage.getItem('lagsnap-settings') || '{}');
    if (saved.maxDimension) inputMaxDim.value   = saved.maxDimension;
    if (saved.targetKB)     inputTargetKB.value = saved.targetKB;
    if (saved.format)       selectFormat.value  = saved.format;
  }

  function saveSettings() {
    const settings = {
      maxDimension: inputMaxDim.value,
      targetKB:     inputTargetKB.value,
      format:       selectFormat.value,
    };
    localStorage.setItem('lagsnap-settings', JSON.stringify(settings));
  }

  [inputMaxDim, inputTargetKB, selectFormat].forEach((el) =>
    el.addEventListener('change', saveSettings)
  );

  // --- Status helpers ---

  function setStatus(msg, type = '') {
    statusEl.textContent = msg;
    statusEl.className   = 'status' + (type ? ' ' + type : '');
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    return (bytes / 1024).toFixed(1) + ' KB';
  }

  // --- Main handler ---

  btnOptimize.addEventListener('click', async () => {
    btnOptimize.disabled = true;
    setStatus('Reading clipboard…', 'working');

    try {
      // 1. Read image from clipboard
      const { blob: srcBlob, mimeType: srcMime } = await Clipboard.readImage();
      const srcBytes = srcBlob.size;

      setStatus('Decoding image…', 'working');

      // 2. Decode to ImageBitmap
      const bitmap = await createImageBitmap(srcBlob);

      const opts = {
        maxDimension: parseInt(inputMaxDim.value,   10) || 1600,
        targetKB:     parseInt(inputTargetKB.value, 10) || 900,
        format:       selectFormat.value || 'auto',
      };

      setStatus('Optimizing…', 'working');

      // 3. Optimize
      const result = await Optimizer.optimizeImage(bitmap, opts);
      bitmap.close();

      // 4. Write back to clipboard
      setStatus('Writing to clipboard…', 'working');
      await Clipboard.writeImage(result.blob);

      // 5. Report success
      const saved   = srcBytes - result.outBytes;
      const pct     = srcBytes > 0
        ? Math.round((saved / srcBytes) * 100)
        : 0;

      const wasResized = result.srcW !== result.outW || result.srcH !== result.outH;
      const dimLine    = wasResized
        ? `Dimensions: ${result.srcW}×${result.srcH} → ${result.outW}×${result.outH}\n`
        : `Dimensions: ${result.srcW}×${result.srcH} (unchanged)\n`;

      setStatus(
        `✓ Done! Copied optimized image.\n` +
        dimLine +
        `Size: ${formatBytes(srcBytes)} → ${formatBytes(result.outBytes)}` +
        (saved > 0 ? ` (−${pct}% saved)` : '') + `\n` +
        `Format: ${srcMime.replace('image/', '')} → ${result.format}`,
        'success'
      );
    } catch (err) {
      setStatus('✗ ' + (err.message || String(err)), 'error');
    } finally {
      btnOptimize.disabled = false;
    }
  });

  // --- Init ---
  loadSettings();
  setStatus('Ready. Copy an image then click Optimize.');
})();
