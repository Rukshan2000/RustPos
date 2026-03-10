import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  title?: string;
}

interface CustomAlert {
  message: string;
  title?: string;
  type?: NotificationType;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType, title?: string) => void;
  alertCustom: (message: string, title?: string, type?: NotificationType) => void;
  confirmCustom: (message: string, onConfirm: () => void, title?: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeAlert, setActiveAlert] = useState<CustomAlert | null>(null);
  const [activeConfirm, setActiveConfirm] = useState<{ message: string; title: string; type: NotificationType; onConfirm: () => void } | null>(null);

  const notify = useCallback((message: string, type: NotificationType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type, title }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const alertCustom = useCallback((message: string, title: string = 'Attention', type: NotificationType = 'warning') => {
    setActiveAlert({ message, title, type });
  }, []);

  const confirmCustom = useCallback((message: string, onConfirm: () => void, title: string = 'Are you sure?', type: NotificationType = 'warning') => {
    setActiveConfirm({ message, title, type, onConfirm });
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} />;
      case 'error': return <AlertCircle size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      default: return <Info size={20} />;
    }
  };

  const getTitle = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'Success';
      case 'error': return 'Error';
      case 'warning': return 'Warning';
      default: return 'Information';
    }
  };

  return (
    <NotificationContext.Provider value={{ notify, alertCustom, confirmCustom }}>
      {children}
      
      {/* Toast Container */}
      <div className="notification-container">
        {notifications.map(n => (
          <div key={n.id} className={`toast toast-${n.type}`}>
            <div className="toast-icon">
              {getIcon(n.type)}
            </div>
            <div className="toast-content">
              <div className="toast-title">{n.title || getTitle(n.type)}</div>
              <div className="toast-message">{n.message}</div>
            </div>
            <button onClick={() => removeNotification(n.id)} style={{ color: 'var(--text-muted)', padding: '4px' }}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Custom Alert Modal */}
      {activeAlert && (
        <div className="custom-alert-overlay">
          <div className="custom-alert-card">
            <div className={`alert-icon-wrapper toast-${activeAlert.type || 'warning'}`}>
              <div className="toast-icon" style={{ width: '48px', height: '48px' }}>
                {getIcon(activeAlert.type || 'warning')}
              </div>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              {activeAlert.title}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              {activeAlert.message}
            </p>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', borderRadius: '1rem', fontSize: '1rem' }}
              onClick={() => setActiveAlert(null)}
            >
              Understand
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {activeConfirm && (
        <div className="custom-alert-overlay">
          <div className="custom-alert-card">
            <div className={`alert-icon-wrapper toast-${activeConfirm.type}`}>
              <div className="toast-icon" style={{ width: '48px', height: '48px' }}>
                {getIcon(activeConfirm.type)}
              </div>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              {activeConfirm.title}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              {activeConfirm.message}
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-outline" 
                style={{ flex: 1, padding: '1rem', borderRadius: '1rem' }}
                onClick={() => setActiveConfirm(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '1rem', borderRadius: '1rem', background: activeConfirm.type === 'error' ? 'var(--danger)' : 'var(--primary)' }}
                onClick={() => {
                  activeConfirm.onConfirm();
                  setActiveConfirm(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
