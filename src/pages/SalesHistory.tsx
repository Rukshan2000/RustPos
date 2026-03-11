import React, { useState, useEffect } from 'react';
import { Eye, Printer, Search, Calendar, X } from 'lucide-react';
import { api, Sale, SaleWithItems, formatQtyUnit } from '../api';
import { useSettings } from '../contexts/SettingsContext';

const SalesHistory: React.FC = () => {
  const { currency } = useSettings();
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null);

  useEffect(() => { loadSales(); }, [startDate, endDate]);

  const loadSales = async () => {
    const data = await api.getSalesHistory(startDate || undefined, endDate || undefined);
    setSales(data);
  };

  const viewDetails = async (id: number) => {
    const details = await api.getSaleDetails(id);
    setSelectedSale(details);
  };

  const filtered = sales.filter(s =>
    s.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    s.id?.toString().includes(search)
  );

  return (
    <>
      <style>{`
        

        .sh-root {
          font-family: 'Nunito', sans-serif;
          animation: fadeIn 0.25s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .sh-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: #1a3528;
          letter-spacing: -0.02em;
          margin: 0 0 1.75rem;
        }

        /* Filter row */
        .sh-filter-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }

        .sh-search-box {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.875rem;
          padding: 0.7rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .sh-search-input {
          border: none;
          flex: 1;
          background: transparent;
          font-family: 'Nunito', sans-serif;
          font-size: 0.9rem;
          color: #1a3528;
          outline: none;
        }

        .sh-search-input::placeholder { color: #b0a898; }

        .sh-date-box {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.875rem;
          padding: 0.7rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          white-space: nowrap;
        }

        .sh-date-input {
          border: none;
          background: transparent;
          font-family: 'Nunito', sans-serif;
          font-size: 0.875rem;
          color: #1a3528;
          outline: none;
          cursor: pointer;
        }

        .sh-date-sep {
          color: #b0a898;
          font-size: 0.8rem;
          font-weight: 600;
        }

        /* Table */
        .sh-table-wrap {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 1.125rem;
          overflow: hidden;
        }

        .sh-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .sh-table thead tr {
          background: #edeae0;
          border-bottom: 1.5px solid #ddd8cc;
        }

        .sh-table th {
          padding: 0.75rem 1.1rem;
          text-align: left;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #7a9e8a;
        }

        .sh-table tbody tr {
          border-bottom: 1px solid #e8e4d8;
          transition: background 0.1s;
        }

        .sh-table tbody tr:last-child { border-bottom: none; }
        .sh-table tbody tr:hover { background: #edeae0; }

        .sh-table td {
          padding: 0.8rem 1.1rem;
          vertical-align: middle;
        }

        .sh-invoice {
          font-weight: 800;
          color: #2d5a3d;
          font-size: 0.875rem;
        }

        .sh-date-cell {
          color: #7a9e8a;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .sh-total {
          font-weight: 700;
          color: #1a3528;
        }

        .badge-cash {
          display: inline-block;
          background: #e6ede8;
          color: #2d5a3d;
          border-radius: 0.4rem;
          padding: 0.2rem 0.65rem;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .badge-card {
          display: inline-block;
          background: #edeae0;
          color: #5a7a6a;
          border-radius: 0.4rem;
          padding: 0.2rem 0.65rem;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .sh-details-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          background: #edeae0;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.5rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          color: #5a7a6a;
          cursor: pointer;
          transition: background 0.1s, border-color 0.1s;
        }

        .sh-details-btn:hover { background: #e6ede8; border-color: #2d5a3d; color: #2d5a3d; }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(26,53,40,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1.5rem;
          backdrop-filter: blur(2px);
        }

        .modal-card {
          background: #f5f0e8;
          border-radius: 1.5rem;
          padding: 2rem;
          width: 100%;
          max-width: 420px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 24px 48px rgba(0,0,0,0.18);
          border: 1.5px solid #ddd8cc;
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .modal-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: #1a3528;
          margin: 0 0 0.2rem;
        }

        .modal-invoice-sub {
          font-size: 0.8rem;
          color: #7a9e8a;
          font-weight: 600;
          margin: 0;
        }

        .modal-close {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #edeae0;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7a9e8a;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.12s;
        }

        .modal-close:hover { background: #ddd8cc; color: #1a3528; }

        .modal-info-box {
          background: #edeae0;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.875rem;
          padding: 1rem 1.1rem;
          margin-bottom: 1.5rem;
        }

        .modal-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
          margin-bottom: 0.45rem;
          color: #5a7a6a;
          font-weight: 500;
        }

        .modal-info-row:last-child { margin-bottom: 0; }

        .modal-info-val {
          font-weight: 700;
          color: #1a3528;
        }

        .modal-info-val-green { color: #2d5a3d; }

        .modal-items-label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #7a9e8a;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #ddd8cc;
        }

        .modal-item {
          margin-bottom: 0.6rem;
        }

        .modal-item-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          font-size: 0.875rem;
        }

        .modal-item-name { font-weight: 700; color: #1a3528; }
        .modal-item-meta { font-size: 0.72rem; color: #7a9e8a; margin-top: 0.1rem; }
        .modal-item-total { font-weight: 700; color: #1a3528; }

        .modal-item-disc {
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          color: #c05050;
          font-style: italic;
          padding-left: 0.4rem;
          margin-top: 0.1rem;
        }

        .modal-totals {
          padding-top: 1rem;
          border-top: 2px dashed #ddd8cc;
          margin-top: 1rem;
        }

        .modal-totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: #7a9e8a;
          margin-bottom: 0.4rem;
          font-weight: 600;
        }

        .modal-totals-disc { color: #c05050; }

        .modal-totals-final {
          display: flex;
          justify-content: space-between;
          font-size: 1.35rem;
          font-weight: 800;
          color: #1a3528;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1.5px solid #ddd8cc;
        }

        .modal-total-val { color: #2d5a3d; }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.75rem;
        }

        .modal-btn-close {
          flex: 1;
          padding: 0.8rem;
          background: transparent;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          color: #7a9e8a;
          cursor: pointer;
          transition: background 0.12s;
        }

        .modal-btn-close:hover { background: #edeae0; }

        .modal-btn-print {
          flex: 1;
          padding: 0.8rem;
          background: #2d5a3d;
          border: none;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.9rem;
          font-weight: 800;
          color: #e8f4ec;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          transition: background 0.12s;
          box-shadow: 0 3px 10px rgba(45,90,61,0.25);
        }

        .modal-btn-print:hover { background: #245033; }
      `}</style>

      <div className="sh-root">
        <h1 className="sh-title">Sales History</h1>

        {/* Filters */}
        <div className="sh-filter-row">
          <div className="sh-search-box">
            <Search size={17} color="#7a9e8a" />
            <input
              type="text"
              className="sh-search-input"
              placeholder="Search by Invoice # (e.g. INV-00001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="sh-date-box">
            <Calendar size={15} color="#7a9e8a" />
            <input type="date" className="sh-date-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span className="sh-date-sep">to</span>
            <input type="date" className="sh-date-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        <div className="sh-table-wrap">
          <table className="sh-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Total</th>
                <th>Method</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sale => (
                <tr key={sale.id}>
                  <td><span className="sh-invoice">{sale.invoice_number}</span></td>
                  <td><span className="sh-date-cell">{sale.date}</span></td>
                  <td><span className="sh-total">{currency}{sale.total.toFixed(2)}</span></td>
                  <td>
                    <span className={sale.payment_method === 'Cash' ? 'badge-cash' : 'badge-card'}>
                      {sale.payment_method}
                    </span>
                  </td>
                  <td>
                    <button className="sh-details-btn" onClick={() => viewDetails(sale.id!)}>
                      <Eye size={13} /> Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail Modal */}
        {selectedSale && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">Invoice Details</h2>
                  <p className="modal-invoice-sub">{selectedSale.sale.invoice_number}</p>
                </div>
                <button className="modal-close" onClick={() => setSelectedSale(null)}><X size={16} /></button>
              </div>

              {/* Sale info */}
              <div className="modal-info-box">
                <div className="modal-info-row">
                  <span>Date & Time</span>
                  <span className="modal-info-val">{selectedSale.sale.date}</span>
                </div>
                <div className="modal-info-row">
                  <span>Payment Method</span>
                  <span className={selectedSale.sale.payment_method === 'Cash' ? 'badge-cash' : 'badge-card'}>
                    {selectedSale.sale.payment_method}
                  </span>
                </div>
                {selectedSale.sale.payment_method === 'Cash' && (
                  <>
                    <div className="modal-info-row">
                      <span>Cash Received</span>
                      <span className="modal-info-val">{currency}{selectedSale.sale.cash_received?.toFixed(2)}</span>
                    </div>
                    <div className="modal-info-row">
                      <span>Change Given</span>
                      <span className="modal-info-val modal-info-val-green">{currency}{selectedSale.sale.change_given?.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Items */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div className="modal-items-label">Items</div>
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} className="modal-item">
                    <div className="modal-item-row">
                      <div>
                        <div className="modal-item-name">{item.product_name}</div>
                        <div className="modal-item-meta">{formatQtyUnit(item.quantity, item.unit)} × {currency}{item.price.toFixed(2)}</div>
                      </div>
                      <span className="modal-item-total">{currency}{(item.quantity * item.price).toFixed(2)}</span>
                    </div>
                    {item.discount_amount > 0 && (
                      <div className="modal-item-disc">
                        <span>Item Discount</span>
                        <span>-{currency}{item.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="modal-totals">
                <div className="modal-totals-row">
                  <span>Subtotal</span>
                  <span>{currency}{(selectedSale.sale.total + selectedSale.sale.bill_discount_value).toFixed(2)}</span>
                </div>
                {selectedSale.sale.bill_discount_value > 0 && (
                  <div className="modal-totals-row modal-totals-disc">
                    <span>Bill Discount</span>
                    <span>-{currency}{selectedSale.sale.bill_discount_value.toFixed(2)}</span>
                  </div>
                )}
                <div className="modal-totals-final">
                  <span>Total</span>
                  <span className="modal-total-val">{currency}{selectedSale.sale.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button className="modal-btn-close" onClick={() => setSelectedSale(null)}>Close</button>
                <button className="modal-btn-print" onClick={() => window.print()}>
                  <Printer size={15} /> Print
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SalesHistory;