import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, AlertTriangle, DollarSign, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, DashboardStats } from '../api';
import { useSettings } from '../contexts/SettingsContext';

const Dashboard: React.FC = () => {
  const { currency } = useSettings();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500 }}>Welcome back! Here's what's happening today.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)', color: 'white', border: 'none', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Today's Revenue</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.05em' }}>{currency}{stats?.today_sales.toFixed(2) || '0.00'}</div>
          </div>
          <DollarSign size={120} style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.1 }} />
        </div>

        <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: '1.75rem' }}>
          <div className="flex-between">
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Orders Today</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.05em' }}>{stats?.today_orders || 0}</div>
            </div>
            <div style={{ width: '56px', height: '56px', background: '#eef2ff', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={28} color="var(--primary)" />
            </div>
          </div>
        </div>

        <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: '1.75rem' }}>
          <div className="flex-between">
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Low Stock</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: (stats?.low_stock_count || 0) > 0 ? 'var(--danger)' : 'var(--text-main)', letterSpacing: '-0.05em' }}>
                {stats?.low_stock_count || 0}
              </div>
            </div>
            <div style={{ width: '56px', height: '56px', background: (stats?.low_stock_count || 0) > 0 ? '#fef2f2' : '#f8fafc', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={28} color={(stats?.low_stock_count || 0) > 0 ? 'var(--danger)' : 'var(--text-muted)'} />
            </div>
          </div>
        </div>

        <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: '1.75rem' }}>
          <div className="flex-between">
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Expiring Soon</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: (stats?.expiring_soon_count || 0) > 0 ? 'var(--danger)' : 'var(--text-main)', letterSpacing: '-0.05em' }}>
                {stats?.expiring_soon_count || 0}
              </div>
            </div>
            <div style={{ width: '56px', height: '56px', background: (stats?.expiring_soon_count || 0) > 0 ? '#fff1f2' : '#f8fafc', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={28} color={(stats?.expiring_soon_count || 0) > 0 ? 'var(--danger)' : 'var(--text-muted)'} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2rem', background: 'white', border: '2px solid var(--border)' }}>
          <div>
            <div style={{ width: '48px', height: '48px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <DollarSign size={24} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Quick Sell</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2rem' }}>Launch the point of sale interface to start a new transaction.</p>
          </div>
          <Link to="/sales" className="btn btn-primary" style={{ padding: '1rem', borderRadius: '1rem', fontSize: '1.125rem', fontWeight: 700, boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)' }}>
            Start New Sale <ArrowRight size={20} />
          </Link>
        </div>

        <div className="card" style={{ background: (stats?.low_stock_count || 0) > 0 || (stats?.expiring_soon_count || 0) > 0 ? '#fff1f2' : 'white', border: (stats?.low_stock_count || 0) > 0 || (stats?.expiring_soon_count || 0) > 0 ? '2px solid #fecdd3' : '1px solid var(--border)', padding: '2rem' }}>
          <div style={{ width: '48px', height: '48px', background: (stats?.low_stock_count || 0) > 0 || (stats?.expiring_soon_count || 0) > 0 ? '#fecdd3' : '#f1f5f9', color: (stats?.low_stock_count || 0) > 0 || (stats?.expiring_soon_count || 0) > 0 ? 'var(--danger)' : 'var(--text-muted)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <AlertTriangle size={24} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: (stats?.low_stock_count || 0) > 0 || (stats?.expiring_soon_count || 0) > 0 ? '#9f1239' : 'var(--text-main)' }}>Alerts & Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>
              {(stats?.low_stock_count || 0) > 0 
                ? <span>⚠️ {stats?.low_stock_count} items running low on stock.</span>
                : <span>✅ All products well-stocked.</span>}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>
              {(stats?.expiring_soon_count || 0) > 0 
                ? <span>⚠️ {stats?.expiring_soon_count} items expiring within 30 days.</span>
                : <span>✅ No items expiring soon.</span>}
            </p>
          </div>
          <Link to="/inventory" className="btn btn-outline" style={{ padding: '1rem', borderRadius: '1rem', fontSize: '1.125rem', fontWeight: 700, borderColor: (stats?.low_stock_count || 0) > 0 || (stats?.expiring_soon_count || 0) > 0 ? '#fecdd3' : 'var(--border)' }}>
            Review Inventory
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
