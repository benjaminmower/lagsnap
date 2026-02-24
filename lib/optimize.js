/**
 * optimize.js
 * Core image optimization logic.
 * Exposed as a plain object: window.Optimizer
 */

'use strict';

(function (global) {
  /**
   * Detect whether an ImageData has any non-opaque pixels.
   * @param {ImageData} imageData
   * @returns {boolean}
   */
  function hasTransparency(imageData) {
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  }

  /**
   * Scale dimensions so the long edge does not exceed maxDim.
   * Returns the original dimensions if already within limits.
   * @param {number} w
   * @param {number} h
   * @param {number} maxDim
   * @returns {{ w: number, h: number }}
   */
  function scaledDimensions(w, h, maxDim) {
    const long = Math.max(w, h);
    if (long <= maxDim) return { w, h };
    const ratio = maxDim / long;
    // Math.max(1, ...) guards against 0-dimension output on extreme aspect ratios
    // (e.g., a 10000×1 image scaled to maxDim=100 would produce 100×0 without it).
    return { w: Math.max(1, Math.round(w * ratio)), h: Math.max(1, Math.round(h * ratio)) };
  }

  /**
   * Encode an ImageBitmap to a Blob meeting the size target.
   *
   * @param {ImageBitmap} bitmap   - Source image
   * @param {object}      opts
   * @param {number}      opts.maxDimension  - Max long-edge pixels (default 1600)
   * @param {number}      opts.targetKB      - Target max file size in KB (default 900)
   * @param {'auto'|'jpeg'|'png'} opts.format - Output format (default 'auto')
   * @returns {Promise<{
   *   blob: Blob,
   *   format: string,
   *   targetMet: boolean,
   *   srcW: number, srcH: number,
   *   outW: number, outH: number,
   *   outBytes: number
   * }>}
   */
  async function optimizeImage(bitmap, opts = {}) {
    const maxDimension = opts.maxDimension ?? 1600;
    const targetKB     = opts.targetKB     ?? 900;
    const formatPref   = opts.format       ?? 'auto';

    const srcW = bitmap.width;
    const srcH = bitmap.height;

    // --- Determine output canvas size ---
    const { w: outW, h: outH } = scaledDimensions(srcW, srcH, maxDimension);

    // --- Draw onto canvas ---
    let canvas;
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(outW, outH);
    } else {
      canvas = document.createElement('canvas');
      canvas.width  = outW;
      canvas.height = outH;
    }

    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, outW, outH);

    // --- Detect transparency (needed for 'auto' format decision) ---
    let transparent = false;
    if (formatPref === 'auto') {
      const imageData = ctx.getImageData(0, 0, outW, outH);
      transparent = hasTransparency(imageData);
    }

    // --- Decide format ---
    const useJpeg = formatPref === 'jpeg' || (formatPref === 'auto' && !transparent);

    // --- Encode (JPEG: quality loop; PNG: single pass) ---
    let blob;
    let targetMet = true;

    if (useJpeg) {
      ({ blob, targetMet } = await encodeJpeg(canvas, targetKB));
    } else {
      blob = await encodeCanvas(canvas, 'image/png', 1.0);
    }

    return {
      blob,
      format: useJpeg ? 'jpeg' : 'png',
      targetMet,
      srcW,
      srcH,
      outW,
      outH,
      outBytes: blob.size,
    };
  }

  /**
   * Encode canvas as JPEG, stepping quality down until the result
   * is at or below targetKB (or quality hits 0.30, whichever comes first).
   * @param {HTMLCanvasElement|OffscreenCanvas} canvas
   * @param {number} targetKB
   * @returns {Promise<{ blob: Blob, targetMet: boolean }>}
   */
  async function encodeJpeg(canvas, targetKB) {
    const targetBytes = targetKB * 1024;
    let quality = 0.92;
    let blob = await encodeCanvas(canvas, 'image/jpeg', quality);

    while (blob.size > targetBytes && quality > 0.30) {
      quality = Math.max(0.30, quality - 0.08);
      blob = await encodeCanvas(canvas, 'image/jpeg', quality);
    }

    return { blob, targetMet: blob.size <= targetBytes };
  }

  /**
   * Encode a canvas to a Blob.
   * Supports both OffscreenCanvas (convertToBlob) and HTMLCanvasElement (toBlob).
   * @param {HTMLCanvasElement|OffscreenCanvas} canvas
   * @param {string} type
   * @param {number} quality
   * @returns {Promise<Blob>}
   */
  function encodeCanvas(canvas, type, quality) {
    if (typeof canvas.convertToBlob === 'function') {
      return canvas.convertToBlob({ type, quality });
    }
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null'))),
        type,
        quality,
      );
    });
  }

  // Expose
  global.Optimizer = { optimizeImage };
})(window);
