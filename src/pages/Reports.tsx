import React, { useState, useEffect } from 'react';
import { TrendingUp, Download, Calendar } from 'lucide-react';
import { api, Product, Sale } from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';

const Reports: React.FC = () => {
  const { currency } = useSettings();
  const { t } = useTranslation();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { loadData(); }, [startDate, endDate]);

  const loadData = async () => {
    try {
      const sData = await api.getSalesHistory(startDate || undefined, endDate || undefined);
      setSales(sData);
      const pData = await api.getProducts();
      setProducts(pData);
    } catch (e) { console.error(e); }
  };

  const exportToCSV = () => {
    const headers = ['Invoice', 'Date', 'Total', 'Payment'];
    const rows = sales.map(s => [s.invoice_number, s.date, s.total.toFixed(2), s.payment_method]);
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_report_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const totalDiscount = sales.reduce((acc, s) => acc + s.bill_discount_value + s.total_product_discount, 0);

  return (
    <>
      <style>{`
        

        .rp-root {
          font-family: 'Nunito', sans-serif;
          animation: fadeIn 0.25s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .rp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
        }

        .rp-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: #1a3528;
          letter-spacing: -0.02em;
          margin: 0 0 0.2rem;
        }

        .rp-subtitle {
          color: #7a9e8a;
          font-size: 0.875rem;
          font-weight: 500;
          margin: 0;
        }

        .rp-export-btn {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.65rem 1.25rem;
          background: #2d5a3d;
          border: none;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          color: #e8f4ec;
          cursor: pointer;
          transition: background 0.12s, transform 0.1s;
          box-shadow: 0 3px 10px rgba(45,90,61,0.25);
        }

        .rp-export-btn:hover { background: #245033; transform: translateY(-1px); }

        /* Top grid */
        .rp-top-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 1.25rem;
          margin-bottom: 1.75rem;
          align-items: start;
        }

        .rp-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 1.1rem;
        }

        /* Stat cards */
        .rp-stat-card {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 1.125rem;
          padding: 1.25rem 1.5rem;
          border-left-width: 4px;
        }

        .rp-stat-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #7a9e8a;
          margin-bottom: 0.4rem;
        }

        .rp-stat-value {
          font-size: 1.9rem;
          font-weight: 800;
          color: #1a3528;
          line-height: 1;
        }

        .rp-stat-value-green { color: #2d5a3d; }
        .rp-stat-value-red { color: #c05050; }

        /* Date filter card */
        .rp-date-card {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 1.125rem;
          padding: 1.25rem 1.5rem;
        }

        .rp-date-label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #7a9e8a;
          margin-bottom: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .rp-date-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .rp-date-input {
          flex: 1;
          padding: 0.65rem 0.75rem;
          background: #edeae0;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.625rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.875rem;
          color: #1a3528;
          outline: none;
          transition: border-color 0.12s;
          cursor: pointer;
        }

        .rp-date-input:focus { border-color: #2d5a3d; }

        .rp-date-sep {
          color: #b0a898;
          font-size: 0.8rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        /* Table card */
        .rp-table-card {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 1.125rem;
          overflow: hidden;
        }

        .rp-table-header {
          padding: 1.1rem 1.25rem;
          border-bottom: 1.5px solid #ddd8cc;
          background: #edeae0;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.95rem;
          font-weight: 800;
          color: #1a3528;
        }

        .rp-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .rp-table thead tr {
          background: #edeae0;
          border-bottom: 1.5px solid #ddd8cc;
        }

        .rp-table th {
          padding: 0.7rem 1.1rem;
          text-align: left;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #7a9e8a;
        }

        .rp-table tbody tr {
          border-bottom: 1px solid #e8e4d8;
          transition: background 0.1s;
        }

        .rp-table tbody tr:last-child { border-bottom: none; }
        .rp-table tbody tr:hover { background: #edeae0; }

        .rp-table td {
          padding: 0.8rem 1.1rem;
          vertical-align: middle;
          color: #1a3528;
        }

        .rp-product-name { font-weight: 700; }
        .rp-unit-tag {
          color: #7a9e8a;
          font-weight: 500;
          font-size: 0.75rem;
        }

        .rp-asset-val {
          font-weight: 800;
          text-align: right;
          color: #2d5a3d;
        }
      `}</style>

      <div className="rp-root">
        {/* Header */}
        <div className="rp-header">
          <div>
            <h1 className="rp-title">{t('reports')}</h1>
            <p className="rp-subtitle">{t('reports_subtitle')}</p>
          </div>
          <button className="rp-export-btn" onClick={exportToCSV}>
            <Download size={16} /> {t('export_data')}
          </button>
        </div>

        {/* Top grid: stats + date filter */}
        <div className="rp-top-grid">
          <div className="rp-stats-grid">
            <div className="rp-stat-card" style={{ borderLeftColor: '#2d5a3d' }}>
              <div className="rp-stat-label">{t('total_revenue')}</div>
              <div className={`rp-stat-value rp-stat-value-green`}>{currency}{totalRevenue.toFixed(2)}</div>
            </div>
            <div className="rp-stat-card" style={{ borderLeftColor: '#c05050' }}>
              <div className="rp-stat-label">{t('total_discounts')}</div>
              <div className={`rp-stat-value rp-stat-value-red`}>{currency}{totalDiscount.toFixed(2)}</div>
            </div>
            <div className="rp-stat-card" style={{ borderLeftColor: '#ddd8cc' }}>
              <div className="rp-stat-label">{t('transactions')}</div>
              <div className="rp-stat-value">{sales.length}</div>
            </div>
          </div>

          <div className="rp-date-card">
            <div className="rp-date-label">
              <Calendar size={13} /> {t('date_filter')}
            </div>
            <div className="rp-date-row">
              <input type="date" className="rp-date-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="rp-date-sep">{t('to')}</span>
              <input type="date" className="rp-date-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Asset valuation table */}
        <div className="rp-table-card">
          <div className="rp-table-header">
            <TrendingUp size={17} color="#2d5a3d" /> {t('asset_valuation')}
          </div>
          <table className="rp-table">
            <thead>
              <tr>
                <th>{t('product_header')}</th>
                <th>{t('unit_price')}</th>
                <th>{t('current_stock')}</th>
                <th style={{ textAlign: 'right' }}>{t('asset_value')}</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <span className="rp-product-name">{p.name}</span>
                    <span className="rp-unit-tag"> ({p.base_unit})</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{currency}{p.price.toFixed(2)}</td>
                  <td style={{ fontWeight: 600 }}>{p.stock}</td>
                  <td className="rp-asset-val">{currency}{(p.price * p.stock).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Reports;