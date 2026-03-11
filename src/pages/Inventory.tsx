import React, { useState, useEffect } from 'react';
import { Package, RefreshCw } from 'lucide-react';
import { api, Product, formatQtyUnit } from '../api';
import { useSettings } from '../contexts/SettingsContext';

const Inventory: React.FC = () => {
  const { currency } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    const data = await api.getProducts();
    setProducts(data);
  };

  const lowStock = products.filter(p => p.stock < 10);
  const totalItems = products.length;

  return (
    <>
      <style>{`
        

        .inv-root {
          font-family: 'Nunito', sans-serif;
          animation: fadeIn 0.25s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .inv-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
        }

        .inv-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: #1a3528;
          letter-spacing: -0.02em;
          margin: 0 0 0.2rem;
        }

        .inv-subtitle {
          color: #7a9e8a;
          font-size: 0.875rem;
          font-weight: 500;
          margin: 0;
        }

        .inv-refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.65rem 1.1rem;
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          color: #5a7a6a;
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s;
        }

        .inv-refresh-btn:hover { background: #edeae0; border-color: #c8c4b8; color: #1a3528; }

        /* Stat cards */
        .inv-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          margin-bottom: 1.75rem;
        }

        .inv-stat-card {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 1.125rem;
          padding: 1.25rem 1.5rem;
          border-left-width: 4px;
        }

        .inv-stat-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #7a9e8a;
          margin-bottom: 0.4rem;
        }

        .inv-stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: #1a3528;
          line-height: 1;
        }

        /* Table card */
        .inv-table-card {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 1.125rem;
          overflow: hidden;
        }

        .inv-table-header {
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

        .inv-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .inv-table thead tr {
          background: #edeae0;
          border-bottom: 1.5px solid #ddd8cc;
        }

        .inv-table th {
          padding: 0.7rem 1.1rem;
          text-align: left;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #7a9e8a;
        }

        .inv-table tbody tr {
          border-bottom: 1px solid #e8e4d8;
          transition: background 0.1s;
        }

        .inv-table tbody tr:last-child { border-bottom: none; }
        .inv-table tbody tr:hover { background: #edeae0; }

        .inv-table td {
          padding: 0.8rem 1.1rem;
          vertical-align: middle;
        }

        .badge-in-stock {
          display: inline-block;
          background: #e6ede8;
          color: #2d5a3d;
          border-radius: 0.4rem;
          padding: 0.2rem 0.65rem;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .badge-low-stock {
          display: inline-block;
          background: #fdf0f0;
          color: #c05050;
          border-radius: 0.4rem;
          padding: 0.2rem 0.65rem;
          font-size: 0.72rem;
          font-weight: 700;
        }
      `}</style>

      <div className="inv-root">
        {/* Header */}
        <div className="inv-header">
          <div>
            <h1 className="inv-title">Inventory</h1>
            <p className="inv-subtitle">Monitor and manage your stock levels</p>
          </div>
          <button className="inv-refresh-btn" onClick={loadProducts}>
            <RefreshCw size={15} /> Refresh Data
          </button>
        </div>

        {/* Stat Cards */}
        <div className="inv-stats">
          <div className="inv-stat-card" style={{ borderLeftColor: '#2d5a3d' }}>
            <div className="inv-stat-label">Total Variations</div>
            <div className="inv-stat-value">{totalItems}</div>
          </div>
          <div className="inv-stat-card" style={{ borderLeftColor: lowStock.length > 0 ? '#c05050' : '#2d5a3d' }}>
            <div className="inv-stat-label">Low Stock Alerts</div>
            <div className="inv-stat-value" style={{ color: lowStock.length > 0 ? '#c05050' : '#1a3528' }}>
              {lowStock.length}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="inv-table-card">
          <div className="inv-table-header">
            <Package size={17} color="#2d5a3d" /> Stock Inventory
          </div>
          <table className="inv-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Status</th>
                <th>Current Stock</th>
                <th>Price</th>
                <th style={{ textAlign: 'right' }}>Inventory Value</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700, color: '#1a3528' }}>{p.name}</td>
                  <td>
                    <span className={p.stock < 10 ? 'badge-low-stock' : 'badge-in-stock'}>
                      {p.stock < 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#1a3528' }}>{formatQtyUnit(p.stock, p.base_unit)}</td>
                  <td style={{ color: '#7a9e8a', fontWeight: 500 }}>{currency}{p.price.toFixed(2)} / {p.base_unit}</td>
                  <td style={{ fontWeight: 800, textAlign: 'right', color: '#2d5a3d' }}>
                    {currency}{(p.price * p.stock).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Inventory;