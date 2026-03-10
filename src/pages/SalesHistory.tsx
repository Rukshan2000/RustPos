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

  useEffect(() => {
    loadSales();
  }, [startDate, endDate]);

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
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Sales History</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Search size={20} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search by Invoice # (e.g. INV-00001)..." 
            style={{ border: 'none', flex: 1, padding: '0.5rem', background: 'transparent' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Calendar size={18} color="var(--text-muted)" />
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ border: 'none', background: 'transparent' }} />
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ border: 'none', background: 'transparent' }} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Total</th>
              <th>Method</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody style={{ background: 'white' }}>
            {filtered.map(sale => (
              <tr key={sale.id}>
                <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{sale.invoice_number}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{sale.date}</td>
                <td style={{ fontWeight: 700 }}>{currency}{sale.total.toFixed(2)}</td>
                <td>
                  <span className={`badge ${sale.payment_method === 'Cash' ? 'badge-success' : 'badge-primary'}`}>
                    {sale.payment_method}
                  </span>
                </td>
                <td>
                  <button onClick={() => viewDetails(sale.id!)} className="btn-outline" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                    <Eye size={14} /> Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Invoice Details</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{selectedSale.sale.invoice_number}</p>
              </div>
              <button 
                onClick={() => setSelectedSale(null)} 
                style={{ background: 'var(--bg-main)', width: '32px', height: '32px', borderRadius: '50%', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="card" style={{ background: '#f8fafc', padding: '1.25rem', border: 'none', marginBottom: '1.5rem' }}>
              <div className="flex-between" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date & Time</span>
                <span style={{ fontWeight: 600 }}>{selectedSale.sale.date}</span>
              </div>
              <div className="flex-between" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment Method</span>
                <span className="badge badge-primary">{selectedSale.sale.payment_method}</span>
              </div>
              {selectedSale.sale.payment_method === 'Cash' && (
                <>
                  <div className="flex-between" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Cash Received</span>
                    <span style={{ fontWeight: 600 }}>{currency}{selectedSale.sale.cash_received?.toFixed(2)}</span>
                  </div>
                  <div className="flex-between" style={{ fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Change Given</span>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>{currency}{selectedSale.sale.change_given?.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Items</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: '0.5rem' }}>
                    <div className="flex-between" style={{ fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{item.product_name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatQtyUnit(item.quantity, item.unit)} × {currency}{item.price.toFixed(2)}</span>
                      </div>
                      <span style={{ fontWeight: 700 }}>{currency}{(item.quantity * item.price).toFixed(2)}</span>
                    </div>
                    {item.discount_amount > 0 && (
                      <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--danger)', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                        <span>Item Discount</span>
                        <span>-{currency}{item.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ paddingTop: '1.25rem', borderTop: '2px dashed var(--border)' }}>
              <div className="flex-between" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                <span style={{ fontWeight: 600 }}>{currency}{(selectedSale.sale.total + selectedSale.sale.bill_discount_value).toFixed(2)}</span>
              </div>
              {selectedSale.sale.bill_discount_value > 0 && (
                <div className="flex-between" style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--danger)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Bill Discount</span>
                  <span style={{ fontWeight: 600 }}>-{currency}{selectedSale.sale.bill_discount_value.toFixed(2)}</span>
                </div>
              )}
              <div className="flex-between" style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-main)', marginTop: '0.5rem' }}>
                <span>Total</span>
                <span style={{ color: 'var(--primary)' }}>{currency}{selectedSale.sale.total.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '0.75rem' }} onClick={() => setSelectedSale(null)}>Close</button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '0.75rem' }}>
                <Printer size={18} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
