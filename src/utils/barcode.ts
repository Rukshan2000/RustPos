import JsBarcode from 'jsbarcode';

export interface LabelSize {
  name: string;
  width: number;  // mm
  height: number; // mm
}

export const LABEL_SIZES: LabelSize[] = [
  { name: '40mm × 30mm', width: 40, height: 30 },
  { name: '50mm × 25mm', width: 50, height: 25 },
  { name: '60mm × 40mm', width: 60, height: 40 },
];

export function renderBarcodeToCanvas(
  canvas: HTMLCanvasElement,
  value: string,
  options?: { width?: number; height?: number; displayValue?: boolean; fontSize?: number; margin?: number }
): boolean {
  try {
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: options?.width ?? 2,
      height: options?.height ?? 50,
      displayValue: options?.displayValue ?? false,
      fontSize: options?.fontSize ?? 12,
      margin: options?.margin ?? 0,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return true;
  } catch {
    return false;
  }
}

export function renderBarcodeToDataURL(
  value: string,
  options?: { width?: number; height?: number; displayValue?: boolean; fontSize?: number; margin?: number }
): string | null {
  const canvas = document.createElement('canvas');
  const ok = renderBarcodeToCanvas(canvas, value, options);
  return ok ? canvas.toDataURL('image/png') : null;
}

export interface LabelData {
  productName: string;
  barcode: string;
  price?: string;
  quantity: number; // number of labels for this product
}

/**
 * Generate a print-ready HTML string for barcode labels.
 */
export function generateLabelsHTML(
  labels: LabelData[],
  labelSize: LabelSize,
  showPrice: boolean
): string {
  const widthPx = labelSize.width * 3.78; // mm to px at 96dpi
  const heightPx = labelSize.height * 3.78;

  let labelsHtml = '';

  for (const label of labels) {
    const barcodeDataURL = renderBarcodeToDataURL(label.barcode, {
      width: 1.5,
      height: Math.min(30, labelSize.height * 0.4),
      margin: 0,
    });

    for (let i = 0; i < label.quantity; i++) {
      labelsHtml += `
        <div class="label" style="width:${widthPx}px;height:${heightPx}px;">
          <div class="label-name">${escapeHtml(label.productName)}</div>
          ${barcodeDataURL ? `<img class="label-barcode" src="${barcodeDataURL}" />` : ''}
          <div class="label-code">${escapeHtml(label.barcode)}</div>
          ${showPrice && label.price ? `<div class="label-price">${escapeHtml(label.price)}</div>` : ''}
        </div>`;
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Barcode Labels</title>
<style>
  @page {
    margin: 2mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Arial', sans-serif;
    display: flex;
    flex-wrap: wrap;
    gap: 1mm;
    padding: 1mm;
  }
  .label {
    border: 0.5px dashed #ccc;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5mm;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .label-name {
    font-size: ${Math.max(7, labelSize.width * 0.16)}px;
    font-weight: 700;
    text-align: center;
    line-height: 1.15;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 1px;
  }
  .label-barcode {
    max-width: 95%;
    height: auto;
    margin: 1px 0;
  }
  .label-code {
    font-size: ${Math.max(6, labelSize.width * 0.13)}px;
    font-family: monospace;
    letter-spacing: 0.5px;
  }
  .label-price {
    font-size: ${Math.max(7, labelSize.width * 0.15)}px;
    font-weight: 700;
    margin-top: 1px;
  }
  @media print {
    .label { border: none; }
  }
</style>
</head>
<body>${labelsHtml}</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
