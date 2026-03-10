import React, { useState, useEffect } from 'react';
import { TrendingUp, Download, Calendar } from 'lucide-react';
import { api, Product, Sale } from '../api';
import { useSettings } from '../contexts/SettingsContext';

const Reports: React.FC = () => {
  const { currency } = useSettings();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    try {
      const sData = await api.getSalesHistory(startDate || undefined, endDate || undefined);
      setSales(sData);
      const pData = await api.getProducts();
      setProducts(pData);
    } catch (e) {
      console.error(e);
    }
  };

  const exportToCSV = () => {
    const headers = ['Invoice', 'Date', 'Total', 'Payment'];
    const rows = sales.map(s => [s.invoice_number, s.date, s.total.toFixed(2), s.payment_method]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

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
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>Reports</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Analyze your business performance and valuation</p>
        </div>
        <button className="btn btn-primary" onClick={exportToCSV} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}>
          <Download size={18} /> Export Data
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', marginBottom: '2.5rem', alignItems: 'start' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div className="card shadow-sm" style={{ background: 'linear-gradient(135deg, var(--success) 0%, #10b981 100%)', color: 'white', border: 'none' }}>
            <div style={{ opacity: 0.9, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Revenue</div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800 }}>{currency}{totalRevenue.toFixed(2)}</div>
          </div>
          <div className="card shadow-sm" style={{ background: 'linear-gradient(135deg, var(--danger) 0%, #ef4444 100%)', color: 'white', border: 'none' }}>
            <div style={{ opacity: 0.9, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Discounts</div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800 }}>{currency}{totalDiscount.toFixed(2)}</div>
          </div>
          <div className="card shadow-sm">
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Transactions</div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{sales.length}</div>
          </div>
        </div>
        
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={14} /> Date Range Filter
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="date" className="w-full" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.5rem' }} />
            <span style={{ color: 'var(--text-muted)' }}>to</span>
            <input type="date" className="w-full" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.5rem' }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <TrendingUp size={22} color="var(--primary)" /> Asset Valuation
          </h2>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: '0' }}>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Unit Price</th>
                <th>Current Stock</th>
                <th style={{ textAlign: 'right' }}>Asset Value</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700 }}>{p.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.75rem' }}>({p.base_unit})</span></td>
                  <td>{currency}{p.price.toFixed(2)}</td>
                  <td style={{ fontWeight: 600 }}>{p.stock}</td>
                  <td style={{ fontWeight: 800, textAlign: 'right', color: 'var(--primary)' }}>{currency}{(p.price * p.stock).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
