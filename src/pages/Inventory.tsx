import React, { useState, useEffect } from 'react';
import { Package, RefreshCw } from 'lucide-react';
import { api, Product, formatQtyUnit } from '../api';
import { useSettings } from '../contexts/SettingsContext';

const Inventory: React.FC = () => {
  const { currency } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await api.getProducts();
    setProducts(data);
  };

  const lowStock = products.filter(p => p.stock < 10);
  const totalItems = products.length;

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>Inventory</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Monitor and manage your stock levels</p>
        </div>
        <button className="btn btn-outline" onClick={loadProducts} style={{ padding: '0.75rem 1.25rem', borderRadius: '0.75rem' }}>
          <RefreshCw size={18} /> Refresh Data
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card shadow-sm" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Variations</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalItems}</div>
        </div>
        <div className="card shadow-sm" style={{ borderLeft: lowStock.length > 0 ? '4px solid var(--danger)' : '4px solid var(--success)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Low Stock Alerts</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: lowStock.length > 0 ? 'var(--danger)' : 'var(--success)' }}>{lowStock.length}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Package size={20} color="var(--primary)" /> Stock Inventory
          </h2>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: '0' }}>
          <table>
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
                  <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.name}</td>
                  <td>
                    <span className={`badge ${p.stock < 10 ? 'badge-danger' : 'badge-success'}`}>
                      {p.stock < 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {formatQtyUnit(p.stock, p.base_unit)}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{currency}{p.price.toFixed(2)} / {p.base_unit}</td>
                  <td style={{ fontWeight: 800, textAlign: 'right', color: 'var(--primary)' }}>
                    {currency}{(p.price * p.stock).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
