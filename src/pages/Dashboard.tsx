import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, AlertTriangle, DollarSign, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, DashboardStats } from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';

const Dashboard: React.FC = () => {
  const { currency } = useSettings();
  const { t } = useTranslation();
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

  const hasAlerts = (stats?.low_stock_count || 0) > 0 || (stats?.expiring_soon_count || 0) > 0;

  return (
    <>
      <style>{`
        

        .dash-root {
          font-family: 'Nunito', sans-serif;
          padding: 2rem;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dash-header {
          margin-bottom: 2.25rem;
        }

        .dash-title {
          font-size: 2rem;
          font-weight: 800;
          color: #1a3528;
          letter-spacing: -0.02em;
          margin: 0 0 0.25rem;
        }

        .dash-subtitle {
          color: #7a9e8a;
          font-size: 0.95rem;
          font-weight: 500;
          margin: 0;
        }

        /* ── Stat Cards Grid ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: #f5f0e8;
          border-radius: 1.25rem;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(45,90,61,0.07);
        }

        .stat-card-revenue {
          background: #2d5a3d;
        }

        .stat-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #7a9e8a;
          margin-bottom: 0.5rem;
        }

        .stat-label-light {
          color: rgba(232, 244, 236, 0.7);
        }

        .stat-value {
          font-size: 2.1rem;
          font-weight: 800;
          color: #1a3528;
          letter-spacing: -0.04em;
          line-height: 1;
        }

        .stat-value-light {
          color: #e8f4ec;
        }

        .stat-value-danger {
          color: #c05050;
        }

        .stat-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 0.875rem;
          background: #edeae0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-icon-wrap-danger {
          background: #fdf0f0;
        }

        .stat-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stat-bg-icon {
          position: absolute;
          right: -16px;
          bottom: -16px;
          opacity: 0.08;
          color: #e8f4ec;
        }

        /* ── Bottom Cards ── */
        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        @media (max-width: 640px) {
          .bottom-grid { grid-template-columns: 1fr; }
        }

        .action-card {
          background: #f5f0e8;
          border-radius: 1.25rem;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 2px 12px rgba(45,90,61,0.07);
        }

        .action-card-alert {
          background: #fdf5f5;
        }

        .action-icon-wrap {
          width: 48px;
          height: 48px;
          background: #e6ede8;
          border-radius: 0.875rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
        }

        .action-icon-wrap-alert {
          background: #fde8e8;
        }

        .action-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: #1a3528;
          margin: 0 0 0.4rem;
        }

        .action-title-alert {
          color: #7a2020;
        }

        .action-desc {
          color: #7a9e8a;
          font-size: 0.92rem;
          line-height: 1.5;
          margin: 0 0 1.75rem;
        }

        .alert-row {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          margin-bottom: 1.75rem;
        }

        .alert-item {
          color: #7a9e8a;
          font-size: 0.9rem;
          margin: 0;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .btn-primary-green {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.25rem;
          background: #2d5a3d;
          color: #e8f4ec;
          border: none;
          border-radius: 0.875rem;
          font-size: 0.975rem;
          font-weight: 700;
          font-family: 'Nunito', sans-serif;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s, transform 0.1s;
          box-shadow: 0 4px 14px rgba(45,90,61,0.25);
        }

        .btn-primary-green:hover {
          background: #245033;
          transform: translateY(-1px);
        }

        .btn-outline-green {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.25rem;
          background: transparent;
          color: #c05050;
          border: 1.5px solid #e8c0c0;
          border-radius: 0.875rem;
          font-size: 0.975rem;
          font-weight: 700;
          font-family: 'Nunito', sans-serif;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s, border-color 0.15s;
        }

        .btn-outline-green:hover {
          background: #fdf0f0;
        }

        .btn-outline-neutral {
          color: #2d5a3d;
          border-color: #ddd8cc;
        }

        .btn-outline-neutral:hover {
          background: #edeae0;
        }
      `}</style>

      <div className="dash-root">
        {/* Header */}
        <div className="dash-header">
          <h1 className="dash-title">{t('dashboard')}</h1>
          <p className="dash-subtitle">{t('welcome_back')}</p>
        </div>

        {/* Stat Cards */}
        <div className="stats-grid">
          {/* Revenue */}
          <div className="stat-card stat-card-revenue">
            <div className={`stat-label stat-label-light`}>{t('todays_revenue')}</div>
            <div className={`stat-value stat-value-light`}>
              {currency}{stats?.today_sales.toFixed(2) || '0.00'}
            </div>
            <DollarSign size={100} className="stat-bg-icon" style={{ position: 'absolute', right: -16, bottom: -16, opacity: 0.1, color: '#e8f4ec' }} />
          </div>

          {/* Orders */}
          <div className="stat-card">
            <div className="stat-row">
              <div>
                <div className="stat-label">{t('orders_today')}</div>
                <div className="stat-value">{stats?.today_orders || 0}</div>
              </div>
              <div className="stat-icon-wrap">
                <ShoppingCart size={24} color="#2d5a3d" />
              </div>
            </div>
          </div>

          {/* Low Stock */}
          <div className="stat-card">
            <div className="stat-row">
              <div>
                <div className="stat-label">{t('low_stock')}</div>
                <div className={`stat-value ${(stats?.low_stock_count || 0) > 0 ? 'stat-value-danger' : ''}`}>
                  {stats?.low_stock_count || 0}
                </div>
              </div>
              <div className={`stat-icon-wrap ${(stats?.low_stock_count || 0) > 0 ? 'stat-icon-wrap-danger' : ''}`}>
                <AlertTriangle size={24} color={(stats?.low_stock_count || 0) > 0 ? '#c05050' : '#7a9e8a'} />
              </div>
            </div>
          </div>

          {/* Expiring Soon */}
          <div className="stat-card">
            <div className="stat-row">
              <div>
                <div className="stat-label">{t('expiring_soon')}</div>
                <div className={`stat-value ${(stats?.expiring_soon_count || 0) > 0 ? 'stat-value-danger' : ''}`}>
                  {stats?.expiring_soon_count || 0}
                </div>
              </div>
              <div className={`stat-icon-wrap ${(stats?.expiring_soon_count || 0) > 0 ? 'stat-icon-wrap-danger' : ''}`}>
                <Package size={24} color={(stats?.expiring_soon_count || 0) > 0 ? '#c05050' : '#7a9e8a'} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Cards */}
        <div className="bottom-grid">
          {/* Quick Sell */}
          <div className="action-card">
            <div>
              <div className="action-icon-wrap">
                <DollarSign size={22} color="#2d5a3d" />
              </div>
              <h3 className="action-title">{t('quick_sell')}</h3>
              <p className="action-desc">{t('launch_pos_desc')}</p>
            </div>
            <Link to="/sales" className="btn-primary-green">
              {t('start_new_sale')} <ArrowRight size={18} />
            </Link>
          </div>

          {/* Alerts */}
          <div className={`action-card ${hasAlerts ? 'action-card-alert' : ''}`}>
            <div>
              <div className={`action-icon-wrap ${hasAlerts ? 'action-icon-wrap-alert' : ''}`}>
                <AlertTriangle size={22} color={hasAlerts ? '#c05050' : '#7a9e8a'} />
              </div>
              <h3 className={`action-title ${hasAlerts ? 'action-title-alert' : ''}`}>{t('alerts_and_status')}</h3>
              <div className="alert-row">
                <p className="alert-item">
                  {(stats?.low_stock_count || 0) > 0
                    ? <><AlertCircle size={15} color="#c05050" /> <span>{stats?.low_stock_count} {t('items_running_low')}</span></>
                    : <><CheckCircle2 size={15} color="#2d5a3d" /> <span>{t('all_products_well_stocked')}</span></>}
                </p>
                <p className="alert-item">
                  {(stats?.expiring_soon_count || 0) > 0
                    ? <><AlertCircle size={15} color="#c05050" /> <span>{stats?.expiring_soon_count} {t('items_expiring_soon')}</span></>
                    : <><CheckCircle2 size={15} color="#2d5a3d" /> <span>{t('no_items_expiring_soon')}</span></>}
                </p>
              </div>
            </div>
            <Link
              to="/inventory"
              className={`btn-outline-green ${hasAlerts ? '' : 'btn-outline-neutral'}`}
            >
              {t('review_inventory')}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;