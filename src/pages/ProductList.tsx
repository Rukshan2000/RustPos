import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, ImageIcon, X, Upload } from 'lucide-react';
import { api, Product, Category, formatQtyUnit, priceUnitLabel } from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTranslation } from 'react-i18next';

const UNIT_OPTIONS = [
  { value: 'piece', label: 'Piece' },
  { value: 'packet', label: 'Packet' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'l', label: 'Litre (l)' },
  { value: 'ml', label: 'Millilitre (ml)' },
];

const ProductList: React.FC = () => {
  const { currency } = useSettings();
  const { notify, alertCustom, confirmCustom } = useNotifications();
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [baseUnit, setBaseUnit] = useState('piece');
  const [allowDecimal, setAllowDecimal] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [pData, cData] = await Promise.all([api.getProducts(), api.getCategories()]);
    setProducts(pData);
    setCategories(cData);
  };

  const openModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name); setPrice(product.price.toString()); setStock(product.stock.toString());
      setBarcode(product.barcode || ''); setCategoryId(product.category_id?.toString() || '');
      setImageUrl(product.image_url || ''); setBaseUnit(product.base_unit);
      setAllowDecimal(product.allow_decimal_quantity); setExpiryDate(product.expiry_date || '');
    } else {
      setEditingProduct(null); setName(''); setPrice(''); setStock('');
      setBarcode(''); setCategoryId(''); setImageUrl(''); setBaseUnit('piece');
      setAllowDecimal(false); setExpiryDate('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      name, price: parseFloat(price), stock: parseFloat(stock),
      barcode: barcode || undefined, category_id: categoryId ? parseInt(categoryId) : undefined,
      image_url: imageUrl || undefined, base_unit: baseUnit,
      allow_decimal_quantity: allowDecimal, expiry_date: expiryDate || null,
    };
    try {
      if (editingProduct) await api.updateProduct({ ...productData, id: editingProduct.id! });
      else await api.addProduct(productData);
      setIsModalOpen(false); loadData();
    } catch (err) { alertCustom(t('err_save_product') + err, t('product_error'), "error"); }
  };

  const deleteProduct = (id: number) => {
    confirmCustom(t('confirm_delete_product'), async () => {
      await api.deleteProduct(id); loadData(); notify(t('product_deleted'), "info");
    }, t('delete_product'), "error");
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').filter(row => row.trim());
      if (rows.length < 2) { notify("CSV file must have a header and at least one data row.", "warning"); return; }
      const header = rows[0].split(',').map(h => h.trim().toLowerCase());
      const productsToUpload: Product[] = [];
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(',').map(v => v.trim());
        const product: any = { base_unit: 'piece', allow_decimal_quantity: false, expiry_date: null };
        header.forEach((h, index) => {
          const val = values[index]; if (!val) return;
          if (h === 'name') product.name = val;
          else if (h === 'price') product.price = parseFloat(val);
          else if (h === 'stock') product.stock = parseFloat(val);
          else if (h === 'barcode') product.barcode = val;
          else if (h === 'category_id') product.category_id = parseInt(val);
          else if (h === 'base_unit') product.base_unit = val;
          else if (h === 'allow_decimal_quantity') product.allow_decimal_quantity = val.toLowerCase() === 'true' || val === '1';
          else if (h === 'expiry_date') product.expiry_date = val;
        });
        if (product.name && !isNaN(product.price)) productsToUpload.push(product as Product);
      }
      if (productsToUpload.length > 0) {
        try { const count = await api.bulkAddProducts(productsToUpload); notify(`${t('successfully_uploaded')} ${count} ${t('products_suffix')}`, "success"); loadData(); }
        catch (err) { alertCustom(t('err_upload_products') + err, t('upload_error'), "error"); }
      } else notify(t('no_valid_products_csv'), "warning");
    };
    reader.readAsText(file); e.target.value = '';
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search));

  const handleUnitChange = (unit: string) => {
    setBaseUnit(unit);
    setAllowDecimal(['kg', 'g', 'l', 'ml'].includes(unit));
  };

  return (
    <>
      <style>{`
        

        .pl-root {
          font-family: 'Nunito', sans-serif;
          animation: fadeIn 0.25s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pl-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
        }

        .pl-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: #1a3528;
          letter-spacing: -0.02em;
          margin: 0;
        }

        .pl-actions {
          display: flex;
          gap: 0.75rem;
        }

        .btn-outline-green {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.65rem 1.25rem;
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          color: #5a7a6a;
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s;
          text-decoration: none;
        }

        .btn-outline-green:hover { background: #edeae0; border-color: #c8c4b8; color: #1a3528; }

        .btn-primary-green {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.65rem 1.25rem;
          background: #2d5a3d;
          border: none;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          color: #e8f4ec;
          cursor: pointer;
          transition: background 0.12s, transform 0.1s;
          box-shadow: 0 3px 10px rgba(45,90,61,0.25);
        }

        .btn-primary-green:hover { background: #245033; transform: translateY(-1px); }

        /* Search bar */
        .pl-search {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.875rem;
          padding: 0.7rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 1.25rem;
        }

        .pl-search-input {
          border: none;
          flex: 1;
          background: transparent;
          font-family: 'Nunito', sans-serif;
          font-size: 0.9rem;
          color: #1a3528;
          outline: none;
        }

        .pl-search-input::placeholder { color: #b0a898; }

        /* Table */
        .pl-table-wrap {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 1.125rem;
          overflow: hidden;
        }

        .pl-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .pl-table thead tr {
          background: #edeae0;
          border-bottom: 1.5px solid #ddd8cc;
        }

        .pl-table th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #7a9e8a;
          white-space: nowrap;
        }

        .pl-table tbody tr {
          border-bottom: 1px solid #e8e4d8;
          transition: background 0.1s;
        }

        .pl-table tbody tr:last-child { border-bottom: none; }
        .pl-table tbody tr:hover { background: #edeae0; }

        .pl-table td {
          padding: 0.75rem 1rem;
          color: #1a3528;
          vertical-align: middle;
        }

        .prod-img-cell {
          width: 40px;
          height: 40px;
          background: #edeae0;
          border-radius: 0.5rem;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #b0a898;
          flex-shrink: 0;
        }

        .prod-name { font-weight: 700; color: #1a3528; }
        .prod-barcode { font-size: 0.72rem; color: #7a9e8a; margin-top: 0.1rem; }

        .badge-cat {
          display: inline-block;
          background: #edeae0;
          color: #5a7a6a;
          border-radius: 0.4rem;
          padding: 0.2rem 0.6rem;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .badge-stock-ok {
          display: inline-block;
          background: #e6ede8;
          color: #2d5a3d;
          border-radius: 0.4rem;
          padding: 0.2rem 0.6rem;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .badge-stock-low {
          display: inline-block;
          background: #fdf0f0;
          color: #c05050;
          border-radius: 0.4rem;
          padding: 0.2rem 0.6rem;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .badge-expiry-ok {
          display: inline-block;
          background: #edeae0;
          color: #7a9e8a;
          border-radius: 0.4rem;
          padding: 0.2rem 0.6rem;
          font-size: 0.72rem;
          font-weight: 600;
        }

        .badge-expiry-bad {
          display: inline-block;
          background: #fdf0f0;
          color: #c05050;
          border-radius: 0.4rem;
          padding: 0.2rem 0.6rem;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .tbl-icon-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.3rem;
          border-radius: 0.4rem;
          display: flex;
          align-items: center;
          transition: background 0.1s;
        }

        .tbl-icon-btn-edit { color: #2d5a3d; }
        .tbl-icon-btn-edit:hover { background: #e6ede8; }
        .tbl-icon-btn-del { color: #c8a0a0; }
        .tbl-icon-btn-del:hover { background: #fdf0f0; color: #c05050; }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(26,53,40,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1.5rem;
          backdrop-filter: blur(2px);
        }

        .modal-card {
          background: #f5f0e8;
          border-radius: 1.5rem;
          padding: 2rem;
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 24px 48px rgba(0,0,0,0.18);
          border: 1.5px solid #ddd8cc;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.75rem;
        }

        .modal-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #1a3528;
          margin: 0;
        }

        .modal-close {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #edeae0;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7a9e8a;
          cursor: pointer;
          transition: background 0.12s;
          flex-shrink: 0;
        }

        .modal-close:hover { background: #ddd8cc; color: #1a3528; }

        /* Form elements */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #7a9e8a;
        }

        .form-input {
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

        .form-input:focus { border-color: #2d5a3d; }
        .form-input::placeholder { color: #b0a898; }

        .form-select {
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
          cursor: pointer;
          transition: border-color 0.12s;
        }

        .form-select:focus { border-color: #2d5a3d; }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .price-input-wrap {
          position: relative;
        }

        .price-prefix {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: #7a9e8a;
          font-weight: 700;
          font-size: 0.9rem;
          pointer-events: none;
        }

        .price-input-with-prefix {
          padding-left: 1.75rem !important;
        }

        /* Toggle */
        .toggle-row {
          display: flex;
          align-items: center;
          padding-top: 1.5rem;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 600;
          color: #1a3528;
          user-select: none;
        }

        .toggle-track {
          width: 38px;
          height: 20px;
          border-radius: 10px;
          position: relative;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .toggle-thumb {
          position: absolute;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          top: 2px;
          transition: left 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        /* Image upload */
        .img-upload-row {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .img-upload-btn {
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
          font-size: 0.85rem;
          font-weight: 600;
          color: #7a9e8a;
          cursor: pointer;
          transition: border-color 0.12s, background 0.12s;
        }

        .img-upload-btn:hover { border-color: #2d5a3d; background: #e6ede8; color: #2d5a3d; }

        .img-clear-btn {
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

        .img-clear-btn:hover { background: #fae0e0; }

        .img-selected-note {
          font-size: 0.72rem;
          color: #2d5a3d;
          font-weight: 600;
          margin-top: 0.3rem;
        }

        /* Modal action buttons */
        .modal-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.75rem;
        }

        .modal-btn-cancel {
          flex: 1;
          padding: 0.8rem;
          background: transparent;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          color: #7a9e8a;
          cursor: pointer;
          transition: background 0.12s;
        }

        .modal-btn-cancel:hover { background: #edeae0; }

        .modal-btn-submit {
          flex: 1;
          padding: 0.8rem;
          background: #2d5a3d;
          border: none;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.9rem;
          font-weight: 800;
          color: #e8f4ec;
          cursor: pointer;
          transition: background 0.12s;
          box-shadow: 0 3px 10px rgba(45,90,61,0.25);
        }

        .modal-btn-submit:hover { background: #245033; }
      `}</style>

      <div className="pl-root">
        {/* Header */}
        <div className="pl-header">
          <h1 className="pl-title">{t('products')}</h1>
          <div className="pl-actions">
            <label className="btn-outline-green">
              <Upload size={16} /> {t('bulk_upload')}
              <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleBulkUpload} />
            </label>
            <button className="btn-primary-green" onClick={() => openModal()}>
              <Plus size={16} /> {t('add_product')}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="pl-search">
          <Search size={17} color="#7a9e8a" />
          <input
            type="text"
            className="pl-search-input"
            placeholder={t('search_products')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="pl-table-wrap">
          <table className="pl-table">
            <thead>
              <tr>
                <th>{t('image')}</th>
                <th>{t('name')}</th>
                <th>{t('category')}</th>
                <th>{t('price')}</th>
                <th>{t('stock')}</th>
                <th>{t('expiry')}</th>
                <th>{t('unit')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="prod-img-cell">
                      {p.image_url
                        ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <ImageIcon size={18} />}
                    </div>
                  </td>
                  <td>
                    <div className="prod-name">{p.name}</div>
                    <div className="prod-barcode">{p.barcode || '—'}</div>
                  </td>
                  <td>
                    <span className="badge-cat">
                      {categories.find(c => c.id === p.category_id)?.name || t('uncategorized')}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {currency}{p.price.toFixed(2)}
                    <span style={{ fontSize: '0.7rem', color: '#7a9e8a', fontWeight: 500 }}> {priceUnitLabel(p.base_unit)}</span>
                  </td>
                  <td>
                    <span className={p.stock < 10 ? 'badge-stock-low' : 'badge-stock-ok'}>
                      {formatQtyUnit(p.stock, p.base_unit)}
                    </span>
                  </td>
                  <td>
                    {p.expiry_date
                      ? <span className={new Date(p.expiry_date) <= new Date() ? 'badge-expiry-bad' : 'badge-expiry-ok'}>{p.expiry_date}</span>
                      : <span style={{ color: '#b0a898' }}>—</span>}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: '#5a7a6a', fontWeight: 600, textTransform: 'capitalize' }}>{p.base_unit}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="tbl-icon-btn tbl-icon-btn-edit" onClick={() => openModal(p)} title="Edit"><Edit2 size={16} /></button>
                      <button className="tbl-icon-btn tbl-icon-btn-del" onClick={() => deleteProduct(p.id!)} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-header">
                <h2 className="modal-title">{editingProduct ? t('edit_product') : t('add_new_product')}</h2>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={16} /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('product_name')}</label>
                  <input required className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder={t('eg_fresh_milk')} />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">{t('category')}</label>
                    <select className="form-select" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                      <option value="">{t('select_category')}</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('barcode')}</label>
                    <input className="form-input" value={barcode} onChange={e => setBarcode(e.target.value)} placeholder={t('scan_barcode')} />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">{t('base_unit')}</label>
                    <select className="form-select" value={baseUnit} onChange={e => handleUnitChange(e.target.value)}>
                      {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{t(u.value)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('price_per_unit')}{t(baseUnit)})</label>
                    <div className="price-input-wrap">
                      <span className="price-prefix">{currency}</span>
                      <input required type="number" step="0.01" className="form-input price-input-with-prefix" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">{t('initial_stock')} ({t(baseUnit)})</label>
                    <input required type="number" step={allowDecimal ? '0.001' : '1'} className="form-input" value={stock} onChange={e => setStock(e.target.value)} placeholder="0.000" />
                  </div>
                  <div className="toggle-row">
                    <label className="toggle-label" onClick={() => setAllowDecimal(v => !v)}>
                      <div className="toggle-track" style={{ background: allowDecimal ? '#2d5a3d' : '#ddd8cc' }}>
                        <div className="toggle-thumb" style={{ left: allowDecimal ? '20px' : '2px' }} />
                      </div>
                      <span>{t('allow_decimal_qty')}</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('product_image')}</label>
                  <div className="img-upload-row">
                    <label className="img-upload-btn">
                      <ImageIcon size={16} /> {t('choose_image')}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) { const reader = new FileReader(); reader.onload = (ev) => setImageUrl(ev.target?.result as string); reader.readAsDataURL(file); }
                      }} />
                    </label>
                    {imageUrl && (
                      <button type="button" className="img-clear-btn" onClick={() => setImageUrl('')}><X size={16} /></button>
                    )}
                  </div>
                  {imageUrl && <div className="img-selected-note">✓ {t('image_selected')}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">{t('expiry_date')}</label>
                  <input type="date" className="form-input" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                </div>

                <div className="modal-actions">
                  <button type="button" className="modal-btn-cancel" onClick={() => setIsModalOpen(false)}>{t('cancel')}</button>
                  <button type="submit" className="modal-btn-submit">
                    {editingProduct ? t('update_product') : t('save_product')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProductList;