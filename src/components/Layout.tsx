import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Package, Tag, 
  History, BarChart3, Settings as SettingsIcon, 
  Users, LogOut, User 
} from 'lucide-react';
import TitleBar from './TitleBar';
import { useAuth } from '../contexts/AuthContext';
import { useKiosk } from '../contexts/KioskContext';
import { useTranslation } from 'react-i18next';

const Layout: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { isKioskActive } = useKiosk();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <>
      <style>{`
        

        .layout-root {
          display: flex;
          flex-direction: column;
          height: 100vh;
          font-family: 'Nunito', sans-serif;
          background: #edeae0;
        }

        .app-container {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* ── Sidebar ── */
        .sidebar {
          width: 228px;
          flex-shrink: 0;
          background: #f5f0e8;
          border-right: 1.5px solid #ddd8cc;
          display: flex;
          flex-direction: column;
          padding: 1rem 0.75rem;
          overflow-y: auto;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 2rem 0.5rem 1.5rem;
        }

        .sidebar-brand-icon {
          width: 38px;
          height: 38px;
          background: #2d5a3d;
          border-radius: 0.625rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 3px 10px rgba(45,90,61,0.25);
        }

        .sidebar-brand-name {
          font-size: 1.1rem;
          font-weight: 800;
          color: #1a3528;
          margin: 0;
          line-height: 1.1;
        }

        .sidebar-brand-role {
          font-size: 0.65rem;
          font-weight: 700;
          color: #7a9e8a;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        /* Nav section label */
        .nav-section-label {
          font-size: 0.62rem;
          font-weight: 700;
          color: #b0a898;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          padding: 0 0.75rem;
          margin: 1rem 0 0.4rem;
        }

        /* Nav items */
        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.6rem 0.75rem;
          border-radius: 0.625rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: #5a7a6a;
          text-decoration: none;
          transition: background 0.12s, color 0.12s;
          border: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
          background: transparent;
          font-family: 'Nunito', sans-serif;
        }

        .nav-item:hover {
          background: #edeae0;
          color: #1a3528;
        }

        .nav-item.active {
          background: #2d5a3d;
          color: #e8f4ec;
        }

        .nav-item.active svg {
          opacity: 1;
        }

        .nav-item svg {
          opacity: 0.7;
          flex-shrink: 0;
        }

        .nav-item:hover svg {
          opacity: 1;
        }

        /* Sidebar footer */
        .sidebar-footer {
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1.5px solid #ddd8cc;
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.5rem 0.75rem 1rem;
        }

        .sidebar-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #edeae0;
          border: 1.5px solid #ddd8cc;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7a9e8a;
          flex-shrink: 0;
        }

        .sidebar-username {
          font-size: 0.85rem;
          font-weight: 700;
          color: #1a3528;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-userrole {
          font-size: 0.7rem;
          color: #7a9e8a;
          font-weight: 500;
        }

        .nav-item-signout {
          color: #c05050;
        }

        .nav-item-signout:hover {
          background: #fdf0f0;
          color: #a03030;
        }

        /* Main content */
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #edeae0;
        }

        .main-scroll {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          height: 100%;
        }
      `}</style>

      <div className="layout-root">
        {!isKioskActive && <TitleBar />}
        <div className="app-container" style={{ height: isKioskActive ? '100vh' : 'calc(100vh - 44px)' }}>
          {isAdmin && (
            <aside className="sidebar">
              {/* Brand */}
              <div className="sidebar-brand">
                <div className="sidebar-brand-icon">
                  <ShoppingCart size={20} color="#a8d4b8" />
                </div>
                <div>
                  <div className="sidebar-brand-name">NyxoPos</div>
                  <div className="sidebar-brand-role">{currentUser?.role}</div>
                </div>
              </div>

              {/* Nav */}
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                <div className="nav-section-label">{t('main')}</div>
                <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <LayoutDashboard size={18} /><span>{t('dashboard')}</span>
                </NavLink>
                <NavLink to="/sales" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <ShoppingCart size={18} /><span>{t('sales')}</span>
                </NavLink>

                <div className="nav-section-label">{t('inventory')}</div>
                <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Package size={18} /><span>{t('products')}</span>
                </NavLink>
                <NavLink to="/categories" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Tag size={18} /><span>{t('categories')}</span>
                </NavLink>
                <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <History size={18} /><span>{t('inventory')}</span>
                </NavLink>

                <div className="nav-section-label">{t('reports')}</div>
                <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <History size={18} /><span>{t('history')}</span>
                </NavLink>
                <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <BarChart3 size={18} /><span>{t('reports')}</span>
                </NavLink>

                <div className="nav-section-label">{t('admin')}</div>
                <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Users size={18} /><span>{t('users')}</span>
                </NavLink>
              </nav>

              {/* Footer */}
              <div className="sidebar-footer">
                <div className="sidebar-user">
                  <div className="sidebar-avatar">
                    <User size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sidebar-username">{currentUser?.username}</div>
                    <div className="sidebar-userrole">{t('administrator')}</div>
                  </div>
                </div>

                <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ marginBottom: '0.25rem' }}>
                  <SettingsIcon size={18} /><span>{t('settings')}</span>
                </NavLink>

                <button onClick={handleLogout} className="nav-item nav-item-signout">
                  <LogOut size={18} /><span>{t('logout')}</span>
                </button>
              </div>
            </aside>
          )}

          <main className="main-content">
            <div className="main-scroll" style={{ padding: isAdmin ? '1.75rem' : '1.5rem' }}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;