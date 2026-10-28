export const STICKERS_PER_PAGE = 16;
export function paginateStickers<T>(items: T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / STICKERS_PER_PAGE) }, (_, page) => items.slice(page * STICKERS_PER_PAGE, (page + 1) * STICKERS_PER_PAGE));
}
/** Fixed physical dimensions shared by field-label and legacy machine printing. */
export const QR_A4_CSS = `
@page { size: A4 portrait; margin: 10mm; }
.qr-a4-pages { width:190mm; margin:0 auto; }
.qr-a4-sheet { box-sizing:border-box; width:190mm; height:277mm; padding:0; margin:0 auto 24px; background:#fff; color:#172b20; display:grid; grid-template-rows:12mm minmax(0,1fr) 10mm; gap:3mm; box-shadow:0 4px 24px #203e2420; font-family:Arial,sans-serif; }
.qr-a4-header,.qr-a4-footer { display:flex; justify-content:space-between; align-items:center; gap:4mm; font-size:8pt; line-height:1.4; min-width:0; }
.qr-a4-header { border-bottom:0.3mm solid #aeb9b0; }
.qr-a4-header>div { min-width:0; flex:1; }
.qr-a4-header strong,.qr-a4-header small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.qr-a4-header small { font-size:7pt; margin-top:1mm; }
.qr-a4-footer { border-top:0.3mm solid #aeb9b0; font-size:7pt; }
.qr-a4-footer>strong { white-space:nowrap; }
.qr-a4-grid { min-height:0; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); grid-template-rows:repeat(4,minmax(0,1fr)); gap:3mm; }
.qr-a4-sticker { box-sizing:border-box; min-width:0; min-height:0; border:0.25mm dashed #8d9b90; border-radius:2mm; padding:2mm 1.5mm; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1.5mm; text-align:center; overflow:hidden; background:white; color:#172b20; break-inside:avoid; page-break-inside:avoid; }
.qr-a4-sticker>strong { font:bold 9pt Arial,sans-serif; display:flex; gap:1mm; align-items:center; }
.qr-a4-sticker>svg,.qr-a4-sticker>img { display:block; width:30mm; height:30mm; min-width:30mm; flex-shrink:0; background:white; }
.qr-a4-sticker .qr-a4-id { font:bold 7pt 'Courier New',monospace; overflow-wrap:anywhere; line-height:1.3; width:100%; }
.qr-a4-sticker small { font:6pt Arial,sans-serif; line-height:1.3; }
.qr-a4-empty { border-color:#e0e5e1; background:white; }
@media print {
 .qr-a4-pages { zoom:1!important; width:190mm!important; margin:0!important; padding:0!important; }
 .qr-a4-sheet { width:190mm!important; height:277mm!important; margin:0!important; box-shadow:none!important; break-inside:avoid; page-break-inside:avoid; break-after:page; page-break-after:always; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
 .qr-a4-sheet:last-child { break-after:auto; page-break-after:auto; }
}
`;
