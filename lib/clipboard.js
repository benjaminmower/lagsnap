/**
 * clipboard.js
 * Clipboard read/write helpers.
 * Must be called from a user-gesture context (popup button click).
 * Exposed as: window.Clipboard
 */

'use strict';

(function (global) {

  /**
   * Read the first image from the clipboard.
   * Supports image/png and image/jpeg.
   * @returns {Promise<{ blob: Blob, mimeType: string }>}
   */
  async function readImage() {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      throw new Error('Clipboard API not available. Make sure you are in the extension popup.');
    }

    let items;

    try {
      items = await navigator.clipboard.read();
    } catch (err) {
      throw new Error(
        'Failed to read clipboard. Ensure you clicked the button (user gesture required).'
      );
    }

    for (const item of items) {
      for (const type of item.types) {
        if (type === 'image/png' || type === 'image/jpeg') {
          const blob = await item.getType(type);
          return { blob, mimeType: type };
        }
      }
    }

    throw new Error('No image found on clipboard. Copy an image first.');
  }

  /**
   * Write an image Blob to the clipboard.
   * Preserves original mime type (JPEG stays JPEG).
   * Safari compatibility: wrap blob in Promise.resolve().
   *
   * @param {Blob} blob
   * @returns {Promise<void>}
   */
  async function writeImage(blob) {
    if (!navigator.clipboard || !navigator.clipboard.write) {
      throw new Error('Clipboard write API not available in this context.');
    }

    const mime = blob.type || 'image/png';

    try {
      const item = new ClipboardItem({
        [mime]: Promise.resolve(blob) // Safari-safe
      });

      await navigator.clipboard.write([item]);
    } catch (err) {
      throw new Error(
        'Failed to write image to clipboard. Clipboard permissions may be blocked.'
      );
    }
  }

  /**
   * Format byte counts for UI display.
   * @param {number} bytes
   * @returns {string}
   */
  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  global.Clipboard = {
    readImage,
    writeImage,
    formatBytes
  };

})(window);
