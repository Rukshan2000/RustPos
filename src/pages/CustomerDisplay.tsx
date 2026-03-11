import React, { useState, useEffect, useRef } from 'react';
import type { CustomerDisplayData } from '../contexts/CustomerDisplayContext';

const CHANNEL_NAME = 'nyxopos-customer-display';

const CustomerDisplay: React.FC = () => {
  const [data, setData] = useState<CustomerDisplayData>({
    type: 'idle',
    items: [],
    rawSubtotal: 0,
    totalProductDiscount: 0,
    billDiscount: 0,
    finalTotal: 0,
    currency: '$',
    shopName: 'NyxoPos',
    logoUrl: null,
    footerText: null,
  });
  const [showThankYou, setShowThankYou] = useState(false);
  const thankYouTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<CustomerDisplayData>) => {
      const msg = event.data;
      if (msg.type === 'sale-complete') {
        setData(msg);
        setShowThankYou(true);
        if (thankYouTimer.current) clearTimeout(thankYouTimer.current);
        thankYouTimer.current = setTimeout(() => {
          setShowThankYou(false);
          setData(prev => ({ ...prev, type: 'idle', items: [], rawSubtotal: 0, totalProductDiscount: 0, billDiscount: 0, finalTotal: 0 }));
        }, 8000);
      } else {
        setShowThankYou(false);
        if (thankYouTimer.current) clearTimeout(thankYouTimer.current);
        setData(msg);
      }
    };
    return () => {
      channel.close();
      if (thankYouTimer.current) clearTimeout(thankYouTimer.current);
    };
  }, []);

  const { currency, shopName, logoUrl, footerText, items, rawSubtotal, totalProductDiscount, billDiscount, finalTotal } = data;

  const calcItemSubtotal = (item: CustomerDisplayData['items'][0]) => {
    const total = item.price * item.quantity;
    const disc = item.discountType === 'percentage' ? (total * item.discountValue / 100) : item.discountValue;
    return total - disc;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body, html, #root {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #0a1f14;
          font-family: 'Nunito', sans-serif;
        }

        .cd-root {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(170deg, #0a1f14 0%, #132e1f 40%, #0a1f14 100%);
          color: #e8f4ec;
          overflow: hidden;
          user-select: none;
          cursor: default;
        }

        /* Header */
        .cd-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.25rem;
          padding: 2rem 2.5rem 1.5rem;
          flex-shrink: 0;
        }

        .cd-logo {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(168, 212, 184, 0.3);
        }

        .cd-logo-placeholder {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(45, 90, 61, 0.5);
          border: 3px solid rgba(168, 212, 184, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: 900;
          color: #a8d4b8;
        }

        .cd-shop-name {
          font-size: 2rem;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: #e8f4ec;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        /* Divider */
        .cd-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(168,212,184,0.25) 30%, rgba(168,212,184,0.25) 70%, transparent 100%);
          margin: 0 3rem;
          flex-shrink: 0;
        }

        /* Items area */
        .cd-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 1.5rem 3rem;
          min-height: 0;
        }

        /* Table header */
        .cd-table-header {
          display: grid;
          grid-template-columns: 1fr 100px 120px 140px;
          gap: 1rem;
          padding: 0.75rem 1.25rem;
          background: rgba(45, 90, 61, 0.3);
          border-radius: 0.75rem;
          margin-bottom: 0.75rem;
          flex-shrink: 0;
        }

        .cd-th {
          font-size: 0.85rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #7aaa8e;
        }

        .cd-th-right {
          text-align: right;
        }

        .cd-th-center {
          text-align: center;
        }

        /* Items list */
        .cd-items {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
          scrollbar-width: thin;
          scrollbar-color: rgba(168,212,184,0.2) transparent;
        }

        .cd-items::-webkit-scrollbar { width: 4px; }
        .cd-items::-webkit-scrollbar-track { background: transparent; }
        .cd-items::-webkit-scrollbar-thumb { background: rgba(168,212,184,0.2); border-radius: 4px; }

        .cd-item-row {
          display: grid;
          grid-template-columns: 1fr 100px 120px 140px;
          gap: 1rem;
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid rgba(168,212,184,0.08);
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .cd-item-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: #e8f4ec;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cd-item-discount {
          font-size: 0.75rem;
          color: #e8a87c;
          margin-top: 0.15rem;
        }

        .cd-item-qty {
          font-size: 1.1rem;
          font-weight: 700;
          color: #a8d4b8;
          text-align: center;
          align-self: center;
        }

        .cd-item-price {
          font-size: 1.05rem;
          font-weight: 600;
          color: #c8ddd0;
          text-align: right;
          align-self: center;
        }

        .cd-item-subtotal {
          font-size: 1.1rem;
          font-weight: 800;
          color: #e8f4ec;
          text-align: right;
          align-self: center;
        }

        /* Idle message */
        .cd-idle {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          text-align: center;
        }

        .cd-idle-welcome {
          font-size: 2.5rem;
          font-weight: 900;
          color: #e8f4ec;
          letter-spacing: -0.02em;
        }

        .cd-idle-sub {
          font-size: 1.25rem;
          color: #7aaa8e;
          font-weight: 600;
          max-width: 500px;
          line-height: 1.6;
        }

        .cd-idle-promo {
          margin-top: 1rem;
          padding: 1.25rem 2.5rem;
          background: rgba(45, 90, 61, 0.25);
          border: 1px solid rgba(168,212,184,0.15);
          border-radius: 1rem;
          font-size: 1rem;
          color: #a8d4b8;
          font-weight: 600;
          font-style: italic;
        }

        /* Footer / Totals */
        .cd-footer {
          flex-shrink: 0;
          padding: 0 3rem 2rem;
        }

        .cd-totals-box {
          background: rgba(45, 90, 61, 0.25);
          border: 1px solid rgba(168,212,184,0.15);
          border-radius: 1.25rem;
          padding: 1.5rem 2rem;
        }

        .cd-totals-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.35rem 0;
        }

        .cd-totals-label {
          font-size: 1rem;
          color: #7aaa8e;
          font-weight: 600;
        }

        .cd-totals-value {
          font-size: 1.1rem;
          color: #c8ddd0;
          font-weight: 700;
        }

        .cd-totals-discount {
          color: #e8a87c;
        }

        .cd-totals-grand {
          margin-top: 0.5rem;
          padding-top: 0.75rem;
          border-top: 2px solid rgba(168,212,184,0.2);
        }

        .cd-totals-grand .cd-totals-label {
          font-size: 1.5rem;
          font-weight: 900;
          color: #e8f4ec;
        }

        .cd-totals-grand .cd-totals-value {
          font-size: 2.25rem;
          font-weight: 900;
          color: #a8d4b8;
          letter-spacing: -0.02em;
        }

        /* Thank You overlay */
        .cd-thankyou {
          position: fixed;
          inset: 0;
          background: linear-gradient(170deg, #0a1f14 0%, #1a3d28 40%, #0a1f14 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          z-index: 10;
          animation: thankFadeIn 0.5s ease;
        }

        @keyframes thankFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .cd-thankyou-check {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: rgba(45, 90, 61, 0.5);
          border: 3px solid #a8d4b8;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: thankPop 0.5s ease 0.2s both;
        }

        @keyframes thankPop {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .cd-thankyou-check svg {
          color: #a8d4b8;
        }

        .cd-thankyou-text {
          font-size: 3rem;
          font-weight: 900;
          color: #e8f4ec;
          text-align: center;
          letter-spacing: -0.02em;
        }

        .cd-thankyou-total {
          font-size: 1.5rem;
          color: #a8d4b8;
          font-weight: 700;
        }

        .cd-thankyou-footer {
          font-size: 1.1rem;
          color: #7aaa8e;
          font-weight: 600;
          font-style: italic;
          max-width: 500px;
          text-align: center;
        }

        /* Empty cart */
        .cd-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #5a8a6e;
          gap: 0.75rem;
        }

        .cd-empty-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(45, 90, 61, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cd-empty-text {
          font-size: 1.25rem;
          font-weight: 700;
        }
      `}</style>

      <div className="cd-root">
        {/* Header with logo and shop name */}
        <div className="cd-header">
          {logoUrl
            ? <img src={logoUrl} alt="Logo" className="cd-logo" />
            : <div className="cd-logo-placeholder">{shopName?.[0] || 'N'}</div>
          }
          <div className="cd-shop-name">{shopName || 'NyxoPos'}</div>
        </div>

        <div className="cd-divider" />

        {/* Idle state */}
        {data.type === 'idle' && !showThankYou && (
          <div className="cd-idle">
            <div className="cd-idle-welcome">Welcome!</div>
            <div className="cd-idle-sub">
              We're ready to serve you. Please present your items to the cashier.
            </div>
            {footerText && (
              <div className="cd-idle-promo">{footerText}</div>
            )}
          </div>
        )}

        {/* Active cart */}
        {data.type === 'cart-update' && items.length > 0 && !showThankYou && (
          <>
            <div className="cd-body">
              <div className="cd-table-header">
                <div className="cd-th">Product</div>
                <div className="cd-th cd-th-center">Qty</div>
                <div className="cd-th cd-th-right">Price</div>
                <div className="cd-th cd-th-right">Subtotal</div>
              </div>
              <div className="cd-items">
                {items.map((item, idx) => (
                  <div key={idx} className="cd-item-row">
                    <div>
                      <div className="cd-item-name">{item.name}</div>
                      {item.discountValue > 0 && (
                        <div className="cd-item-discount">
                          Discount: {item.discountType === 'percentage' ? `${item.discountValue}%` : `${currency}${item.discountValue.toFixed(2)}`}
                        </div>
                      )}
                    </div>
                    <div className="cd-item-qty">{item.quantity}</div>
                    <div className="cd-item-price">{currency}{item.price.toFixed(2)}</div>
                    <div className="cd-item-subtotal">{currency}{calcItemSubtotal(item).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="cd-footer">
              <div className="cd-totals-box">
                <div className="cd-totals-row">
                  <span className="cd-totals-label">Items Total</span>
                  <span className="cd-totals-value">{currency}{rawSubtotal.toFixed(2)}</span>
                </div>
                {totalProductDiscount > 0 && (
                  <div className="cd-totals-row">
                    <span className="cd-totals-label cd-totals-discount">Product Discounts</span>
                    <span className="cd-totals-value cd-totals-discount">-{currency}{totalProductDiscount.toFixed(2)}</span>
                  </div>
                )}
                {billDiscount > 0 && (
                  <div className="cd-totals-row">
                    <span className="cd-totals-label cd-totals-discount">Bill Discount</span>
                    <span className="cd-totals-value cd-totals-discount">-{currency}{billDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="cd-totals-row cd-totals-grand">
                  <span className="cd-totals-label">Total</span>
                  <span className="cd-totals-value">{currency}{finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Cart update with empty items */}
        {data.type === 'cart-update' && items.length === 0 && !showThankYou && (
          <div className="cd-empty">
            <div className="cd-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
              </svg>
            </div>
            <div className="cd-empty-text">Waiting for items...</div>
          </div>
        )}

        {/* Thank you overlay */}
        {showThankYou && (
          <div className="cd-thankyou">
            <div className="cd-thankyou-check">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="cd-thankyou-text">Thank You!</div>
            <div className="cd-thankyou-total">Total: {currency}{finalTotal.toFixed(2)}</div>
            {footerText && <div className="cd-thankyou-footer">{footerText}</div>}
          </div>
        )}
      </div>
    </>
  );
};

export default CustomerDisplay;
