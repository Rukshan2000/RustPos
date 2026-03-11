import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Database, Download, RefreshCw, ImageIcon, X, Trash2, Globe, Shield, Monitor } from 'lucide-react';
import { api } from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTranslation } from 'react-i18next';
import { useKiosk } from '../contexts/KioskContext';
import { useCustomerDisplay } from '../contexts/CustomerDisplayContext';
import type { CustomerDisplayMode } from '../contexts/CustomerDisplayContext';

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
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [kioskEnabled, setKioskEnabled] = useState(false);
  const [kioskPin, setKioskPin] = useState('');
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(5);
  const [autoStartKiosk, setAutoStartKiosk] = useState(false);
  const { refreshSettings } = useSettings();
  const { notify, alertCustom, confirmCustom } = useNotifications();
  const { t, i18n } = useTranslation();
  const { isKioskActive, enterKiosk } = useKiosk();
  const {
    displayMode, setDisplayMode,
    selectedMonitorIndex, setSelectedMonitorIndex,
    monitors, refreshMonitors,
    isDisplayOpen, openCustomerDisplay, closeCustomerDisplay,
  } = useCustomerDisplay();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem('appLanguage', newLang);
  };

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const s = await api.getSettings();
      setShopName(s.shop_name); setReceiptText(s.receipt_text);
      setLogoUrl(s.logo_url || ''); setFooterText(s.footer_text || '');
      setFontSizeHeader(s.font_size_header); setFontSizeBody(s.font_size_body);
      setFontSizeFooter(s.font_size_footer); setCurrency(s.currency);
      setKioskEnabled(s.kiosk_enabled); setKioskPin(s.kiosk_pin || '');
      setIdleTimeoutMinutes(s.idle_timeout_minutes); setAutoStartKiosk(s.auto_start_kiosk);
    } catch (e) { console.error(e); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateSettings({ shop_name: shopName, receipt_text: receiptText, logo_url: logoUrl || null, footer_text: footerText || null, font_size_header: fontSizeHeader, font_size_body: fontSizeBody, font_size_footer: fontSizeFooter, currency, kiosk_enabled: kioskEnabled, kiosk_pin: kioskPin || null, idle_timeout_minutes: idleTimeoutMinutes, auto_start_kiosk: autoStartKiosk });
      await refreshSettings();
      notify("Settings saved successfully!", "success");
    } catch (e) { alertCustom("Error saving settings: " + e, "Settings Error", "error"); }
    finally { setLoading(false); }
  };

  const handleBackup = async () => {
    try {
      const path = await api.backupDb();
      setBackupPath(path);
      alertCustom("Database backup successful!\nPath: " + path, "Backup Complete", "success");
    } catch (e) { alertCustom("Backup failed: " + e, "Backup Error", "error"); }
  };

  const handleRestore = async () => {
    const path = prompt("Enter the ABSOLUTE path to the backup file (.db):");
    if (!path) return;
    confirmCustom("RESTORE: This will overwrite your current database. Proceed?", async () => {
      try {
        await api.restoreDb(path);
        alertCustom("Database restored successfully! Application will reload.", "Restore Success", "success");
        setTimeout(() => window.location.reload(), 2000);
      } catch (e) { alertCustom("Restore failed: " + e, "Restore Error", "error"); }
    }, "Restore Database", "warning");
  };

  const handleResetClick = () => {
    setShowResetModal(true);
    setResetInput('');
  };

  const handleConfirmReset = () => {
    if (resetInput !== 'Reset') {
      alertCustom("Reset cancelled. Text did not match 'Reset' precisely.", "Cancelled", "info");
      setShowResetModal(false);
      return;
    }
    
    setShowResetModal(false);
    setLoading(true);
    api.resetDb()
      .then(() => {
        alertCustom("System Reset Successfully. The application will now reload.", "Reset Complete", "success");
        setTimeout(() => window.location.reload(), 2000);
      })
      .catch((e) => {
        alertCustom("Failed to reset system: " + e, "System Error", "error");
        setLoading(false);
      });
  };

  return (
    <>
      <style>{`
        

        .st-root {
          font-family: 'Nunito', sans-serif;
          animation: fadeIn 0.25s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .st-page-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: #1a3528;
          letter-spacing: -0.02em;
          margin: 0 0 0.2rem;
        }

        .st-page-sub {
          color: #7a9e8a;
          font-size: 0.875rem;
          font-weight: 500;
          margin: 0 0 2rem;
        }

        .st-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 1.5rem;
          align-items: start;
        }

        .st-left {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* Cards */
        .st-card {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 1.25rem;
          padding: 1.75rem;
        }

        .st-card-title {
          font-size: 1rem;
          font-weight: 800;
          color: #1a3528;
          margin: 0 0 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        /* Form */
        .st-form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .st-form-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
        }

        .st-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin-bottom: 1rem;
        }

        .st-form-group:last-child { margin-bottom: 0; }

        .st-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #7a9e8a;
        }

        .st-input {
          padding: 0.7rem 0.875rem;
          background: #edeae0;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.625rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.9rem;
          color: #1a3528;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          transition: border-color 0.12s;
        }

        .st-input:focus { border-color: #2d5a3d; }
        .st-input::placeholder { color: #b0a898; }

        .st-textarea {
          padding: 0.7rem 0.875rem;
          background: #edeae0;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.625rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.9rem;
          color: #1a3528;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          resize: vertical;
          min-height: 80px;
          transition: border-color 0.12s;
        }

        .st-textarea:focus { border-color: #2d5a3d; }
        .st-textarea::placeholder { color: #b0a898; }

        .st-section-divider {
          border: none;
          border-top: 1.5px solid #ddd8cc;
          margin: 1.25rem 0;
        }

        .st-section-subtitle {
          font-size: 0.82rem;
          font-weight: 700;
          color: #5a7a6a;
          margin: 0 0 0.875rem;
        }

        /* Logo upload */
        .st-logo-row {
          display: flex;
          gap: 0.65rem;
          align-items: center;
        }

        .st-logo-upload-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.65rem 1rem;
          background: #edeae0;
          border: 1.5px dashed #c8c4b8;
          border-radius: 0.625rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.82rem;
          font-weight: 600;
          color: #7a9e8a;
          cursor: pointer;
          transition: border-color 0.12s, background 0.12s;
        }

        .st-logo-upload-btn:hover { border-color: #2d5a3d; background: #e6ede8; color: #2d5a3d; }

        .st-logo-clear-btn {
          padding: 0.65rem 0.75rem;
          background: #fdf0f0;
          border: 1.5px solid #e8c0c0;
          border-radius: 0.625rem;
          color: #c05050;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: background 0.12s;
        }

        .st-logo-clear-btn:hover { background: #fae0e0; }

        .st-logo-note {
          font-size: 0.72rem;
          color: #2d5a3d;
          font-weight: 600;
          margin-top: 0.3rem;
        }

        /* Save button */
        .st-save-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.75rem 1.5rem;
          background: #2d5a3d;
          border: none;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.9rem;
          font-weight: 800;
          color: #e8f4ec;
          cursor: pointer;
          transition: background 0.12s, transform 0.1s;
          box-shadow: 0 3px 10px rgba(45,90,61,0.25);
          margin-top: 0.5rem;
        }

        .st-save-btn:hover:not(:disabled) { background: #245033; transform: translateY(-1px); }
        .st-save-btn:disabled { background: #7a9e8a; cursor: not-allowed; box-shadow: none; }

        /* DB buttons */
        .st-db-row {
          display: flex;
          gap: 0.75rem;
        }

        .st-db-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.75rem;
          background: #edeae0;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          color: #5a7a6a;
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s;
        }

        .st-db-btn:hover { background: #e6ede8; border-color: #2d5a3d; color: #1a3528; }

        .st-reset-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.75rem;
          background: #fdf0f0;
          border: 1.5px solid #e8c0c0;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.875rem;
          font-weight: 800;
          color: #c05050;
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s;
          margin-top: 0.75rem;
        }

        .st-reset-btn:hover { background: #fae0e0; border-color: #c05050; }

        /* Receipt preview */
        .st-preview-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #7a9e8a;
          margin-bottom: 0.75rem;
        }

        .st-receipt-card {
          background: #faf8f4;
          border: 1.5px solid #ddd8cc;
          border-radius: 1.125rem;
          padding: 2rem 1.75rem;
          min-height: 480px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          font-family: 'Courier New', monospace;
          color: #2a2a2a;
          position: sticky;
          top: 0;
        }

        .st-receipt-logo-placeholder {
          width: 52px;
          height: 52px;
          background: #edeae0;
          border-radius: 50%;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #b0a898;
        }

        .st-receipt-dashed {
          width: 100%;
          border: none;
          border-top: 1px dashed #c8c4b8;
          margin: 0.875rem 0;
        }

        .st-receipt-row {
          width: 100%;
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.4rem;
        }

        .st-receipt-total-row {
          width: 100%;
          display: flex;
          justify-content: space-between;
          font-weight: bold;
        }

        .st-backup-note {
          margin-top: 1rem;
          padding: 0.875rem 1rem;
          background: #edeae0;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.75rem;
          font-size: 0.72rem;
          color: #7a9e8a;
          overflow-wrap: break-word;
          width: 100%;
          box-sizing: border-box;
        }

        .st-backup-note-title {
          font-weight: 700;
          color: #1a3528;
          text-transform: uppercase;
          font-size: 0.62rem;
          letter-spacing: 0.07em;
          margin-bottom: 0.3rem;
        }
      `}</style>

      <div className="st-root">
        <h1 className="st-page-title">{t('settings')}</h1>
        <p className="st-page-sub">{t('configure_shop')}</p>

        <div className="st-grid">
          {/* Left column */}
          <div className="st-left">
            {/* Language Selection Card */}
            <div className="st-card">
              <h2 className="st-card-title">
                <Globe size={17} color="#2d5a3d" /> {t('language')}
              </h2>
              <div className="st-form-group" style={{ marginBottom: 0 }}>
                <label className="st-label">{t('select_language')}</label>
                <select 
                  className="st-input" 
                  value={i18n.language} 
                  onChange={handleLanguageChange}
                >
                  <option value="en">English</option>
                  <option value="si">සිංහල (Sinhala)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                </select>
              </div>
            </div>

            {/* Receipt config card */}
            <div className="st-card">
              <h2 className="st-card-title">
                <SettingsIcon size={17} color="#2d5a3d" /> {t('receipt_configuration')}
              </h2>

              <form onSubmit={handleSave}>
                <div className="st-form-grid-2">
                  <div className="st-form-group" style={{ marginBottom: 0 }}>
                    <label className="st-label">{t('shop_name')}</label>
                    <input required className="st-input" value={shopName} onChange={e => setShopName(e.target.value)} placeholder={t('eg_shop_name')} />
                  </div>
                  <div className="st-form-group" style={{ marginBottom: 0 }}>
                    <label className="st-label">{t('currency_symbol')}</label>
                    <input required className="st-input" value={currency} onChange={e => setCurrency(e.target.value)} placeholder="$, Rs., £…" />
                  </div>
                </div>

                <div className="st-form-group" style={{ marginTop: '1rem' }}>
                  <label className="st-label">{t('shop_logo')}</label>
                  <div className="st-logo-row">
                    <label className="st-logo-upload-btn">
                      <ImageIcon size={15} /> {t('upload_logo')}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) { const reader = new FileReader(); reader.onload = (ev) => setLogoUrl(ev.target?.result as string); reader.readAsDataURL(file); }
                      }} />
                    </label>
                    {logoUrl && !logoUrl.startsWith('http') && (
                      <button type="button" className="st-logo-clear-btn" onClick={() => setLogoUrl('')}><X size={15} /></button>
                    )}
                  </div>
                  {logoUrl && !logoUrl.startsWith('http') && <div className="st-logo-note">✓ Logo selected</div>}
                </div>

                <div className="st-form-group">
                  <label className="st-label">{t('header_message')}</label>
                  <input className="st-input" value={receiptText} onChange={e => setReceiptText(e.target.value)} placeholder={t('welcome_store')} />
                </div>

                <div className="st-form-group">
                  <label className="st-label">{t('footer_text')}</label>
                  <textarea className="st-textarea" value={footerText} onChange={e => setFooterText(e.target.value)} placeholder={t('thank_you_shopping')} />
                </div>

                <hr className="st-section-divider" />
                <div className="st-section-subtitle">{t('font_sizes')}</div>
                <div className="st-form-grid-3">
                  <div className="st-form-group" style={{ marginBottom: 0 }}>
                    <label className="st-label">{t('header')}</label>
                    <input type="number" className="st-input" value={fontSizeHeader} onChange={e => setFontSizeHeader(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="st-form-group" style={{ marginBottom: 0 }}>
                    <label className="st-label">{t('body')}</label>
                    <input type="number" className="st-input" value={fontSizeBody} onChange={e => setFontSizeBody(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="st-form-group" style={{ marginBottom: 0 }}>
                    <label className="st-label">{t('footer')}</label>
                    <input type="number" className="st-input" value={fontSizeFooter} onChange={e => setFontSizeFooter(parseInt(e.target.value) || 0)} />
                  </div>
                </div>

                <button type="submit" className="st-save-btn" disabled={loading}>
                  <Save size={16} /> {loading ? t('saving_changes') : t('save_all_settings')}
                </button>
              </form>
            </div>

            {/* Database card */}
            <div className="st-card">
              <h2 className="st-card-title">
                <Database size={17} color="#2d5a3d" /> {t('database_and_backup')}
              </h2>
              <div className="st-db-row">
                <button className="st-db-btn" onClick={handleBackup}>
                  <Download size={16} /> {t('export_backup')}
                </button>
                <button className="st-db-btn" onClick={handleRestore}>
                  <RefreshCw size={16} /> {t('import_restore')}
                </button>
              </div>
              <button className="st-reset-btn" onClick={handleResetClick} disabled={loading}>
                <Trash2 size={16} /> {t('total_factory_reset')}
              </button>
            </div>

            {/* Kiosk Mode card */}
            <div className="st-card">
              <h2 className="st-card-title">
                <Shield size={17} color="#2d5a3d" /> {t('kiosk_mode')}
              </h2>
              <p style={{ color: '#7a9e8a', fontSize: '0.8rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                {t('kiosk_mode_desc')}
              </p>

              <div className="st-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={kioskEnabled}
                    onChange={e => setKioskEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#2d5a3d' }}
                  />
                  <span style={{ fontWeight: 700, color: '#1a3528', fontSize: '0.9rem' }}>{t('kiosk_enable')}</span>
                </label>
              </div>

              {kioskEnabled && (
                <>
                  <div className="st-form-group">
                    <label className="st-label">{t('kiosk_pin_label')}</label>
                    <input
                      type="password"
                      className="st-input"
                      value={kioskPin}
                      onChange={e => setKioskPin(e.target.value)}
                      placeholder={t('kiosk_pin_placeholder')}
                      maxLength={20}
                      autoComplete="off"
                    />
                    <span style={{ fontSize: '0.7rem', color: '#7a9e8a', marginTop: '0.2rem' }}>{t('kiosk_pin_hint')}</span>
                  </div>

                  <div className="st-form-grid-2">
                    <div className="st-form-group" style={{ marginBottom: 0 }}>
                      <label className="st-label">{t('kiosk_idle_timeout')}</label>
                      <input
                        type="number"
                        className="st-input"
                        value={idleTimeoutMinutes}
                        onChange={e => setIdleTimeoutMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                        min={1}
                        max={60}
                      />
                    </div>
                    <div className="st-form-group" style={{ marginBottom: 0 }}>
                      <label className="st-label">&nbsp;</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.7rem 0' }}>
                        <input
                          type="checkbox"
                          checked={autoStartKiosk}
                          onChange={e => setAutoStartKiosk(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: '#2d5a3d' }}
                        />
                        <span style={{ fontWeight: 600, color: '#1a3528', fontSize: '0.82rem' }}>{t('kiosk_auto_start')}</span>
                      </label>
                    </div>
                  </div>

                  {!isKioskActive && (
                    <button
                      type="button"
                      className="st-save-btn"
                      style={{ marginTop: '1rem', background: '#8b5e3c', boxShadow: '0 3px 10px rgba(139,94,60,0.25)' }}
                      onClick={async () => {
                        if (!kioskPin.trim()) {
                          alertCustom(t('kiosk_pin_required'), t('kiosk_mode'), 'warning');
                          return;
                        }
                        await enterKiosk();
                      }}
                    >
                      <Shield size={16} /> {t('kiosk_enter_now')}
                    </button>
                  )}

                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#edeae0', borderRadius: '0.625rem', border: '1.5px solid #ddd8cc' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1a3528', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
                      {t('kiosk_shortcut_title')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#7a9e8a', lineHeight: 1.6 }}>
                      {t('kiosk_shortcut_desc')}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Customer Display card */}
            <div className="st-card">
              <h2 className="st-card-title">
                <Monitor size={17} color="#2d5a3d" /> {t('cd_customer_display')}
              </h2>
              <p style={{ color: '#7a9e8a', fontSize: '0.8rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                {t('cd_description')}
              </p>

              <div className="st-form-group">
                <label className="st-label">{t('cd_display_mode')}</label>
                <select
                  className="st-input"
                  value={displayMode}
                  onChange={e => setDisplayMode(e.target.value as CustomerDisplayMode)}
                >
                  <option value="disabled">{t('cd_disabled')}</option>
                  <option value="auto">{t('cd_auto_detect')}</option>
                  <option value="manual">{t('cd_select_screen')}</option>
                </select>
              </div>

              {displayMode === 'manual' && (
                <div className="st-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="st-label" style={{ margin: 0 }}>{t('cd_select_monitor')}</label>
                    <button
                      type="button"
                      onClick={refreshMonitors}
                      style={{
                        background: 'none', border: 'none', color: '#2d5a3d', cursor: 'pointer',
                        fontSize: '0.72rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif',
                        display: 'flex', alignItems: 'center', gap: '0.3rem'
                      }}
                    >
                      <RefreshCw size={12} /> {t('cd_refresh')}
                    </button>
                  </div>
                  <select
                    className="st-input"
                    value={selectedMonitorIndex}
                    onChange={e => setSelectedMonitorIndex(parseInt(e.target.value))}
                  >
                    {monitors.map((m, idx) => (
                      <option key={idx} value={idx}>
                        {m.name || `Monitor ${idx + 1}`} ({m.size.width}×{m.size.height})
                      </option>
                    ))}
                    {monitors.length === 0 && (
                      <option value={0}>{t('cd_no_monitors')}</option>
                    )}
                  </select>
                  <span style={{ fontSize: '0.7rem', color: '#7a9e8a', marginTop: '0.2rem' }}>
                    {t('cd_monitors_detected', { count: monitors.length })}
                  </span>
                </div>
              )}

              {displayMode !== 'disabled' && (
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {!isDisplayOpen ? (
                    <button
                      type="button"
                      className="st-save-btn"
                      style={{ background: '#2d5a3d' }}
                      onClick={openCustomerDisplay}
                    >
                      <Monitor size={16} /> {t('cd_open_display')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="st-save-btn"
                      style={{ background: '#c05050', boxShadow: '0 3px 10px rgba(192,80,80,0.25)' }}
                      onClick={closeCustomerDisplay}
                    >
                      <X size={16} /> {t('cd_close_display')}
                    </button>
                  )}
                </div>
              )}

              {isDisplayOpen && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#e6ede8', borderRadius: '0.625rem', border: '1.5px solid #c8ddd0' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2d5a3d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
                    {t('cd_status')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#2d5a3d', lineHeight: 1.6, fontWeight: 600 }}>
                    ✓ {t('cd_active_message')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Receipt preview */}
          <div>
            <div className="st-preview-label">{t('live_receipt_preview')}</div>
            <div className="st-receipt-card">
              {logoUrl
                ? <img src={logoUrl} alt="Logo" style={{ maxWidth: '90px', marginBottom: '1rem' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                : <div className="st-receipt-logo-placeholder"><ImageIcon size={22} /></div>}

              <div style={{ fontSize: `${fontSizeHeader}px`, fontWeight: 'bold', marginBottom: '0.2rem', color: '#1a1a1a' }}>
                {shopName || t('shop_name_placeholder')}
              </div>
              <div style={{ fontSize: `${fontSizeBody}px`, color: '#666', marginBottom: '0.5rem' }}>
                {receiptText || t('header_message_area')}
              </div>

              <hr className="st-receipt-dashed" />

              <div className="st-receipt-row" style={{ fontSize: `${fontSizeBody}px` }}>
                <span>{t('item')} × 1</span><span>{currency}10.00</span>
              </div>
              <div className="st-receipt-row" style={{ fontSize: `${fontSizeBody}px` }}>
                <span>{t('another_item')} × 2</span><span>{currency}20.00</span>
              </div>

              <hr className="st-receipt-dashed" />

              <div className="st-receipt-total-row" style={{ fontSize: `${fontSizeBody}px` }}>
                <span>{t('total_caps')}</span><span>{currency}30.00</span>
              </div>

              <div style={{ flex: 1 }} />

              <div style={{ fontSize: `${fontSizeFooter}px`, color: '#888', marginTop: '1.5rem' }}>
                {footerText || t('footer_branding_area')}
              </div>
              <div style={{ fontSize: '10px', color: '#b0a898', marginTop: '0.4rem' }}>
                {new Date().toLocaleString()}
              </div>
            </div>

            {backupPath && (
              <div className="st-backup-note">
                <div className="st-backup-note-title">{t('last_backup_path')}</div>
                {backupPath}
              </div>
            )}
          </div>
        </div>
      </div>

      {showResetModal && (
        <div className="custom-alert-overlay">
          <div className="custom-alert-card" style={{ maxWidth: '440px' }}>
            <div className="alert-icon-wrapper toast-error">
              <div className="toast-icon" style={{ width: '48px', height: '48px' }}>
                <Trash2 size={24} color="var(--danger)" />
              </div>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              Total Factory Reset
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              DANGER: This action is irreversible. It will completely wipe all sales data, inventory products, categories, users, and reset settings to their default values. <br/><br/>
              Type exactly <strong>Reset</strong> below to confirm.
            </p>
            <input 
              type="text" 
              className="st-input" 
              style={{ marginBottom: '1.5rem', background: '#fcfcfc', border: '2px solid #ddd8cc' }} 
              placeholder="Type 'Reset'..." 
              value={resetInput} 
              onChange={e => setResetInput(e.target.value)} 
            />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button 
                className="btn btn-outline" 
                style={{ flex: 1, padding: '1rem', borderRadius: '1rem' }}
                onClick={() => setShowResetModal(false)}
              >
                {t('cancel')}
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '1rem', borderRadius: '1rem', background: 'var(--danger)' }}
                onClick={handleConfirmReset}
                disabled={resetInput !== 'Reset'}
              >
                {t('reset_application')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;