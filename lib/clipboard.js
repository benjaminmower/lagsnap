/**
 * clipboard.js
 * Clipboard read/write helpers that must run inside a user-gesture context
 * (i.e., the popup page after a button click).
 * Exposed as: window.Clipboard
 */

'use strict';

(function (global) {
  /**
   * Read the first image item from the clipboard.
   * Returns { blob, mimeType } or throws if no image is found.
   * @returns {Promise<{ blob: Blob, mimeType: string }>}
   */
  async function readImage() {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      throw new Error('Clipboard API not available in this context.');
    }

    const items = await navigator.clipboard.read();

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
   * The Clipboard API only supports image/png for ClipboardItem writes
   * in most browsers; we convert JPEG blobs to PNG if necessary.
   * @param {Blob} blob
   * @returns {Promise<void>}
   */
  async function writeImage(blob) {
    if (!navigator.clipboard || !navigator.clipboard.write) {
      throw new Error('Clipboard write API not available in this context.');
    }

    // Chrome's ClipboardItem only accepts image/png for images.
    // If we have a JPEG, re-encode as PNG via canvas.
    let writeBlob = blob;
    if (blob.type !== 'image/png') {
      writeBlob = await convertToPng(blob);
    }

    const item = new ClipboardItem({ 'image/png': writeBlob });
    await navigator.clipboard.write([item]);
  }

  /**
   * Convert any image Blob to a PNG Blob via an HTMLCanvasElement.
   * @param {Blob} blob
   * @returns {Promise<Blob>}
   */
  async function convertToPng(blob) {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width  = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error(
          `Failed to convert image blob of type "${blob.type || 'unknown'}" to PNG for clipboard write.`,
        ))),
        'image/png',
      );
    });
  }

  // Expose
  global.Clipboard = { readImage, writeImage };
})(window);
