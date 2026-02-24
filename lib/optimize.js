/**
 * optimize.js
 * Core image optimization logic.
 * Exposed as: window.Optimizer
 */

'use strict';

(function (global) {

  /**
   * Scale dimensions so the long edge does not exceed maxDim.
   */
  function scaledDimensions(w, h, maxDim) {
    const long = Math.max(w, h);
    if (long <= maxDim) return { w, h };

    const ratio = maxDim / long;
    return {
      w: Math.max(1, Math.round(w * ratio)),
      h: Math.max(1, Math.round(h * ratio))
    };
  }

  /**
   * Efficient transparency detection via downsampling.
   * Avoids full-size pixel scan.
   */
  function hasTransparencyDownsampled(sourceCanvas, w, h) {
    const sampleW = Math.min(64, w);
    const sampleH = Math.min(64, h);

    const tmp = document.createElement('canvas');
    tmp.width = sampleW;
    tmp.height = sampleH;

    const tctx = tmp.getContext('2d', { willReadFrequently: true });
    tctx.drawImage(sourceCanvas, 0, 0, w, h, 0, 0, sampleW, sampleH);

    const data = tctx.getImageData(0, 0, sampleW, sampleH).data;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  }

  /**
   * Encode a canvas to Blob (supports OffscreenCanvas + HTMLCanvasElement)
   */
  function encodeCanvas(canvas, type, quality) {
    if (typeof canvas.convertToBlob === 'function') {
      return canvas.convertToBlob({ type, quality });
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null'))),
        type,
        quality
      );
    });
  }

  /**
   * JPEG encode loop with smarter quality stepping.
   */
  async function encodeJpeg(canvas, targetKB) {
    const targetBytes = targetKB * 1024;
    let quality = 0.88;
    let blob = await encodeCanvas(canvas, 'image/jpeg', quality);

    while (blob.size > targetBytes && quality > 0.70) {
      quality = Math.max(0.70, quality - 0.06);
      blob = await encodeCanvas(canvas, 'image/jpeg', quality);
    }

    return {
      blob,
      targetMet: blob.size <= targetBytes,
      finalQuality: quality
    };
  }

  /**
   * Main optimization function.
   *
   * @param {ImageBitmap} bitmap
   * @param {object} opts
   */
  async function optimizeImage(bitmap, opts = {}) {

    const maxDimension = opts.maxDimension ?? 1600;
    const targetKB     = opts.targetKB ?? 900;
    const formatPref   = opts.format ?? 'auto';

    const srcW = bitmap.width;
    const srcH = bitmap.height;

    // Scale dimensions
    const { w: outW, h: outH } = scaledDimensions(srcW, srcH, maxDimension);

    // Create canvas
    let canvas;
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(outW, outH);
    } else {
      canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
    }

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, outW, outH);

    // Transparency detection (only if auto mode)
    let transparent = false;
    if (formatPref === 'auto') {
      transparent = hasTransparencyDownsampled(canvas, outW, outH);
    }

    const useJpeg =
      formatPref === 'jpeg' ||
      (formatPref === 'auto' && !transparent);

    let blob;
    let targetMet = true;
    let finalQuality = null;

    if (useJpeg) {
      const result = await encodeJpeg(canvas, targetKB);
      blob = result.blob;
      targetMet = result.targetMet;
      finalQuality = result.finalQuality;
    } else {
      blob = await encodeCanvas(canvas, 'image/png', 1.0);
    }

    // Clean up bitmap memory
    if (bitmap.close) {
      bitmap.close();
    }

    return {
      blob,
      format: useJpeg ? 'jpeg' : 'png',
      targetMet,
      finalQuality,
      srcW,
      srcH,
      outW,
      outH,
      outBytes: blob.size
    };
  }

  global.Optimizer = { optimizeImage };

})(window);
