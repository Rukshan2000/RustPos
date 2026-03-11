import React from 'react';
import { Minus, Square, X, Copy, LogOut, ShoppingBag } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAuth } from '../contexts/AuthContext';

const TitleBar: React.FC = () => {
  const appWindow = getCurrentWindow();
  const { currentUser, logout } = useAuth();
  const [isMaximized, setIsMaximized] = React.useState(false);

  const handleLogout = () => {
    logout();
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
    await appWindow.toggleMaximize();
  };

  const handleClose = () => {
    if ('__TAURI_INTERNALS__' in window) appWindow.close();
  };

  return (
    <>
      <style>{`
        

        .titlebar {
          height: 44px;
          background: #2d5a3d;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 0.5rem 0 1rem;
          font-family: 'Nunito', sans-serif;
          user-select: none;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .tb-drag {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex: 1;
          min-width: 0;
          height: 100%;
          cursor: default;
        }

        .tb-logo-icon {
          width: 26px;
          height: 26px;
          background: rgba(232,244,236,0.15);
          border-radius: 0.4rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .tb-name {
          font-size: 0.9rem;
          font-weight: 800;
          color: #e8f4ec;
          letter-spacing: 0.01em;
        }

        .tb-user-badge {
          font-size: 0.7rem;
          font-weight: 600;
          color: rgba(232,244,236,0.6);
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.15rem 0.6rem;
          border-radius: 2rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }

        .tb-controls {
          display: flex;
          align-items: center;
          gap: 0.125rem;
          flex-shrink: 0;
        }

        .tb-btn {
          height: 32px;
          min-width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: rgba(232,244,236,0.65);
          cursor: pointer;
          border-radius: 0.4rem;
          transition: background 0.12s, color 0.12s;
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 0.72rem;
        }

        .tb-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #e8f4ec;
        }

        .tb-btn-logout {
          padding: 0 0.75rem;
          gap: 0.35rem;
          color: rgba(232,244,236,0.55);
          margin-right: 0.25rem;
        }

        .tb-btn-logout:hover {
          background: rgba(192,80,80,0.2);
          color: #f4a4a4;
        }

        .tb-btn-close:hover {
          background: #c05050;
          color: white;
        }

        .tb-separator {
          width: 1px;
          height: 16px;
          background: rgba(255,255,255,0.1);
          margin: 0 0.25rem;
        }
      `}</style>

      <div className="titlebar">
        <div data-tauri-drag-region className="tb-drag">
          <div className="tb-logo-icon">
            <ShoppingBag size={14} color="#a8d4b8" />
          </div>
          <span className="tb-name">NyxoPos</span>
          {currentUser && (
            <span className="tb-user-badge">
              {currentUser.username} · {currentUser.role}
            </span>
          )}
        </div>

        <div className="tb-controls">
          {currentUser && (
            <>
              <button className="tb-btn tb-btn-logout" onClick={handleLogout} title="Sign Out">
                <LogOut size={13} />
                <span>Logout</span>
              </button>
              <div className="tb-separator" />
            </>
          )}
          <button className="tb-btn" onClick={handleMinimize} title="Minimize">
            <Minus size={13} />
          </button>
          <button className="tb-btn" onClick={handleMaximize} title={isMaximized ? 'Restore' : 'Maximize'}>
            {isMaximized ? <Copy size={13} /> : <Square size={13} />}
          </button>
          <button className="tb-btn tb-btn-close" onClick={handleClose} title="Close">
            <X size={13} />
          </button>
        </div>
      </div>
    </>
  );
};

export default TitleBar;