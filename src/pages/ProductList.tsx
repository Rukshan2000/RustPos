import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, ImageIcon, X, Upload } from 'lucide-react';
import { api, Product, Category, formatQtyUnit, priceUnitLabel } from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { useNotifications } from '../contexts/NotificationContext';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [baseUnit, setBaseUnit] = useState('piece');
  const [allowDecimal, setAllowDecimal] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [pData, cData] = await Promise.all([
      api.getProducts(),
      api.getCategories()
    ]);
    setProducts(pData);
    setCategories(cData);
  };

  const openModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setPrice(product.price.toString());
      setStock(product.stock.toString());
      setBarcode(product.barcode || '');
      setCategoryId(product.category_id?.toString() || '');
      setImageUrl(product.image_url || '');
      setBaseUnit(product.base_unit);
      setAllowDecimal(product.allow_decimal_quantity);
      setExpiryDate(product.expiry_date || '');
    } else {
      setEditingProduct(null);
      setName('');
      setPrice('');
      setStock('');
      setBarcode('');
      setCategoryId('');
      setImageUrl('');
      setBaseUnit('piece');
      setAllowDecimal(false);
      setExpiryDate('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      name,
      price: parseFloat(price),
      stock: parseFloat(stock),
      barcode: barcode || undefined,
      category_id: categoryId ? parseInt(categoryId) : undefined,
      image_url: imageUrl || undefined,
      base_unit: baseUnit,
      allow_decimal_quantity: allowDecimal,
      expiry_date: expiryDate || null,
    };

    try {
      if (editingProduct) {
        await api.updateProduct({ ...productData, id: editingProduct.id! });
      } else {
        await api.addProduct(productData);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alertCustom("Error saving product: " + err, "Product Error", "error");
    }
  };

  const deleteProduct = (id: number) => {
    confirmCustom("Are you sure you want to delete this product?", async () => {
      await api.deleteProduct(id);
      loadData();
      notify("Product deleted", "info");
    }, "Delete Product", "error");
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').filter(row => row.trim());
      if (rows.length < 2) {
        notify("CSV file must have a header and at least one data row.", "warning");
        return;
      }

      const header = rows[0].split(',').map(h => h.trim().toLowerCase());
      const productsToUpload: Product[] = [];
      
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(',').map(v => v.trim());
        const product: any = {
          base_unit: 'piece',
          allow_decimal_quantity: false,
          expiry_date: null
        };
        
        header.forEach((h, index) => {
          const val = values[index];
          if (!val) return;

          if (h === 'name') product.name = val;
          else if (h === 'price') product.price = parseFloat(val);
          else if (h === 'stock') product.stock = parseFloat(val);
          else if (h === 'barcode') product.barcode = val;
          else if (h === 'category_id') product.category_id = parseInt(val);
          else if (h === 'base_unit') product.base_unit = val;
          else if (h === 'allow_decimal_quantity') product.allow_decimal_quantity = val.toLowerCase() === 'true' || val === '1';
          else if (h === 'expiry_date') product.expiry_date = val;
        });

        if (product.name && !isNaN(product.price)) {
          productsToUpload.push(product as Product);
        }
      }

      if (productsToUpload.length > 0) {
        try {
          const count = await api.bulkAddProducts(productsToUpload);
          notify(`Successfully uploaded ${count} products.`, "success");
          loadData();
        } catch (err) {
          alertCustom("Error uploading products: " + err, "Upload Error", "error");
        }
      } else {
        notify("No valid products found in CSV.", "warning");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.barcode?.includes(search)
  );

  // Auto-set allow_decimal when unit changes
  const handleUnitChange = (unit: string) => {
    setBaseUnit(unit);
    if (['kg', 'g', 'l', 'ml'].includes(unit)) {
      setAllowDecimal(true);
    } else {
      setAllowDecimal(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>Products</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <label className="btn btn-outline" style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={20} /> Bulk Upload
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleBulkUpload} />
          </label>
          <button className="btn btn-primary" onClick={() => openModal()} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}>
            <Plus size={20} /> Add Product
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Search size={20} color="var(--text-muted)" />
        <input 
          type="text" 
          placeholder="Search products or barcodes..." 
          style={{ border: 'none', flex: 1, padding: '0.5rem', background: 'transparent' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Expiry</th>
              <th>Unit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ width: '40px', height: '40px', background: 'var(--bg-main)', borderRadius: '0.25rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={20} color="var(--text-muted)" />}
                  </div>
                </td>
                <td style={{ fontWeight: 500 }}>
                  {p.name}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.barcode || '-'}</div>
                </td>
                <td>
                  <span className="badge" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                    {categories.find(c => c.id === p.category_id)?.name || 'Uncategorized'}
                  </span>
                </td>
                <td>{currency}{p.price.toFixed(2)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{priceUnitLabel(p.base_unit)}</span></td>
                <td>
                  <span className={`badge ${p.stock < 10 ? 'badge-danger' : 'badge-success'}`}>
                    {formatQtyUnit(p.stock, p.base_unit)}
                  </span>
                </td>
                <td>
                  {p.expiry_date ? (
                    <span className={`badge ${new Date(p.expiry_date) <= new Date() ? 'badge-danger' : ''}`} style={{ fontSize: '0.75rem' }}>
                      {p.expiry_date}
                    </span>
                  ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                </td>
                <td style={{ fontSize: '0.875rem', textTransform: 'capitalize' }}>{p.base_unit}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openModal(p)} style={{ color: 'var(--primary)', background: 'transparent' }}><Edit2 size={18} /></button>
                    <button onClick={() => deleteProduct(p.id!)} style={{ color: 'var(--danger)', background: 'transparent' }}><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: 'var(--bg-main)', width: '32px', height: '32px', borderRadius: '50%', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="grid-form">
                <label className="form-label">Product Name</label>
                <input required className="w-full" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Fresh Milk" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="grid-form">
                  <label className="form-label">Category</label>
                  <select className="w-full" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid-form">
                  <label className="form-label">Barcode</label>
                  <input className="w-full" value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Scan or type barcode" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="grid-form">
                  <label className="form-label">Base Unit</label>
                  <select className="w-full" value={baseUnit} onChange={e => handleUnitChange(e.target.value)}>
                    {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
                <div className="grid-form">
                  <label className="form-label">Price (per {baseUnit})</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>{currency}</span>
                    <input required type="number" step="0.01" style={{ width: '100%', paddingLeft: '2rem' }} value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="grid-form">
                  <label className="form-label">Initial Stock ({baseUnit})</label>
                  <input required type="number" step={allowDecimal ? '0.001' : '1'} className="w-full" value={stock} onChange={e => setStock(e.target.value)} placeholder="0.000" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    <div className={`toggle ${allowDecimal ? 'active' : ''}`} style={{ width: '40px', height: '20px', background: allowDecimal ? 'var(--primary)' : 'var(--border)', borderRadius: '10px', position: 'relative', transition: 'all 0.2s' }}>
                      <div style={{ position: 'absolute', width: '16px', height: '16px', background: 'white', borderRadius: '50%', top: '2px', left: allowDecimal ? '22px' : '2px', transition: 'all 0.2s' }} />
                    </div>
                    <span>Allow decimal qty</span>
                    <input type="checkbox" style={{ display: 'none' }} checked={allowDecimal} onChange={e => setAllowDecimal(e.target.checked)} />
                  </label>
                </div>
              </div>

              <div className="grid-form">
                <label className="form-label">Product Image (Optional)</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <label className="btn btn-outline" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <ImageIcon size={18} /> Choose Image
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setImageUrl(event.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {imageUrl && <button type="button" className="btn btn-outline" style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', color: 'var(--danger)' }} onClick={() => setImageUrl('')}><X size={18} /></button>}
                </div>
                {imageUrl && <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>✓ Image selected</div>}
              </div>

              <div className="grid-form">
                <label className="form-label">Expiry Date (Optional)</label>
                <input type="date" className="w-full" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1, padding: '0.75rem' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.75rem' }}>
                  {editingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
