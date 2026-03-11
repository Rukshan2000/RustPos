import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Phone, Mail } from 'lucide-react';
import { api, Supplier, SupplierWithStats } from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';

const SupplierList: React.FC = () => {
  const { currency } = useSettings();
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithStats | null>(null);
  const [form, setForm] = useState<Supplier>({
    name: '', contact_person: '', phone: '', company_name: '',
    email: '', address: '', tax_number: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSuppliers(); }, []);

  const loadSuppliers = async () => {
    try { setSuppliers(await api.getSuppliers()); } catch (e) { console.error(e); }
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search) ||
    s.contact_person.toLowerCase().includes(search.toLowerCase())
  );

  const openAddForm = () => {
    setEditingSupplier(null);
    setForm({ name: '', contact_person: '', phone: '', company_name: '', email: '', address: '', tax_number: '', notes: '' });
    setShowForm(true);
  };

  const openEditForm = (s: SupplierWithStats) => {
    setEditingSupplier(s);
    setForm({
      id: s.id, name: s.name, contact_person: s.contact_person, phone: s.phone,
      company_name: s.company_name || '', email: s.email || '', address: s.address || '',
      tax_number: s.tax_number || '', notes: s.notes || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    try {
      if (editingSupplier) {
        await api.updateSupplier({ ...form, id: editingSupplier.id });
      } else {
        await api.addSupplier(form);
      }
      setShowForm(false);
      loadSuppliers();
    } catch (e: any) { alert(e); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('sup_confirm_delete'))) return;
    try { await api.deleteSupplier(id); loadSuppliers(); }
    catch (e: any) { alert(e); }
  };

  const totalPurchases = suppliers.reduce((a, s) => a + s.total_purchases, 0);
  const totalOutstanding = suppliers.reduce((a, s) => a + s.outstanding_balance, 0);

  return (
    <>
      <style>{`
        .sp-root { font-family: 'Nunito', sans-serif; animation: fadeIn 0.25s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .sp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
        .sp-title { font-size: 1.85rem; font-weight: 800; color: #1a3528; letter-spacing: -0.02em; margin: 0 0 0.2rem; }
        .sp-subtitle { color: #7a9e8a; font-size: 0.875rem; font-weight: 500; margin: 0; }
        .sp-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1.1rem; border: none; border-radius: 0.7rem;
          font-family: 'Nunito', sans-serif; font-size: 0.85rem; font-weight: 700; cursor: pointer;
          transition: background 0.12s, transform 0.1s; }
        .sp-btn:hover { transform: translateY(-1px); }
        .sp-btn-primary { background: #2d5a3d; color: #e8f4ec; box-shadow: 0 3px 10px rgba(45,90,61,0.25); }
        .sp-btn-primary:hover { background: #245033; }
        .sp-btn-danger { background: #fdf0f0; color: #c05050; border: 1.5px solid #f0d0d0; }
        .sp-btn-danger:hover { background: #fce4e4; }
        .sp-btn-sm { padding: 0.4rem 0.7rem; font-size: 0.78rem; }

        .sp-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .sp-stat-card { background: #f5f0e8; border: 1.5px solid #ddd8cc; border-radius: 1rem; padding: 1rem 1.25rem; border-left: 4px solid #2d5a3d; }
        .sp-stat-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #7a9e8a; margin-bottom: 0.3rem; }
        .sp-stat-value { font-size: 1.6rem; font-weight: 800; color: #1a3528; line-height: 1; }

        .sp-search-bar { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 1.25rem; }
        .sp-search-input { flex: 1; padding: 0.65rem 0.9rem 0.65rem 2.5rem; background: #f5f0e8; border: 1.5px solid #ddd8cc;
          border-radius: 0.75rem; font-family: 'Nunito', sans-serif; font-size: 0.875rem; color: #1a3528; outline: none; }
        .sp-search-input:focus { border-color: #2d5a3d; }
        .sp-search-icon { position: absolute; left: 0.8rem; color: #b0a898; pointer-events: none; }

        .sp-table-card { background: #f5f0e8; border: 1.5px solid #ddd8cc; border-radius: 1rem; overflow: hidden; }
        .sp-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        .sp-table thead tr { background: #edeae0; border-bottom: 1.5px solid #ddd8cc; }
        .sp-table th { padding: 0.7rem 1rem; text-align: left; font-size: 0.68rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.07em; color: #7a9e8a; }
        .sp-table tbody tr { border-bottom: 1px solid #e8e4d8; transition: background 0.1s; }
        .sp-table tbody tr:last-child { border-bottom: none; }
        .sp-table tbody tr:hover { background: #edeae0; }
        .sp-table td { padding: 0.75rem 1rem; vertical-align: middle; color: #1a3528; }

        .sp-name { font-weight: 700; }
        .sp-company { color: #7a9e8a; font-size: 0.75rem; }
        .sp-contact-info { display: flex; align-items: center; gap: 0.3rem; color: #5a7a6a; font-size: 0.8rem; }
        .sp-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 0.4rem; font-size: 0.7rem; font-weight: 700; }
        .sp-badge-green { background: #d4edda; color: #155724; }
        .sp-badge-red { background: #f8d7da; color: #721c24; }
        .sp-actions { display: flex; gap: 0.35rem; }

        /* Modal */
        .sp-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center;
          justify-content: center; z-index: 999; animation: fadeIn 0.15s ease; }
        .sp-modal { background: #f5f0e8; border-radius: 1.25rem; padding: 2rem; width: 560px; max-height: 90vh;
          overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
        .sp-modal-title { font-size: 1.25rem; font-weight: 800; color: #1a3528; margin: 0 0 1.5rem; display: flex;
          align-items: center; justify-content: space-between; }
        .sp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .sp-form-full { grid-column: 1 / -1; }
        .sp-form-group { display: flex; flex-direction: column; gap: 0.3rem; }
        .sp-form-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #7a9e8a; }
        .sp-form-input { padding: 0.6rem 0.8rem; background: #edeae0; border: 1.5px solid #ddd8cc; border-radius: 0.6rem;
          font-family: 'Nunito', sans-serif; font-size: 0.85rem; color: #1a3528; outline: none; resize: vertical; }
        .sp-form-input:focus { border-color: #2d5a3d; }
        .sp-form-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }
        .sp-btn-cancel { background: #edeae0; color: #1a3528; border: 1.5px solid #ddd8cc; }
        .sp-btn-cancel:hover { background: #e4e0d4; }
        .sp-empty { text-align: center; padding: 3rem 1rem; color: #7a9e8a; font-weight: 600; }
      `}</style>

      <div className="sp-root">
        {/* Header */}
        <div className="sp-header">
          <div>
            <h1 className="sp-title">{t('sup_suppliers')}</h1>
            <p className="sp-subtitle">{t('sup_subtitle')}</p>
          </div>
          <button className="sp-btn sp-btn-primary" onClick={openAddForm}>
            <Plus size={16} /> {t('sup_add_supplier')}
          </button>
        </div>

        {/* Stats */}
        <div className="sp-stats">
          <div className="sp-stat-card">
            <div className="sp-stat-label">{t('sup_total_suppliers')}</div>
            <div className="sp-stat-value">{suppliers.length}</div>
          </div>
          <div className="sp-stat-card" style={{ borderLeftColor: '#4a8f6a' }}>
            <div className="sp-stat-label">{t('sup_total_purchases')}</div>
            <div className="sp-stat-value" style={{ color: '#2d5a3d' }}>{currency}{totalPurchases.toFixed(2)}</div>
          </div>
          <div className="sp-stat-card" style={{ borderLeftColor: '#c05050' }}>
            <div className="sp-stat-label">{t('sup_outstanding')}</div>
            <div className="sp-stat-value" style={{ color: '#c05050' }}>{currency}{totalOutstanding.toFixed(2)}</div>
          </div>
        </div>

        {/* Search */}
        <div className="sp-search-bar">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} className="sp-search-icon" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="sp-search-input" placeholder={t('sup_search_placeholder')}
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="sp-table-card">
          <table className="sp-table">
            <thead><tr>
              <th>{t('sup_name')}</th>
              <th>{t('sup_contact')}</th>
              <th>{t('sup_total_purchases')}</th>
              <th>{t('sup_outstanding')}</th>
              <th>{t('actions')}</th>
            </tr></thead>
            <tbody>
              {filtered.length ? filtered.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="sp-name">{s.name}</div>
                    {s.company_name && <div className="sp-company">{s.company_name}</div>}
                  </td>
                  <td>
                    <div className="sp-contact-info"><Phone size={12} /> {s.phone}</div>
                    {s.email && <div className="sp-contact-info"><Mail size={12} /> {s.email}</div>}
                  </td>
                  <td style={{ fontWeight: 700 }}>{currency}{s.total_purchases.toFixed(2)}</td>
                  <td>
                    {s.outstanding_balance > 0 ? (
                      <span className="sp-badge sp-badge-red">{currency}{s.outstanding_balance.toFixed(2)}</span>
                    ) : (
                      <span className="sp-badge sp-badge-green">{currency}0.00</span>
                    )}
                  </td>
                  <td>
                    <div className="sp-actions">
                      <button className="sp-btn sp-btn-sm sp-btn-cancel" onClick={() => openEditForm(s)}>
                        <Edit2 size={13} />
                      </button>
                      <button className="sp-btn sp-btn-sm sp-btn-danger" onClick={() => handleDelete(s.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="sp-empty">
                  {search ? t('sup_no_results') : t('sup_no_suppliers')}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showForm && (
          <div className="sp-overlay" onClick={() => setShowForm(false)}>
            <div className="sp-modal" onClick={e => e.stopPropagation()}>
              <div className="sp-modal-title">
                <span>{editingSupplier ? t('sup_edit_supplier') : t('sup_add_supplier')}</span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a9e8a' }}
                  onClick={() => setShowForm(false)}><X size={20} /></button>
              </div>

              <div className="sp-form-grid">
                <div className="sp-form-group">
                  <label className="sp-form-label">{t('sup_name')} *</label>
                  <input className="sp-form-input" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('sup_name_placeholder')} />
                </div>
                <div className="sp-form-group">
                  <label className="sp-form-label">{t('sup_company_name')}</label>
                  <input className="sp-form-input" value={form.company_name || ''}
                    onChange={e => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div className="sp-form-group">
                  <label className="sp-form-label">{t('sup_contact_person')}</label>
                  <input className="sp-form-input" value={form.contact_person}
                    onChange={e => setForm({ ...form, contact_person: e.target.value })} />
                </div>
                <div className="sp-form-group">
                  <label className="sp-form-label">{t('sup_phone')} *</label>
                  <input className="sp-form-input" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07X XXXX XXX" />
                </div>
                <div className="sp-form-group">
                  <label className="sp-form-label">{t('sup_email')}</label>
                  <input className="sp-form-input" type="email" value={form.email || ''}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="sp-form-group">
                  <label className="sp-form-label">{t('sup_tax_number')}</label>
                  <input className="sp-form-input" value={form.tax_number || ''}
                    onChange={e => setForm({ ...form, tax_number: e.target.value })} />
                </div>
                <div className="sp-form-group sp-form-full">
                  <label className="sp-form-label">{t('sup_address')}</label>
                  <input className="sp-form-input" value={form.address || ''}
                    onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="sp-form-group sp-form-full">
                  <label className="sp-form-label">{t('sup_notes')}</label>
                  <textarea className="sp-form-input" rows={3} value={form.notes || ''}
                    onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>

              <div className="sp-form-actions">
                <button className="sp-btn sp-btn-cancel" onClick={() => setShowForm(false)}>{t('cancel')}</button>
                <button className="sp-btn sp-btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? t('loading') : (editingSupplier ? t('save_changes') : t('sup_add_supplier'))}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SupplierList;
