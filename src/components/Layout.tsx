import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Package, Tag, 
  History, BarChart3, Settings as SettingsIcon, 
  Users, LogOut, User 
} from 'lucide-react';
import TitleBar from './TitleBar';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="layout-root">
      <TitleBar />
      <div className="app-container" style={{ height: 'calc(100vh - 36px)', marginTop: '36px' }}>
        {isAdmin && (
          <aside className="sidebar" style={{ paddingTop: '1rem' }}>
            <div className="sidebar-header" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <ShoppingCart size={24} />
              </div>
              <div>
                  <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>NyxoPos</h1>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{currentUser?.role}</div>
              </div>
            </div>

            <nav className="nav-links">
              <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </NavLink>
              
              <NavLink to="/sales" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <ShoppingCart size={20} />
                <span>Sales</span>
              </NavLink>

              <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <Package size={20} />
                <span>Products</span>
              </NavLink>
              <NavLink to="/categories" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <Tag size={20} />
                <span>Categories</span>
              </NavLink>
              <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <History size={20} />
                <span>Inventory</span>
              </NavLink>
              <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <History size={20} />
                <span>History</span>
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <BarChart3 size={20} />
                <span>Reports</span>
              </NavLink>
              <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <Users size={20} />
                <span>Users</span>
              </NavLink>
            </nav>

            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div style={{ padding: '0 1rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <User size={16} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser?.username}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Administrator</div>
                </div>
              </div>

              <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} style={{ marginBottom: '0.5rem' }}>
                <SettingsIcon size={20} />
                <span>Settings</span>
              </NavLink>

              <button 
                onClick={handleLogout}
                className="nav-item" 
                style={{ width: '100%', textAlign: 'left', background: 'transparent', transition: 'all 0.2s', border: 'none', cursor: 'pointer', color: '#ef4444' }}
              >
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        )}

        <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: isAdmin ? '0' : '1.5rem' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
