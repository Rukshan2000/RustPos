import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Tag, X, Printer, Package } from 'lucide-react';
import { api, Product, Category, SaleItem, formatQtyUnit, priceUnitLabel } from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { useNotifications } from '../contexts/NotificationContext';

const SalesScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const { settings, currency } = useSettings();
  const { notify, alertCustom } = useNotifications();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<{ product: Product; quantity: number; discountValue: number; discountType: 'percentage' | 'fixed' }[]>([]);
  const [billDiscountValue, setBillDiscountValue] = useState(0);
  const [billDiscountType, setBillDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  const [cashReceived, setCashReceived] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState<{ id: number; invoice: string; items: any[]; total: number; billDiscount: number; totalProductDiscount: number } | null>(null);

  // Custom quantity input modal
  const [qtyModal, setQtyModal] = useState<{ product: Product } | null>(null);
  const [qtyInput, setQtyInput] = useState('');

  // Discount modal for items
  const [itemDiscountModal, setItemDiscountModal] = useState<{ productId: number; name: string; price: number; quantity: number; discountValue: number; discountType: 'percentage' | 'fixed' } | null>(null);
  const [itemDiscountInput, setItemDiscountInput] = useState('');
  const [itemDiscountType, setItemDiscountType] = useState<'percentage' | 'fixed'>('percentage');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pData, cData] = await Promise.all([
        api.getProducts(),
        api.getCategories()
      ]);
      setProducts(pData);
      setCategories(cData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
      const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const handleProductClick = (product: Product) => {
    if (product.stock <= 0) {
      notify("Out of stock!", "warning");
      return;
    }
    if (product.allow_decimal_quantity) {
      // Show quantity input modal for weight/volume products
      setQtyModal({ product });
      setQtyInput('');
    } else {
      // Direct add for piece/packet
      addToCart(product, 1);
    }
  };

  const addToCart = (product: Product, qty: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > product.stock) {
          notify(`Exceeds available stock! Available: ${formatQtyUnit(product.stock, product.base_unit)}`, "error", "Stock Limit");
          return prev;
        }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: newQty } : item);
      }
      if (qty > product.stock) {
        notify(`Exceeds available stock! Available: ${formatQtyUnit(product.stock, product.base_unit)}`, "error", "Stock Limit");
        return prev;
      }
      return [...prev, { product, quantity: qty, discountValue: 0, discountType: 'percentage' }];
    });
  };

  const handleQtyModalConfirm = () => {
    if (!qtyModal) return;
    const qty = parseFloat(qtyInput);
    if (isNaN(qty) || qty <= 0) {
      notify("Please enter a valid quantity.", "warning");
      return;
    }
    addToCart(qtyModal.product, qty);
    setQtyModal(null);
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const step = item.product.allow_decimal_quantity ? 0.1 : 1;
        const newQty = parseFloat((item.quantity + delta * step).toFixed(3));
        if (newQty > item.product.stock) return item;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const handleItemDiscountOpen = (item: any) => {
    setItemDiscountModal({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      discountValue: item.discountValue,
      discountType: item.discountType
    });
    setItemDiscountInput(item.discountValue.toString());
    setItemDiscountType(item.discountType);
  };

  const handleItemDiscountConfirm = () => {
    if (!itemDiscountModal) return;
    const value = parseFloat(itemDiscountInput) || 0;
    
    // Validation: Discount cannot exceed item price
    const itemTotal = itemDiscountModal.price * itemDiscountModal.quantity;
    const discountAmt = itemDiscountType === 'percentage' ? (itemTotal * value / 100) : value;
    
    if (discountAmt > itemTotal) {
      notify("Discount cannot exceed item price!", "error");
      return;
    }

    setCart(prev => prev.map(item => 
      item.product.id === itemDiscountModal.productId 
        ? { ...item, discountValue: value, discountType: itemDiscountType } 
        : item
    ));
    setItemDiscountModal(null);
  };

  const cartStats = useMemo(() => {
    let rawSubtotal = 0;
    let totalProductDiscount = 0;

    cart.forEach(item => {
      const itemTotal = item.product.price * item.quantity;
      rawSubtotal += itemTotal;
      const discount = item.discountType === 'percentage' 
        ? (itemTotal * item.discountValue / 100) 
        : item.discountValue;
      totalProductDiscount += discount;
    });

    const subtotalAfterProductDiscounts = rawSubtotal - totalProductDiscount;
    
    const billDiscount = billDiscountType === 'percentage' 
      ? (subtotalAfterProductDiscounts * billDiscountValue / 100) 
      : billDiscountValue;

    const finalTotal = Math.max(0, subtotalAfterProductDiscounts - billDiscount);

    return {
      rawSubtotal,
      totalProductDiscount,
      subtotalAfterProductDiscounts,
      billDiscount,
      finalTotal
    };
  }, [cart, billDiscountValue, billDiscountType]);

  const change = useMemo(() => {
    const cash = parseFloat(cashReceived) || 0;
    return Math.max(0, cash - cartStats.finalTotal);
  }, [cashReceived, cartStats.finalTotal]);

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'Cash' && (parseFloat(cashReceived) || 0) < cartStats.finalTotal) {
      alertCustom("Insufficient cash received!", "Payment Error", "error");
      return;
    }

    setLoading(true);
    const cartSnapshot = [...cart];
    const statsSnapshot = { ...cartStats };

    try {
      const items: SaleItem[] = cart.map(item => {
        const itemTotal = item.product.price * item.quantity;
        const discountAmt = item.discountType === 'percentage' 
          ? (itemTotal * item.discountValue / 100) 
          : item.discountValue;
        
        return {
          product_id: item.product.id!,
          quantity: item.quantity,
          unit: item.product.base_unit,
          price: item.product.price,
          discount_value: item.discountValue,
          discount_type: item.discountType,
          discount_amount: discountAmt,
          subtotal: itemTotal - discountAmt,
        };
      });
      
      const saleId = await api.completeSale(
        cartStats.finalTotal, 
        paymentMethod, 
        items, 
        billDiscountValue,
        billDiscountType,
        cartStats.totalProductDiscount,
        paymentMethod === 'Cash' ? parseFloat(cashReceived) : undefined,
        paymentMethod === 'Cash' ? change : undefined
      );

      const history = await api.getSalesHistory();
      const latest = history[0];
      
      setShowReceipt({ 
        id: saleId, 
        invoice: latest.invoice_number, 
        items: cartSnapshot, 
        total: statsSnapshot.finalTotal,
        billDiscount: statsSnapshot.billDiscount,
        totalProductDiscount: statsSnapshot.totalProductDiscount
      });
      setCart([]);
      setCashReceived('');
      setBillDiscountValue(0);
      setBillDiscountType('percentage');
      loadData();
    } catch (error) {
      alertCustom("Failed to complete sale: " + error, "System Error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 4rem)', display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', overflow: 'hidden' }}>
      {/* Left: Product Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="card" style={{ flex: 1, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Search size={20} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search product or scan barcode..." 
              style={{ border: 'none', flex: 1, padding: '0.5rem', background: 'transparent' }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                const match = products.find(p => p.barcode === e.target.value);
                if (match) {
                  handleProductClick(match);
                  setSearch('');
                }
              }}
              autoFocus
            />
          </div>
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '200px' }}>
            <Tag size={20} color="var(--text-muted)" />
            <select 
              style={{ border: 'none', flex: 1, background: 'transparent' }}
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', overflowY: 'auto', paddingBottom: '0.75rem', flex: 1, minHeight: 0 }}>
          {filteredProducts.map(product => (
            <div key={product.id} className="card" style={{ padding: '0.75rem', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.1s' }} onClick={() => handleProductClick(product)}>
              <div style={{ width: '100%', height: '80px', background: 'var(--bg-main)', borderRadius: '0.5rem', marginBottom: '0.5rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {product.image_url ? <img src={product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={28} opacity={0.15} />}
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
              <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.875rem' }}>{currency}{product.price.toFixed(2)}<span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{priceUnitLabel(product.base_unit)}</span></div>
              <div style={{ fontSize: '0.65rem', color: product.stock < 10 ? 'var(--danger)' : 'var(--text-muted)' }}>{formatQtyUnit(product.stock, product.base_unit)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Checkout Panel */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
        <h2 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingCart size={20} /> Checkout
        </h2>
        
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {cart.map(item => (
            <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', gap: '0.5rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {formatQtyUnit(item.quantity, item.product.base_unit)} × {currency}{item.product.price.toFixed(2)}
                  {item.discountValue > 0 && (
                    <span style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}>
                      (Disc: -{item.discountType === 'percentage' ? `${item.discountValue}%` : `${currency}${item.discountValue}`})
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: '60px', textAlign: 'right' }}>
                {currency}{(item.product.price * item.quantity - (item.discountType === 'percentage' ? (item.product.price * item.quantity * item.discountValue / 100) : item.discountValue)).toFixed(2)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button onClick={() => updateQuantity(item.product.id!, -1)} className="btn-outline" style={{ padding: '2px', width: '24px', height: '24px' }}><Minus size={12}/></button>
                <button onClick={() => updateQuantity(item.product.id!, 1)} className="btn-outline" style={{ padding: '2px', width: '24px', height: '24px' }}><Plus size={12}/></button>
                <button onClick={() => handleItemDiscountOpen(item)} title="Discount" className="btn-outline" style={{ padding: '2px', width: '24px', height: '24px', color: item.discountValue > 0 ? 'var(--danger)' : 'var(--text-muted)' }}><Tag size={12}/></button>
                <button onClick={() => setCart(c => c.filter(i => i.product.id !== item.product.id))} style={{ color: 'var(--danger)', background: 'transparent', padding: '2px' }}><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem', fontSize: '0.875rem' }}>Scan or search products to begin</div>}
        </div>

        <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '0.5rem' }}>
          <div className="flex-between" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}><span>Items Total</span><span>{currency}{cartStats.rawSubtotal.toFixed(2)}</span></div>
          {cartStats.totalProductDiscount > 0 && (
            <div className="flex-between" style={{ fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--danger)' }}>
              <span>Product Discounts</span><span>-{currency}{cartStats.totalProductDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex-between" style={{ fontSize: '0.875rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <span>Subtotal</span><span>{currency}{cartStats.subtotalAfterProductDiscounts.toFixed(2)}</span>
          </div>
          
          <div style={{ marginBottom: '0.75rem' }}>
            <div className="flex-between" style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              <span>BILL DISCOUNT</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button onClick={() => setBillDiscountType('percentage')} style={{ fontSize: '0.65rem', padding: '2px 6px', background: billDiscountType === 'percentage' ? 'var(--primary)' : 'white', color: billDiscountType === 'percentage' ? 'white' : 'var(--text-muted)', borderRadius: '4px' }}>%</button>
                <button onClick={() => setBillDiscountType('fixed')} style={{ fontSize: '0.65rem', padding: '2px 6px', background: billDiscountType === 'fixed' ? 'var(--primary)' : 'white', color: billDiscountType === 'fixed' ? 'white' : 'var(--text-muted)', borderRadius: '4px' }}>{currency}</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="number" 
                value={billDiscountValue || ''} 
                onChange={(e) => setBillDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                style={{ flex: 1, padding: '0.35rem', fontSize: '0.875rem' }}
              />
              {cartStats.billDiscount > 0 && <span style={{ color: 'var(--danger)', fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>-{currency}{cartStats.billDiscount.toFixed(2)}</span>}
            </div>
          </div>

          <div className="flex-between" style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)', marginTop: '0.5rem', borderTop: '2px solid var(--border)', paddingTop: '0.5rem' }}>
            <span>Total</span><span>{currency}{cartStats.finalTotal.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>PAYMENT METHOD</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button className={`btn ${paymentMethod === 'Cash' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }} onClick={() => setPaymentMethod('Cash')}><Banknote size={16} /> Cash</button>
            <button className={`btn ${paymentMethod === 'Card' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }} onClick={() => setPaymentMethod('Card')}><CreditCard size={16} /> Card</button>
          </div>
          
          {paymentMethod === 'Cash' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cash Received</label>
                <input type="number" style={{ width: '100%', fontSize: '1.125rem' }} value={cashReceived} onChange={e => setCashReceived(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Change</label>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>{currency}{change.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setCart([]); setCashReceived(''); }}>Clear</button>
          <button 
            className="btn btn-primary" 
            style={{ flex: 2, padding: '1rem' }} 
            disabled={cart.length === 0 || loading} 
            onClick={handleCompleteSale}
          >
            {loading ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>

      {/* Quantity Input Modal (for weight/volume products) */}
      {qtyModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Enter Quantity</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{qtyModal.product.name}</p>
              </div>
              <button 
                onClick={() => setQtyModal(null)} 
                style={{ background: 'var(--bg-main)', width: '32px', height: '32px', borderRadius: '50%', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.5rem' }}>
                Quick Info
              </div>
              <div className="flex-between" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                <span>Price:</span>
                <span style={{ fontWeight: 700 }}>{currency}{qtyModal.product.price.toFixed(2)}{priceUnitLabel(qtyModal.product.base_unit)}</span>
              </div>
              <div className="flex-between" style={{ fontSize: '0.875rem' }}>
                <span>Stock:</span>
                <span className="badge badge-primary">{formatQtyUnit(qtyModal.product.stock, qtyModal.product.base_unit)}</span>
              </div>
            </div>
            
            <div className="grid-form" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ textAlign: 'left' }}>Quantity ({qtyModal.product.base_unit})</label>
              <input 
                type="number" 
                step="0.001" 
                autoFocus
                className="w-full"
                style={{ fontSize: '1.5rem', textAlign: 'center', fontWeight: 700 }} 
                value={qtyInput} 
                onChange={e => setQtyInput(e.target.value)} 
                placeholder={`0.000`}
                onKeyDown={e => e.key === 'Enter' && handleQtyModalConfirm()}
              />
            </div>

            {qtyInput && parseFloat(qtyInput) > 0 && (
              <div style={{ background: 'rgba(79, 70, 229, 0.05)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px solid rgba(79, 70, 229, 0.1)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '0.125rem' }}>TOTAL SUB-TOTAL</div>
                <div style={{ fontWeight: 800, fontSize: '1.75rem', color: 'var(--primary)', letterSpacing: '-0.025em' }}>
                  {currency}{(parseFloat(qtyInput) * qtyModal.product.price).toFixed(2)}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '0.75rem' }} onClick={() => setQtyModal(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '0.75rem' }} onClick={handleQtyModalConfirm}>Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {/* Item Discount Modal */}
      {itemDiscountModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Item Discount</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{itemDiscountModal.name}</p>
              </div>
              <button onClick={() => setItemDiscountModal(null)} style={{ background: 'var(--bg-main)', width: '32px', height: '32px', borderRadius: '50%', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <button onClick={() => setItemDiscountType('percentage')} className={`btn ${itemDiscountType === 'percentage' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>Percentage (%)</button>
              <button onClick={() => setItemDiscountType('fixed')} className={`btn ${itemDiscountType === 'fixed' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>Fixed Amount ({currency})</button>
            </div>

            <div className="grid-form" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Discount Value</label>
              <input 
                type="number" 
                autoFocus
                className="w-full"
                style={{ fontSize: '1.5rem', textAlign: 'center', fontWeight: 700 }} 
                value={itemDiscountInput} 
                onChange={e => setItemDiscountInput(e.target.value)} 
                placeholder="0.00"
                onKeyDown={e => e.key === 'Enter' && handleItemDiscountConfirm()}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '0.75rem' }} onClick={() => setItemDiscountModal(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '0.75rem' }} onClick={handleItemDiscountConfirm}>Apply Discount</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" style={{ maxWidth: '100px', marginBottom: '1rem' }} />
              ) : (
                <div style={{ width: '48px', height: '48px', background: 'var(--success)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <ShoppingCart size={24} />
                </div>
              )}
              
              <h2 style={{ fontSize: `${settings?.font_size_header || 24}px`, fontWeight: 800, margin: 0 }}>{settings?.shop_name}</h2>
              <p style={{ fontSize: `${settings?.font_size_body || 14}px`, color: 'var(--text-muted)', marginTop: '0.25rem' }}>{settings?.receipt_text}</p>
              <div style={{ fontSize: '10px', color: '#999', marginTop: '0.5rem' }}>Invoice: {showReceipt.invoice}</div>
            </div>

            <div style={{ borderTop: '2px dashed var(--border)', borderBottom: '2px dashed var(--border)', padding: '1rem 0', marginBottom: '1.5rem' }}>
              {showReceipt.items.map((item, idx) => {
                const itemTotal = item.product.price * item.quantity;
                const disc = item.discountType === 'percentage' ? (itemTotal * item.discountValue / 100) : item.discountValue;
                return (
                  <div key={idx} style={{ marginBottom: '0.6rem' }}>
                    <div className="flex-between" style={{ fontSize: `${settings?.font_size_body || 14}px` }}>
                      <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{item.product.name} × {formatQtyUnit(item.quantity, item.product.base_unit)}</span>
                      <span style={{ fontWeight: 600 }}>{currency}{itemTotal.toFixed(2)}</span>
                    </div>
                    {disc > 0 && (
                      <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--danger)', fontStyle: 'italic' }}>
                        <span>- Discount ({item.discountType === 'percentage' ? `${item.discountValue}%` : 'Fixed'})</span>
                        <span>-{currency}{disc.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
                <div className="flex-between" style={{ fontSize: `${settings?.font_size_body || 14}px`, marginBottom: '0.25rem' }}>
                  <span>Subtotal</span><span>{currency}{(showReceipt.total + showReceipt.billDiscount).toFixed(2)}</span>
                </div>
                {showReceipt.billDiscount > 0 && (
                  <div className="flex-between" style={{ fontSize: `${settings?.font_size_body || 14}px`, marginBottom: '0.25rem', color: 'var(--danger)' }}>
                    <span>Bill Discount</span><span>-{currency}{showReceipt.billDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex-between" style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)', marginTop: '0.5rem' }}>
                  <span>TOTAL</span><span>{currency}{showReceipt.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
               <p style={{ fontSize: `${settings?.font_size_footer || 12}px`, color: 'var(--text-muted)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                 {settings?.footer_text || 'Thank you!'}
               </p>
               <div style={{ fontSize: '10px', color: '#999' }}>{new Date().toLocaleString()}</div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }} className="no-print">
              <button className="btn btn-outline" style={{ flex: 1, padding: '0.75rem' }} onClick={() => setShowReceipt(null)}><X size={16} /> Close</button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '0.75rem' }} onClick={() => window.print()}><Printer size={16} /> Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesScreen;
