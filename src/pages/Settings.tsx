import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Database, Download, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { useNotifications } from '../contexts/NotificationContext';

const Settings: React.FC = () => {
  const [shopName, setShopName] = useState('');
  const [receiptText, setReceiptText] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [footerText, setFooterText] = useState('');
  const [fontSizeHeader, setFontSizeHeader] = useState(24);
  const [fontSizeBody, setFontSizeBody] = useState(14);
  const [fontSizeFooter, setFontSizeFooter] = useState(12);
  const [currency, setCurrency] = useState('$');
  const [loading, setLoading] = useState(false);
  const [backupPath, setBackupPath] = useState('');
  const { refreshSettings } = useSettings();
  const { notify, alertCustom, confirmCustom } = useNotifications();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await api.getSettings();
      setShopName(s.shop_name);
      setReceiptText(s.receipt_text);
      setLogoUrl(s.logo_url || '');
      setFooterText(s.footer_text || '');
      setFontSizeHeader(s.font_size_header);
      setFontSizeBody(s.font_size_body);
      setFontSizeFooter(s.font_size_footer);
      setCurrency(s.currency);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateSettings({ 
        shop_name: shopName, 
        receipt_text: receiptText,
        logo_url: logoUrl || null,
        footer_text: footerText || null,
        font_size_header: fontSizeHeader,
        font_size_body: fontSizeBody,
        font_size_footer: fontSizeFooter,
        currency: currency
      });
      await refreshSettings();
      notify("Settings saved successfully!", "success");
    } catch (e) {
      alertCustom("Error saving settings: " + e, "Settings Error", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      const path = await api.backupDb();
      setBackupPath(path);
      alertCustom("Database backup successful!\nPath: " + path, "Backup Complete", "success");
    } catch (e) {
      alertCustom("Backup failed: " + e, "Backup Error", "error");
    }
  };

  const handleRestore = async () => {
    const path = prompt("Enter the ABSOLUTE path to the backup file (.db):");
    if (!path) return;
    
    confirmCustom("RESTORE: This will overwrite your current database. Proceed?", async () => {
      try {
        await api.restoreDb(path);
        alertCustom("Database restored successfully! Application will reload.", "Restore Success", "success");
        setTimeout(() => window.location.reload(), 2000);
      } catch (e) {
        alertCustom("Restore failed: " + e, "Restore Error", "error");
      }
    }, "Restore Database", "warning");
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Configure your shop identity and manage data</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2.5rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <SettingsIcon size={20} color="var(--primary)" /> Receipt Configuration
            </h2>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="grid-form">
                  <label className="form-label">Shop Name</label>
                  <input required className="w-full" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="e.g. My Amazing Store" />
                </div>
                <div className="grid-form">
                  <label className="form-label">Shop Logo (Optional)</label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <label className="btn btn-outline" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Upload Logo
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setLogoUrl(event.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {logoUrl && !logoUrl.startsWith('http') && <button type="button" className="btn btn-outline" style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', color: 'var(--danger)' }} onClick={() => setLogoUrl('')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>}
                  </div>
                  {logoUrl && !logoUrl.startsWith('http') && <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>✓ Logo selected</div>}
                </div>
                <div className="grid-form">
                  <label className="form-label">Currency Symbol</label>
                  <input required className="w-full" value={currency} onChange={e => setCurrency(e.target.value)} placeholder="$, Rs., £, etc." />
                </div>
              </div>

              <div className="grid-form">
                <label className="form-label">Header Message</label>
                <input className="w-full" value={receiptText} onChange={e => setReceiptText(e.target.value)} placeholder="Welcome to our store!" />
              </div>

              <div className="grid-form">
                <label className="form-label">Footer Branding Text</label>
                <textarea 
                  className="w-full"
                  style={{ minHeight: '80px' }} 
                  value={footerText} 
                  onChange={e => setFooterText(e.target.value)} 
                  placeholder="Thank you for shopping! Follow us on @instagram"
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Font Sizes (px)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                   <div className="grid-form">
                      <label className="form-label">Header</label>
                      <input type="number" className="w-full" value={fontSizeHeader} onChange={e => setFontSizeHeader(parseInt(e.target.value) || 0)} />
                   </div>
                   <div className="grid-form">
                      <label className="form-label">Body</label>
                      <input type="number" className="w-full" value={fontSizeBody} onChange={e => setFontSizeBody(parseInt(e.target.value) || 0)} />
                   </div>
                   <div className="grid-form">
                      <label className="form-label">Footer</label>
                      <input type="number" className="w-full" value={fontSizeFooter} onChange={e => setFontSizeFooter(parseInt(e.target.value) || 0)} />
                   </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.875rem 1.5rem', borderRadius: '0.75rem', alignSelf: 'flex-start' }}>
                <Save size={18} /> {loading ? 'Saving Changes...' : 'Save All Settings'}
              </button>
            </form>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Database size={20} color="var(--primary)" /> Database & Backup
            </h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={handleBackup} className="btn btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', padding: '0.75rem' }}>
                <Download size={18} /> Export Backup
              </button>
              <button onClick={handleRestore} className="btn btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', padding: '0.75rem' }}>
                <RefreshCw size={18} /> Import Restore
              </button>
            </div>
          </div>
        </div>

        <div style={{ position: 'sticky', top: '0' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             Live Receipt Preview
          </h3>
          <div className="card" style={{ 
            background: 'white', 
            padding: '2rem', 
            minHeight: '500px', 
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            fontFamily: 'monospace',
            color: '#333'
          }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ maxWidth: '100px', marginBottom: '1rem' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
            ) : (
              <div style={{ width: '60px', height: '60px', background: '#f1f5f9', borderRadius: '50%', marginBottom: '1rem' }} />
            )}
            
            <div style={{ fontSize: `${fontSizeHeader}px`, fontWeight: 'bold', marginBottom: '0.25rem' }}>{shopName || 'SHOP NAME'}</div>
            <div style={{ fontSize: `${fontSizeBody}px`, marginBottom: '1.5rem', color: '#666' }}>{receiptText || 'Header Message Area'}</div>
            
            <div style={{ width: '100%', borderTop: '1px dashed #ccc', margin: '1rem 0' }} />
            
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: `${fontSizeBody}px`, marginBottom: '0.5rem' }}>
              <span>Item x 1</span>
              <span>{currency}10.00</span>
            </div>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: `${fontSizeBody}px`, marginBottom: '0.5rem' }}>
              <span>Another Item x 2</span>
              <span>{currency}20.00</span>
            </div>
            
            <div style={{ width: '100%', borderTop: '1px dashed #ccc', margin: '1rem 0' }} />
            
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: `${fontSizeBody}px`, fontWeight: 'bold' }}>
              <span>TOTAL</span>
              <span>{currency}30.00</span>
            </div>
            
            <div style={{ flex: 1 }} />
            
            <div style={{ fontSize: `${fontSizeFooter}px`, color: '#666', marginTop: '2rem' }}>
              {footerText || 'Footer Branding Area'}
            </div>
            <div style={{ fontSize: '10px', color: '#999', marginTop: '0.5rem' }}>
              {new Date().toLocaleString()}
            </div>
          </div>

          {backupPath && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              background: '#f8fafc', 
              borderRadius: '0.75rem', 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)', 
              border: '1px solid var(--border)', 
              overflowWrap: 'break-word',
              width: '100%' 
            }}>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-main)', textTransform: 'uppercase', fontSize: '0.65rem' }}>Last Backup Path</div>
              {backupPath}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
