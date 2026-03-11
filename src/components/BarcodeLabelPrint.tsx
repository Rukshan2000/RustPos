import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Product } from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';
import { LABEL_SIZES, LabelSize, renderBarcodeToCanvas, generateLabelsHTML, LabelData } from '../utils/barcode';
import jsPDF from 'jspdf';

interface BarcodeLabelPrintProps {
  products: { product: Product; quantity: number }[];
  onClose: () => void;
}

const BarcodeLabelPrint: React.FC<BarcodeLabelPrintProps> = ({ products, onClose }) => {
  const { currency } = useSettings();
  const { t } = useTranslation();
  const [labelSize, setLabelSize] = useState<LabelSize>(LABEL_SIZES[0]);
  const [showPrice, setShowPrice] = useState(true);
  const [quantities, setQuantities] = useState<Record<number, number>>(() => {
    const q: Record<number, number> = {};
    products.forEach(p => { q[p.product.id!] = p.quantity; });
    return q;
  });
  const previewRef = useRef<HTMLDivElement>(null);

  const updateQty = (id: number, val: number) => {
    setQuantities(prev => ({ ...prev, [id]: Math.max(1, val) }));
  };

  const labelData: LabelData[] = products.map(p => ({
    productName: p.product.name,
    barcode: p.product.barcode || '',
    price: showPrice ? `${currency}${p.product.price.toFixed(2)}` : undefined,
    quantity: quantities[p.product.id!] || 1,
  })).filter(l => l.barcode);

  const handlePrint = () => {
    const html = generateLabelsHTML(labelData, labelSize, showPrice);
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => { printWindow.print(); };
    }
  };

  const handleExportPDF = useCallback(() => {
    const pdf = new jsPDF({
      orientation: labelSize.width > labelSize.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [labelSize.width, labelSize.height],
    });

    let first = true;
    for (const label of labelData) {
      const canvas = document.createElement('canvas');
      renderBarcodeToCanvas(canvas, label.barcode, {
        width: 1.5,
        height: Math.min(25, labelSize.height * 0.35),
        margin: 0,
      });
      const barcodeImg = canvas.toDataURL('image/png');

      for (let i = 0; i < label.quantity; i++) {
        if (!first) pdf.addPage([labelSize.width, labelSize.height]);
        first = false;

        const cx = labelSize.width / 2;
        let y = 2;

        // Product name
        pdf.setFontSize(Math.max(6, labelSize.width * 0.16));
        pdf.setFont('helvetica', 'bold');
        pdf.text(label.productName, cx, y + 3, { align: 'center', maxWidth: labelSize.width - 4 });
        y += 5;

        // Barcode image
        const barcodeW = labelSize.width * 0.85;
        const barcodeH = labelSize.height * 0.35;
        pdf.addImage(barcodeImg, 'PNG', cx - barcodeW / 2, y, barcodeW, barcodeH);
        y += barcodeH + 1;

        // Barcode number
        pdf.setFontSize(Math.max(5, labelSize.width * 0.13));
        pdf.setFont('courier', 'normal');
        pdf.text(label.barcode, cx, y + 2, { align: 'center' });
        y += 3;

        // Price
        if (showPrice && label.price) {
          pdf.setFontSize(Math.max(6, labelSize.width * 0.15));
          pdf.setFont('helvetica', 'bold');
          pdf.text(label.price, cx, y + 2, { align: 'center' });
        }
      }
    }

    pdf.save('barcode-labels.pdf');
  }, [labelData, labelSize, showPrice]);

  return (
    <>
      <style>{`
        .blp-overlay {
          position: fixed;
          inset: 0;
          background: rgba(26,53,40,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 1.5rem;
          backdrop-filter: blur(2px);
        }
        .blp-card {
          background: #f5f0e8;
          border-radius: 1.5rem;
          padding: 2rem;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 24px 48px rgba(0,0,0,0.18);
          border: 1.5px solid #ddd8cc;
        }
        .blp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .blp-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #1a3528;
          margin: 0;
        }
        .blp-close {
          width: 32px; height: 32px; border-radius: 50%;
          background: #edeae0; border: none;
          display: flex; align-items: center; justify-content: center;
          color: #7a9e8a; cursor: pointer;
        }
        .blp-close:hover { background: #ddd8cc; color: #1a3528; }
        .blp-section { margin-bottom: 1.25rem; }
        .blp-label {
          font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: #7a9e8a; margin-bottom: 0.4rem;
        }
        .blp-row { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
        .blp-select {
          padding: 0.55rem 0.75rem; background: #edeae0; border: 1.5px solid #ddd8cc;
          border-radius: 0.625rem; font-family: 'Nunito', sans-serif; font-size: 0.85rem;
          color: #1a3528; outline: none; cursor: pointer;
        }
        .blp-select:focus { border-color: #2d5a3d; }
        .blp-toggle-label {
          display: flex; align-items: center; gap: 0.5rem; cursor: pointer;
          font-size: 0.85rem; font-weight: 600; color: #1a3528; user-select: none;
        }
        .blp-toggle-track {
          width: 36px; height: 18px; border-radius: 9px;
          position: relative; transition: background 0.2s; flex-shrink: 0;
        }
        .blp-toggle-thumb {
          position: absolute; width: 14px; height: 14px; background: white;
          border-radius: 50%; top: 2px; transition: left 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .blp-product-list {
          background: #edeae0; border: 1.5px solid #ddd8cc; border-radius: 0.875rem;
          padding: 0.75rem; margin-bottom: 1.25rem;
        }
        .blp-product-item {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.5rem 0; border-bottom: 1px solid #e8e4d8;
        }
        .blp-product-item:last-child { border-bottom: none; }
        .blp-product-name {
          flex: 1; font-weight: 700; font-size: 0.85rem; color: #1a3528;
        }
        .blp-product-bc {
          font-size: 0.72rem; color: #7a9e8a; font-family: monospace;
        }
        .blp-qty-input {
          width: 60px; padding: 0.35rem 0.5rem; background: #f5f0e8;
          border: 1.5px solid #ddd8cc; border-radius: 0.5rem;
          font-family: 'Nunito', sans-serif; font-size: 0.85rem; font-weight: 700;
          color: #1a3528; outline: none; text-align: center;
        }
        .blp-qty-input:focus { border-color: #2d5a3d; }
        .blp-preview {
          background: white; border: 1.5px solid #ddd8cc; border-radius: 0.875rem;
          padding: 1rem; margin-bottom: 1.25rem; display: flex; flex-wrap: wrap;
          gap: 4px; justify-content: center; min-height: 100px;
        }
        .blp-label-card {
          border: 0.5px dashed #ccc; display: flex; flex-direction: column;
          align-items: center; justify-content: center; padding: 2px;
          overflow: hidden;
        }
        .blp-label-card-name {
          font-weight: 700; text-align: center; line-height: 1.1;
          max-width: 100%; overflow: hidden; text-overflow: ellipsis;
          white-space: nowrap;
        }
        .blp-label-card-code {
          font-family: monospace; letter-spacing: 0.5px;
        }
        .blp-label-card-price { font-weight: 700; }
        .blp-actions { display: flex; gap: 0.75rem; }
        .blp-btn {
          flex: 1; padding: 0.75rem; border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif; font-size: 0.9rem; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
          transition: all 0.12s;
        }
        .blp-btn-secondary {
          background: transparent; border: 1.5px solid #ddd8cc; color: #7a9e8a;
        }
        .blp-btn-secondary:hover { background: #edeae0; color: #1a3528; }
        .blp-btn-primary {
          background: #2d5a3d; border: none; color: #e8f4ec; font-weight: 800;
          box-shadow: 0 3px 10px rgba(45,90,61,0.25);
        }
        .blp-btn-primary:hover { background: #245033; }
        .blp-btn-pdf {
          background: #5a4a3a; border: none; color: #f5f0e8; font-weight: 800;
          box-shadow: 0 3px 10px rgba(90,74,58,0.25);
        }
        .blp-btn-pdf:hover { background: #4a3a2a; }
      `}</style>

      <div className="blp-overlay">
        <div className="blp-card">
          <div className="blp-header">
            <h2 className="blp-title">{t('print_barcode_labels')}</h2>
            <button className="blp-close" onClick={onClose}><X size={16} /></button>
          </div>

          {/* Settings row */}
          <div className="blp-section">
            <div className="blp-row">
              <div>
                <div className="blp-label">{t('label_size')}</div>
                <select
                  className="blp-select"
                  value={`${labelSize.width}x${labelSize.height}`}
                  onChange={e => {
                    const [w, h] = e.target.value.split('x').map(Number);
                    setLabelSize(LABEL_SIZES.find(l => l.width === w && l.height === h) || LABEL_SIZES[0]);
                  }}
                >
                  {LABEL_SIZES.map(s => (
                    <option key={s.name} value={`${s.width}x${s.height}`}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ paddingTop: '1.2rem' }}>
                <label className="blp-toggle-label" onClick={() => setShowPrice(v => !v)}>
                  <div className="blp-toggle-track" style={{ background: showPrice ? '#2d5a3d' : '#ddd8cc' }}>
                    <div className="blp-toggle-thumb" style={{ left: showPrice ? '20px' : '2px' }} />
                  </div>
                  <span>{t('show_price')}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Products list with quantity inputs */}
          <div className="blp-section">
            <div className="blp-label">{t('products')} & {t('label_qty')}</div>
            <div className="blp-product-list">
              {products.map(({ product }) => (
                <div key={product.id} className="blp-product-item">
                  <div className="blp-product-name">
                    {product.name}
                    <div className="blp-product-bc">{product.barcode || t('no_barcode')}</div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    className="blp-qty-input"
                    value={quantities[product.id!]}
                    onChange={e => updateQty(product.id!, parseInt(e.target.value) || 1)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="blp-section">
            <div className="blp-label">{t('preview')}</div>
            <div className="blp-preview" ref={previewRef}>
              {labelData.map((label, idx) => (
                Array.from({ length: Math.min(label.quantity, 3) }).map((_, i) => (
                  <PreviewLabel
                    key={`${idx}-${i}`}
                    label={label}
                    labelSize={labelSize}
                    showPrice={showPrice}
                  />
                ))
              ))}
              {labelData.reduce((a, l) => a + l.quantity, 0) > labelData.length * 3 && (
                <div style={{ width: '100%', textAlign: 'center', color: '#7a9e8a', fontSize: '0.75rem', padding: '0.5rem' }}>
                  ... {t('and_more_labels', { count: labelData.reduce((a, l) => a + l.quantity, 0) })}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="blp-actions">
            <button className="blp-btn blp-btn-secondary" onClick={onClose}>{t('cancel')}</button>
            <button className="blp-btn blp-btn-pdf" onClick={handleExportPDF}><Download size={16} /> {t('export_pdf')}</button>
            <button className="blp-btn blp-btn-primary" onClick={handlePrint}><Printer size={16} /> {t('print')}</button>
          </div>
        </div>
      </div>
    </>
  );
};

const PreviewLabel: React.FC<{ label: LabelData; labelSize: LabelSize; showPrice: boolean }> = ({ label, labelSize, showPrice }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scale = 2.5; // preview scale factor

  useEffect(() => {
    if (canvasRef.current && label.barcode) {
      renderBarcodeToCanvas(canvasRef.current, label.barcode, {
        width: 1,
        height: Math.min(20, labelSize.height * 0.3 * scale),
        margin: 0,
      });
    }
  }, [label.barcode, labelSize]);

  return (
    <div
      className="blp-label-card"
      style={{
        width: `${labelSize.width * scale}px`,
        height: `${labelSize.height * scale}px`,
      }}
    >
      <div className="blp-label-card-name" style={{ fontSize: `${Math.max(6, labelSize.width * 0.14 * scale * 0.4)}px` }}>
        {label.productName}
      </div>
      <canvas ref={canvasRef} style={{ maxWidth: '90%', height: 'auto' }} />
      <div className="blp-label-card-code" style={{ fontSize: `${Math.max(5, labelSize.width * 0.1 * scale * 0.4)}px` }}>
        {label.barcode}
      </div>
      {showPrice && label.price && (
        <div className="blp-label-card-price" style={{ fontSize: `${Math.max(6, labelSize.width * 0.12 * scale * 0.4)}px` }}>
          {label.price}
        </div>
      )}
    </div>
  );
};

export default BarcodeLabelPrint;
