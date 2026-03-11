import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Printer, Download, X, Trash2, Check } from 'lucide-react';
import { api, Product, SupplierWithStats, PurchaseInvoiceSummary, PurchaseInvoiceWithItems, PurchaseInvoiceItem } from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceItemRow {
  product_id: number;
  product_name: string;
  quantity: number;
  purchase_price: number;
  discount: number;
  tax: number;
  subtotal: number;
}

const PurchaseInvoices: React.FC = () => {
  const { currency } = useSettings();
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<PurchaseInvoiceSummary[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Filters
  const [filterSupplier, setFilterSupplier] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  // View details
  const [viewDetail, setViewDetail] = useState<PurchaseInvoiceWithItems | null>(null);

  // Create invoice
  const [showCreate, setShowCreate] = useState(false);
  const [createSupplierId, setCreateSupplierId] = useState<number>(0);
  const [createDate, setCreateDate] = useState(new Date().toISOString().slice(0, 10));
  const [createPaymentStatus, setCreatePaymentStatus] = useState('unpaid');
  const [createNotes, setCreateNotes] = useState('');
  const [createItems, setCreateItems] = useState<InvoiceItemRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, []);

  useEffect(() => { loadInvoices(); }, [filterSupplier, filterStatus, startDate, endDate]);

  const loadSuppliers = async () => {
    try { setSuppliers(await api.getSuppliers()); } catch (e) { console.error(e); }
  };
  const loadProducts = async () => {
    try { setProducts(await api.getProducts()); } catch (e) { console.error(e); }
  };
  const loadInvoices = async () => {
    try {
      setInvoices(await api.getPurchaseInvoices(
        filterSupplier ? Number(filterSupplier) : undefined,
        startDate || undefined, endDate || undefined,
        filterStatus || undefined
      ));
    } catch (e) { console.error(e); }
  };

  const filtered = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    inv.supplier_name.toLowerCase().includes(search.toLowerCase())
  );

  // Totals
  const totalAmount = filtered.reduce((a, i) => a + i.grand_total, 0);
  const paidCount = filtered.filter(i => i.payment_status === 'paid').length;
  const unpaidCount = filtered.filter(i => i.payment_status === 'unpaid').length;

  // Create invoice helpers
  const addItem = () => {
    setCreateItems([...createItems, { product_id: 0, product_name: '', quantity: 1, purchase_price: 0, discount: 0, tax: 0, subtotal: 0 }]);
  };
  const updateItem = (idx: number, field: keyof InvoiceItemRow, value: any) => {
    const items = [...createItems];
    (items[idx] as any)[field] = value;
    if (field === 'product_id') {
      const p = products.find(pr => pr.id === Number(value));
      if (p) items[idx].product_name = p.name;
    }
    // Recalculate subtotal
    const item = items[idx];
    item.subtotal = (item.quantity * item.purchase_price) - item.discount + item.tax;
    setCreateItems(items);
  };
  const removeItem = (idx: number) => setCreateItems(createItems.filter((_, i) => i !== idx));

  const invoiceSubtotal = createItems.reduce((a, i) => a + (i.quantity * i.purchase_price), 0);
  const invoiceDiscount = createItems.reduce((a, i) => a + i.discount, 0);
  const invoiceTax = createItems.reduce((a, i) => a + i.tax, 0);
  const invoiceGrandTotal = invoiceSubtotal - invoiceDiscount + invoiceTax;

  const openCreateForm = () => {
    setCreateSupplierId(0);
    setCreateDate(new Date().toISOString().slice(0, 10));
    setCreatePaymentStatus('unpaid');
    setCreateNotes('');
    setCreateItems([]);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!createSupplierId || createItems.length === 0) return;
    if (createItems.some(i => !i.product_id || i.quantity <= 0 || i.purchase_price <= 0)) {
      alert(t('sup_fill_all_items'));
      return;
    }
    setSaving(true);
    try {
      const items: PurchaseInvoiceItem[] = createItems.map(i => ({
        product_id: Number(i.product_id),
        quantity: i.quantity,
        purchase_price: i.purchase_price,
        discount: i.discount,
        tax: i.tax,
        subtotal: i.subtotal,
      }));
      await api.createPurchaseInvoice(
        createSupplierId, createDate, invoiceSubtotal, invoiceDiscount,
        invoiceTax, invoiceGrandTotal, createPaymentStatus, createNotes || undefined, items
      );
      setShowCreate(false);
      loadInvoices();
      loadProducts(); // refresh stock
    } catch (e: any) { alert(e); }
    setSaving(false);
  };

  const viewInvoiceDetails = async (id: number) => {
    try { setViewDetail(await api.getPurchaseInvoiceDetails(id)); } catch (e) { console.error(e); }
  };

  const updateStatus = async (id: number, status: string) => {
    try { await api.updatePurchaseInvoiceStatus(id, status); loadInvoices(); } catch (e: any) { alert(e); }
  };

  const exportPDF = (detail: PurchaseInvoiceWithItems) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(t('sup_purchase_invoice'), 14, 20);
    doc.setFontSize(10);
    doc.text(`${t('sup_invoice_no')}: ${detail.invoice.invoice_number}`, 14, 30);
    doc.text(`${t('sup_supplier')}: ${detail.supplier_name}`, 14, 36);
    doc.text(`${t('date')}: ${detail.invoice.date}`, 14, 42);
    doc.text(`${t('sup_payment_status')}: ${detail.invoice.payment_status}`, 14, 48);

    autoTable(doc, {
      head: [[t('product_header'), t('quantity'), t('sup_unit_price'), t('sup_discount'), t('sup_tax'), t('subtotal')]],
      body: detail.items.map(i => [
        i.product_name, i.quantity.toString(), `${currency}${i.purchase_price.toFixed(2)}`,
        `${currency}${i.discount.toFixed(2)}`, `${currency}${i.tax.toFixed(2)}`, `${currency}${i.subtotal.toFixed(2)}`
      ]),
      startY: 54,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [45, 90, 61] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(10);
    doc.text(`${t('subtotal')}: ${currency}${detail.invoice.subtotal.toFixed(2)}`, 140, finalY + 10);
    doc.text(`${t('sup_discount')}: ${currency}${detail.invoice.discount.toFixed(2)}`, 140, finalY + 16);
    doc.text(`${t('sup_tax')}: ${currency}${detail.invoice.tax.toFixed(2)}`, 140, finalY + 22);
    doc.setFontSize(12);
    doc.text(`${t('sup_grand_total')}: ${currency}${detail.invoice.grand_total.toFixed(2)}`, 140, finalY + 30);

    doc.save(`${detail.invoice.invoice_number}.pdf`);
  };

  const statusBadge = (status: string) => {
    const cls = status === 'paid' ? 'pi-badge-green' : status === 'partial' ? 'pi-badge-yellow' : 'pi-badge-red';
    return <span className={`pi-badge ${cls}`}>{t(`sup_status_${status}`)}</span>;
  };

  return (
    <>
      <style>{`
        .pi-root { font-family: 'Nunito', sans-serif; animation: fadeIn 0.25s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .pi-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
        .pi-title { font-size: 1.85rem; font-weight: 800; color: #1a3528; letter-spacing: -0.02em; margin: 0 0 0.2rem; }
        .pi-subtitle { color: #7a9e8a; font-size: 0.875rem; font-weight: 500; margin: 0; }
        .pi-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1.1rem; border: none; border-radius: 0.7rem;
          font-family: 'Nunito', sans-serif; font-size: 0.85rem; font-weight: 700; cursor: pointer;
          transition: background 0.12s, transform 0.1s; }
        .pi-btn:hover { transform: translateY(-1px); }
        .pi-btn-primary { background: #2d5a3d; color: #e8f4ec; box-shadow: 0 3px 10px rgba(45,90,61,0.25); }
        .pi-btn-primary:hover { background: #245033; }
        .pi-btn-sm { padding: 0.4rem 0.7rem; font-size: 0.78rem; }
        .pi-btn-cancel { background: #edeae0; color: #1a3528; border: 1.5px solid #ddd8cc; }
        .pi-btn-cancel:hover { background: #e4e0d4; }
        .pi-btn-danger { background: #fdf0f0; color: #c05050; border: 1.5px solid #f0d0d0; }

        .pi-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .pi-stat-card { background: #f5f0e8; border: 1.5px solid #ddd8cc; border-radius: 1rem; padding: 1rem 1.25rem; border-left: 4px solid #2d5a3d; }
        .pi-stat-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #7a9e8a; margin-bottom: 0.3rem; }
        .pi-stat-value { font-size: 1.5rem; font-weight: 800; color: #1a3528; line-height: 1; }

        .pi-filter-row { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1.25rem; align-items: center; }
        .pi-filter-select, .pi-filter-input { padding: 0.55rem 0.8rem; background: #f5f0e8; border: 1.5px solid #ddd8cc;
          border-radius: 0.7rem; font-family: 'Nunito', sans-serif; font-size: 0.82rem; color: #1a3528; outline: none; }
        .pi-filter-select:focus, .pi-filter-input:focus { border-color: #2d5a3d; }
        .pi-search-wrap { position: relative; flex: 1; min-width: 180px; }
        .pi-search-icon { position: absolute; left: 0.8rem; top: 50%; transform: translateY(-50%); color: #b0a898; pointer-events: none; }
        .pi-search-input { width: 100%; padding: 0.55rem 0.8rem 0.55rem 2.4rem; background: #f5f0e8; border: 1.5px solid #ddd8cc;
          border-radius: 0.7rem; font-family: 'Nunito', sans-serif; font-size: 0.82rem; color: #1a3528; outline: none; box-sizing: border-box; }
        .pi-search-input:focus { border-color: #2d5a3d; }

        .pi-table-card { background: #f5f0e8; border: 1.5px solid #ddd8cc; border-radius: 1rem; overflow: hidden; }
        .pi-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        .pi-table thead tr { background: #edeae0; border-bottom: 1.5px solid #ddd8cc; }
        .pi-table th { padding: 0.7rem 1rem; text-align: left; font-size: 0.68rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.07em; color: #7a9e8a; }
        .pi-table tbody tr { border-bottom: 1px solid #e8e4d8; transition: background 0.1s; }
        .pi-table tbody tr:last-child { border-bottom: none; }
        .pi-table tbody tr:hover { background: #edeae0; }
        .pi-table td { padding: 0.75rem 1rem; vertical-align: middle; color: #1a3528; }
        .pi-actions { display: flex; gap: 0.35rem; }

        .pi-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 0.4rem; font-size: 0.7rem; font-weight: 700; }
        .pi-badge-green { background: #d4edda; color: #155724; }
        .pi-badge-red { background: #f8d7da; color: #721c24; }
        .pi-badge-yellow { background: #fff3cd; color: #856404; }

        /* Modal */
        .pi-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center;
          justify-content: center; z-index: 999; animation: fadeIn 0.15s ease; }
        .pi-modal { background: #f5f0e8; border-radius: 1.25rem; padding: 2rem; width: 700px; max-height: 90vh;
          overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
        .pi-modal-lg { width: 850px; }
        .pi-modal-title { font-size: 1.25rem; font-weight: 800; color: #1a3528; margin: 0 0 1.5rem; display: flex;
          align-items: center; justify-content: space-between; }
        .pi-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        .pi-form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        .pi-form-group { display: flex; flex-direction: column; gap: 0.3rem; }
        .pi-form-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #7a9e8a; }
        .pi-form-input, .pi-form-select { padding: 0.55rem 0.8rem; background: #edeae0; border: 1.5px solid #ddd8cc; border-radius: 0.6rem;
          font-family: 'Nunito', sans-serif; font-size: 0.85rem; color: #1a3528; outline: none; }
        .pi-form-input:focus, .pi-form-select:focus { border-color: #2d5a3d; }

        .pi-items-header { font-size: 0.85rem; font-weight: 700; color: #1a3528; margin: 1rem 0 0.5rem; display: flex;
          align-items: center; justify-content: space-between; }
        .pi-item-row { display: grid; grid-template-columns: 2fr 1fr 1fr 0.8fr 0.8fr 1fr 40px; gap: 0.5rem; margin-bottom: 0.4rem; align-items: center; }
        .pi-item-input { padding: 0.4rem 0.6rem; background: #edeae0; border: 1.5px solid #ddd8cc; border-radius: 0.5rem;
          font-family: 'Nunito', sans-serif; font-size: 0.8rem; color: #1a3528; outline: none; width: 100%; box-sizing: border-box; }
        .pi-item-input:focus { border-color: #2d5a3d; }
        .pi-item-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: #7a9e8a; letter-spacing: 0.05em; }

        .pi-totals { display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem; margin-top: 1rem;
          padding: 1rem; background: #edeae0; border-radius: 0.75rem; }
        .pi-total-row { display: flex; gap: 2rem; font-size: 0.85rem; }
        .pi-total-label { color: #7a9e8a; font-weight: 600; }
        .pi-total-value { font-weight: 700; color: #1a3528; min-width: 100px; text-align: right; }
        .pi-grand-total { font-size: 1.1rem; font-weight: 800; color: #2d5a3d; }

        .pi-form-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }
        .pi-empty { text-align: center; padding: 3rem 1rem; color: #7a9e8a; font-weight: 600; }

        .pi-detail-section { margin-bottom: 1rem; }
        .pi-detail-row { display: flex; gap: 1.5rem; margin-bottom: 0.3rem; font-size: 0.85rem; }
        .pi-detail-label { color: #7a9e8a; font-weight: 600; min-width: 130px; }
        .pi-detail-value { color: #1a3528; font-weight: 700; }
        .pi-detail-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }

        .pi-status-selector { display: flex; gap: 0.3rem; margin-top: 0.6rem; }
        .pi-status-btn { padding: 0.3rem 0.7rem; border-radius: 0.5rem; font-size: 0.72rem; font-weight: 700;
          font-family: 'Nunito', sans-serif; cursor: pointer; border: 1.5px solid #ddd8cc; background: #edeae0; color: #1a3528; }
        .pi-status-btn.active { background: #2d5a3d; color: white; border-color: #2d5a3d; }
      `}</style>

      <div className="pi-root">
        {/* Header */}
        <div className="pi-header">
          <div>
            <h1 className="pi-title">{t('sup_purchases')}</h1>
            <p className="pi-subtitle">{t('sup_purchases_subtitle')}</p>
          </div>
          <button className="pi-btn pi-btn-primary" onClick={openCreateForm}>
            <Plus size={16} /> {t('sup_new_invoice')}
          </button>
        </div>

        {/* Stats */}
        <div className="pi-stats">
          <div className="pi-stat-card">
            <div className="pi-stat-label">{t('sup_total_invoices')}</div>
            <div className="pi-stat-value">{filtered.length}</div>
          </div>
          <div className="pi-stat-card" style={{ borderLeftColor: '#4a8f6a' }}>
            <div className="pi-stat-label">{t('sup_total_amount')}</div>
            <div className="pi-stat-value" style={{ color: '#2d5a3d' }}>{currency}{totalAmount.toFixed(2)}</div>
          </div>
          <div className="pi-stat-card" style={{ borderLeftColor: '#28a745' }}>
            <div className="pi-stat-label">{t('sup_status_paid')}</div>
            <div className="pi-stat-value" style={{ color: '#155724' }}>{paidCount}</div>
          </div>
          <div className="pi-stat-card" style={{ borderLeftColor: '#c05050' }}>
            <div className="pi-stat-label">{t('sup_status_unpaid')}</div>
            <div className="pi-stat-value" style={{ color: '#c05050' }}>{unpaidCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="pi-filter-row">
          <div className="pi-search-wrap">
            <Search size={15} className="pi-search-icon" />
            <input className="pi-search-input" placeholder={t('sup_search_invoices')}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="pi-filter-select" value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}>
            <option value="">{t('sup_all_suppliers')}</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="pi-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">{t('sup_all_statuses')}</option>
            <option value="paid">{t('sup_status_paid')}</option>
            <option value="unpaid">{t('sup_status_unpaid')}</option>
            <option value="partial">{t('sup_status_partial')}</option>
          </select>
          <input className="pi-filter-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input className="pi-filter-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>

        {/* Table */}
        <div className="pi-table-card">
          <table className="pi-table">
            <thead><tr>
              <th>{t('sup_invoice_no')}</th>
              <th>{t('sup_supplier')}</th>
              <th>{t('date')}</th>
              <th>{t('sup_grand_total')}</th>
              <th>{t('sup_payment_status')}</th>
              <th>{t('actions')}</th>
            </tr></thead>
            <tbody>
              {filtered.length ? filtered.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem' }}>{inv.invoice_number}</td>
                  <td>{inv.supplier_name}</td>
                  <td>{inv.date}</td>
                  <td style={{ fontWeight: 700 }}>{currency}{inv.grand_total.toFixed(2)}</td>
                  <td>{statusBadge(inv.payment_status)}</td>
                  <td>
                    <div className="pi-actions">
                      <button className="pi-btn pi-btn-sm pi-btn-cancel" onClick={() => viewInvoiceDetails(inv.id)} title={t('sup_view_details')}>
                        <Eye size={13} />
                      </button>
                      {inv.payment_status !== 'paid' && (
                        <button className="pi-btn pi-btn-sm pi-btn-primary" onClick={() => updateStatus(inv.id, 'paid')} title={t('sup_mark_paid')}>
                          <Check size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="pi-empty">
                  {search || filterSupplier || filterStatus || startDate || endDate ? t('sup_no_results') : t('sup_no_invoices')}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* View Detail Modal */}
        {viewDetail && (
          <div className="pi-overlay" onClick={() => setViewDetail(null)}>
            <div className="pi-modal pi-modal-lg" onClick={e => e.stopPropagation()}>
              <div className="pi-modal-title">
                <span>{t('sup_invoice_details')}</span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a9e8a' }}
                  onClick={() => setViewDetail(null)}><X size={20} /></button>
              </div>

              <div className="pi-detail-section">
                <div className="pi-detail-row">
                  <span className="pi-detail-label">{t('sup_invoice_no')}:</span>
                  <span className="pi-detail-value">{viewDetail.invoice.invoice_number}</span>
                </div>
                <div className="pi-detail-row">
                  <span className="pi-detail-label">{t('sup_supplier')}:</span>
                  <span className="pi-detail-value">{viewDetail.supplier_name}</span>
                </div>
                <div className="pi-detail-row">
                  <span className="pi-detail-label">{t('date')}:</span>
                  <span className="pi-detail-value">{viewDetail.invoice.date}</span>
                </div>
                <div className="pi-detail-row">
                  <span className="pi-detail-label">{t('sup_payment_status')}:</span>
                  <span className="pi-detail-value">{statusBadge(viewDetail.invoice.payment_status)}</span>
                </div>
                {viewDetail.invoice.notes && (
                  <div className="pi-detail-row">
                    <span className="pi-detail-label">{t('sup_notes')}:</span>
                    <span className="pi-detail-value">{viewDetail.invoice.notes}</span>
                  </div>
                )}
              </div>

              <div className="pi-detail-section">
                <table className="pi-table" style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1.5px solid #ddd8cc' }}>
                  <thead><tr>
                    <th>{t('product_header')}</th>
                    <th>{t('quantity')}</th>
                    <th>{t('sup_unit_price')}</th>
                    <th>{t('sup_discount')}</th>
                    <th>{t('sup_tax')}</th>
                    <th>{t('subtotal')}</th>
                  </tr></thead>
                  <tbody>
                    {viewDetail.items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>{currency}{item.purchase_price.toFixed(2)}</td>
                        <td>{currency}{item.discount.toFixed(2)}</td>
                        <td>{currency}{item.tax.toFixed(2)}</td>
                        <td style={{ fontWeight: 700 }}>{currency}{item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pi-totals">
                <div className="pi-total-row">
                  <span className="pi-total-label">{t('subtotal')}:</span>
                  <span className="pi-total-value">{currency}{viewDetail.invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="pi-total-row">
                  <span className="pi-total-label">{t('sup_discount')}:</span>
                  <span className="pi-total-value">-{currency}{viewDetail.invoice.discount.toFixed(2)}</span>
                </div>
                <div className="pi-total-row">
                  <span className="pi-total-label">{t('sup_tax')}:</span>
                  <span className="pi-total-value">+{currency}{viewDetail.invoice.tax.toFixed(2)}</span>
                </div>
                <div className="pi-total-row pi-grand-total">
                  <span className="pi-total-label">{t('sup_grand_total')}:</span>
                  <span className="pi-total-value">{currency}{viewDetail.invoice.grand_total.toFixed(2)}</span>
                </div>
              </div>

              {/* Status changer + actions */}
              <div className="pi-status-selector">
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7a9e8a', alignSelf: 'center', marginRight: '0.3rem' }}>{t('sup_change_status')}:</span>
                {['unpaid', 'partial', 'paid'].map(s => (
                  <button key={s} className={`pi-status-btn ${viewDetail.invoice.payment_status === s ? 'active' : ''}`}
                    onClick={() => { updateStatus(viewDetail.invoice.id!, s); setViewDetail({ ...viewDetail, invoice: { ...viewDetail.invoice, payment_status: s } }); }}>
                    {t(`sup_status_${s}`)}
                  </button>
                ))}
              </div>

              <div className="pi-detail-actions">
                <button className="pi-btn pi-btn-primary" onClick={() => exportPDF(viewDetail)}>
                  <Download size={14} /> {t('sup_export_pdf')}
                </button>
                <button className="pi-btn pi-btn-cancel" onClick={() => window.print()}>
                  <Printer size={14} /> {t('print')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Invoice Modal */}
        {showCreate && (
          <div className="pi-overlay" onClick={() => setShowCreate(false)}>
            <div className="pi-modal pi-modal-lg" onClick={e => e.stopPropagation()}>
              <div className="pi-modal-title">
                <span>{t('sup_new_invoice')}</span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a9e8a' }}
                  onClick={() => setShowCreate(false)}><X size={20} /></button>
              </div>

              <div className="pi-form-row">
                <div className="pi-form-group">
                  <label className="pi-form-label">{t('sup_supplier')} *</label>
                  <select className="pi-form-select" value={createSupplierId} onChange={e => setCreateSupplierId(Number(e.target.value))}>
                    <option value={0}>{t('sup_select_supplier')}</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="pi-form-group">
                  <label className="pi-form-label">{t('date')} *</label>
                  <input className="pi-form-input" type="date" value={createDate}
                    onChange={e => setCreateDate(e.target.value)} />
                </div>
              </div>

              <div className="pi-form-row">
                <div className="pi-form-group">
                  <label className="pi-form-label">{t('sup_payment_status')}</label>
                  <select className="pi-form-select" value={createPaymentStatus}
                    onChange={e => setCreatePaymentStatus(e.target.value)}>
                    <option value="unpaid">{t('sup_status_unpaid')}</option>
                    <option value="partial">{t('sup_status_partial')}</option>
                    <option value="paid">{t('sup_status_paid')}</option>
                  </select>
                </div>
                <div className="pi-form-group">
                  <label className="pi-form-label">{t('sup_notes')}</label>
                  <input className="pi-form-input" value={createNotes}
                    onChange={e => setCreateNotes(e.target.value)} placeholder={t('sup_notes_placeholder')} />
                </div>
              </div>

              {/* Items */}
              <div className="pi-items-header">
                <span>{t('sup_items')}</span>
                <button className="pi-btn pi-btn-sm pi-btn-primary" onClick={addItem}>
                  <Plus size={14} /> {t('sup_add_item')}
                </button>
              </div>

              {/* Item header labels */}
              {createItems.length > 0 && (
                <div className="pi-item-row" style={{ marginBottom: '0.2rem' }}>
                  <span className="pi-item-label">{t('product_header')}</span>
                  <span className="pi-item-label">{t('quantity')}</span>
                  <span className="pi-item-label">{t('sup_unit_price')}</span>
                  <span className="pi-item-label">{t('sup_discount')}</span>
                  <span className="pi-item-label">{t('sup_tax')}</span>
                  <span className="pi-item-label">{t('subtotal')}</span>
                  <span></span>
                </div>
              )}

              {createItems.map((item, idx) => (
                <div className="pi-item-row" key={idx}>
                  <select className="pi-item-input" value={item.product_id}
                    onChange={e => updateItem(idx, 'product_id', Number(e.target.value))}>
                    <option value={0}>{t('sup_select_product')}</option>
                    {products.map(p => <option key={p.id} value={p.id!}>{p.name}</option>)}
                  </select>
                  <input className="pi-item-input" type="number" min="0.01" step="0.01" value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                  <input className="pi-item-input" type="number" min="0" step="0.01" value={item.purchase_price}
                    onChange={e => updateItem(idx, 'purchase_price', parseFloat(e.target.value) || 0)} />
                  <input className="pi-item-input" type="number" min="0" step="0.01" value={item.discount}
                    onChange={e => updateItem(idx, 'discount', parseFloat(e.target.value) || 0)} />
                  <input className="pi-item-input" type="number" min="0" step="0.01" value={item.tax}
                    onChange={e => updateItem(idx, 'tax', parseFloat(e.target.value) || 0)} />
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', padding: '0.4rem 0', color: '#1a3528' }}>
                    {currency}{item.subtotal.toFixed(2)}
                  </div>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c05050', padding: '0.3rem' }}
                    onClick={() => removeItem(idx)}><Trash2 size={14} /></button>
                </div>
              ))}

              {createItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#7a9e8a', fontSize: '0.85rem' }}>
                  {t('sup_no_items_yet')}
                </div>
              )}

              {/* Totals */}
              {createItems.length > 0 && (
                <div className="pi-totals">
                  <div className="pi-total-row">
                    <span className="pi-total-label">{t('subtotal')}:</span>
                    <span className="pi-total-value">{currency}{invoiceSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="pi-total-row">
                    <span className="pi-total-label">{t('sup_discount')}:</span>
                    <span className="pi-total-value">-{currency}{invoiceDiscount.toFixed(2)}</span>
                  </div>
                  <div className="pi-total-row">
                    <span className="pi-total-label">{t('sup_tax')}:</span>
                    <span className="pi-total-value">+{currency}{invoiceTax.toFixed(2)}</span>
                  </div>
                  <div className="pi-total-row pi-grand-total">
                    <span className="pi-total-label">{t('sup_grand_total')}:</span>
                    <span className="pi-total-value">{currency}{invoiceGrandTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="pi-form-actions">
                <button className="pi-btn pi-btn-cancel" onClick={() => setShowCreate(false)}>{t('cancel')}</button>
                <button className="pi-btn pi-btn-primary" onClick={handleCreate} disabled={saving || !createSupplierId || createItems.length === 0}>
                  {saving ? t('loading') : t('sup_create_invoice')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PurchaseInvoices;
