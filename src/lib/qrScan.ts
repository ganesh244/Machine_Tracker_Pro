import jsQR from 'jsqr';
/** Shared pixel decoder for live camera frames and uploaded QR images. */
export function decodeQRImage(data: Uint8ClampedArray, width: number, height: number) {
  return jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })?.data || null;
}
