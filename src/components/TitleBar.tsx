import React from 'react';
import { Minus, Square, X, Copy, LogOut } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const TitleBar: React.FC = () => {
  const appWindow = getCurrentWindow();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isMaximized, setIsMaximized] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  React.useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return;

    const updateMaximized = async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };

    updateMaximized();

    const unlisten = appWindow.onResized(() => {
      updateMaximized();
    });

    return () => {
      unlisten.then(f => f());
    };
  }, [appWindow]);

  const handleMinimize = () => {
    if ('__TAURI_INTERNALS__' in window) appWindow.minimize();
  };
  
  const handleMaximize = async () => {
    if (!('__TAURI_INTERNALS__' in window)) return;
    const maximized = await appWindow.isMaximized();
    if (maximized) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
    const check = await appWindow.isMaximized();
    setIsMaximized(check);
  };

  const handleClose = () => {
    if ('__TAURI_INTERNALS__' in window) appWindow.close();
  };

  return (
    <div className="titlebar">
      <div data-tauri-drag-region className="titlebar-drag-handle">
        <div className="titlebar-logo">
          <div className="logo-dot" />
          <span>NyxoPos</span>
          {currentUser && (
            <span style={{ 
              marginLeft: '1rem', 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)', 
              fontWeight: 600,
              background: 'rgba(255,255,255,0.05)',
              padding: '0.1rem 0.6rem',
              borderRadius: '1rem',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {currentUser.username} ({currentUser.role})
            </span>
          )}
        </div>
      </div>
      <div className="titlebar-controls">
        {currentUser && (
          <button 
            className="titlebar-button" 
            onClick={handleLogout} 
            title="Sign Out"
            style={{ color: '#fca5a5', width: 'auto', padding: '0 1rem', fontSize: '0.75rem', fontWeight: 700, gap: '0.5rem' }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        )}
        <button className="titlebar-button" onClick={handleMinimize} title="Minimize">
          <Minus size={14} />
        </button>
        <button className="titlebar-button" onClick={handleMaximize} title={isMaximized ? "Restore" : "Maximize"}>
          {isMaximized ? <Copy size={14} /> : <Square size={14} />}
        </button>
        <button className="titlebar-button close" onClick={handleClose} title="Close">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
