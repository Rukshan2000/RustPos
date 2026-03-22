import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Tag, X, Printer, Package } from 'lucide-react';
import { api, Product, Category, SaleItem, formatQtyUnit, priceUnitLabel } from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTranslation } from 'react-i18next';
import { useCustomerDisplay } from '../contexts/CustomerDisplayContext';
import type { CustomerDisplayItem } from '../contexts/CustomerDisplayContext';

const SalesScreen: React.FC = () => {
  const { t } = useTranslation();
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
  const [qtyModal, setQtyModal] = useState<{ product: Product } | null>(null);
  const [qtyInput, setQtyInput] = useState('');
  const [itemDiscountModal, setItemDiscountModal] = useState<{ productId: number; name: string; price: number; quantity: number; discountValue: number; discountType: 'percentage' | 'fixed' } | null>(null);
  const [itemDiscountInput, setItemDiscountInput] = useState('');
  const [itemDiscountType, setItemDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { displayMode, isDisplayOpen, broadcastCartUpdate, broadcastSaleComplete, broadcastIdle } = useCustomerDisplay();

  const generateReceiptText = useCallback((
    receiptData: { items: typeof cart; total: number; billDiscount: number; totalProductDiscount: number; invoice: string },
    cur: string,
    shopSettings: typeof settings
  ): string => {
    const W = shopSettings?.receipt_width || 32; // Use customizable width
    const separatorChar = shopSettings?.separator_style === 'dashes' ? '-' : '=';
    const currencyPos = shopSettings?.currency_position || 'before';
    const showInv = shopSettings?.show_invoice_number !== false;
    
    const formatCurrency = (amount: number) => {
      const formatted = amount.toFixed(2);
      return currencyPos === 'before' ? `${cur}${formatted}` : `${formatted}${cur}`;
    };
    
    const center = (s: string) => {
      const pad = Math.max(0, Math.floor((W - s.length) / 2));
      return ' '.repeat(pad) + s;
    };
    const leftRight = (l: string, r: string) => {
      const space = Math.max(1, W - l.length - r.length);
      return l + ' '.repeat(space) + r;
    };
    const topBorder = separatorChar === '-' ? '-'.repeat(W) : '='.repeat(W);
    const thinLine = separatorChar === '-' ? ' '.repeat(W) : '-'.repeat(W);
    const lines: string[] = [];

    // Header with dark border
    lines.push(topBorder);
    lines.push(center((shopSettings?.shop_name || 'SmartPos').toUpperCase()));
    lines.push(topBorder);
    
    if (shopSettings?.receipt_text) {
      lines.push(center(shopSettings.receipt_text));
    }
    if (showInv) {
      lines.push(center(`INV: ${receiptData.invoice}`));
    }
    lines.push(thinLine);

    // Items
    receiptData.items.forEach(item => {
      const itemTotal = item.product.price * item.quantity;
      // Truncate product name if too long
      const productName = item.product.name.length > W - 2 
        ? item.product.name.substring(0, W - 2) 
        : item.product.name;
      lines.push(productName);
      lines.push(leftRight(
        `${formatQtyUnit(item.quantity, item.product.base_unit)}x ${cur}${item.product.price.toFixed(2)}`,
        formatCurrency(itemTotal)
      ));
      if (item.discountValue > 0) {
        const disc = item.discountType === 'percentage' ? (itemTotal * item.discountValue / 100) : item.discountValue;
        lines.push(leftRight(
          `DISC: ${item.discountType === 'percentage' ? `${item.discountValue}%` : 'fixed'}`,
          `-${formatCurrency(disc)}`
        ));
      }
    });

    lines.push(thinLine);

    // Subtotal and Discounts
    const subtotal = receiptData.total + receiptData.billDiscount;
    lines.push(leftRight('SUBTOTAL', formatCurrency(subtotal)));
    if (receiptData.billDiscount > 0) {
      lines.push(leftRight('BILL DISC', `-${formatCurrency(receiptData.billDiscount)}`));
    }
    
    // Final total with dark border
    lines.push(topBorder);
    lines.push(leftRight('TOTAL', formatCurrency(receiptData.total)));
    lines.push(topBorder);
    lines.push('');

    // Footer
    if (shopSettings?.footer_text) {
      lines.push(center(shopSettings.footer_text));
    }
    lines.push(center(new Date().toLocaleString()));
    lines.push(''); // trailing newline for paper feed
    lines.push('');
    lines.push('');

    return lines.join('\n');
  }, [t]);

  const handleSilentPrint = useCallback(async (
    receiptData: { items: typeof cart; total: number; billDiscount: number; totalProductDiscount: number; invoice: string }
  ) => {
    try {
      const receiptText = generateReceiptText(receiptData, currency, settings);
      await api.silentPrint(receiptText, settings?.printer_name || undefined);
      notify(t('print_success'), 'success');
    } catch (error) {
      notify(t('print_failed') + ': ' + error, 'error');
    }
  }, [currency, settings, generateReceiptText, notify, t]);

  useEffect(() => { loadData(); }, []);

  // Global keydown handler for barcode scanner detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // When Enter is pressed and search has content, try barcode lookup
      if (e.key === 'Enter' && search.trim()) {
        const match = products.find(p => p.barcode === search.trim());
        if (match) {
          e.preventDefault();
          handleProductClick(match);
          setSearch('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [search, products]);

  const loadData = async () => {
    try {
      const [pData, cData] = await Promise.all([api.getProducts(), api.getCategories()]);
      setProducts(pData);
      setCategories(cData);
    } catch (error) { console.error('Failed to load data:', error); }
  };

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
    const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
    return matchesSearch && matchesCategory;
  }), [products, search, selectedCategory]);

  const handleProductClick = (product: Product) => {
    if (product.stock <= 0) { notify("Out of stock!", "warning"); return; }
    if (product.allow_decimal_quantity) { setQtyModal({ product }); setQtyInput(''); }
    else addToCart(product, 1);
  };

  const addToCart = (product: Product, qty: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > product.stock) { notify(`Exceeds available stock! Available: ${formatQtyUnit(product.stock, product.base_unit)}`, "error", "Stock Limit"); return prev; }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: newQty } : item);
      }
      if (qty > product.stock) { notify(`Exceeds available stock! Available: ${formatQtyUnit(product.stock, product.base_unit)}`, "error", "Stock Limit"); return prev; }
      return [...prev, { product, quantity: qty, discountValue: 0, discountType: 'percentage' }];
    });
  };

  const handleQtyModalConfirm = () => {
    if (!qtyModal) return;
    const qty = parseFloat(qtyInput);
    if (isNaN(qty) || qty <= 0) { notify("Please enter a valid quantity.", "warning"); return; }
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
    setItemDiscountModal({ productId: item.product.id, name: item.product.name, price: item.product.price, quantity: item.quantity, discountValue: item.discountValue, discountType: item.discountType });
    setItemDiscountInput(item.discountValue.toString());
    setItemDiscountType(item.discountType);
  };

  const handleItemDiscountConfirm = () => {
    if (!itemDiscountModal) return;
    const value = parseFloat(itemDiscountInput) || 0;
    const itemTotal = itemDiscountModal.price * itemDiscountModal.quantity;
    const discountAmt = itemDiscountType === 'percentage' ? (itemTotal * value / 100) : value;
    if (discountAmt > itemTotal) { notify("Discount cannot exceed item price!", "error"); return; }
    setCart(prev => prev.map(item => item.product.id === itemDiscountModal.productId ? { ...item, discountValue: value, discountType: itemDiscountType } : item));
    setItemDiscountModal(null);
  };

  const cartStats = useMemo(() => {
    let rawSubtotal = 0, totalProductDiscount = 0;
    cart.forEach(item => {
      const itemTotal = item.product.price * item.quantity;
      rawSubtotal += itemTotal;
      const discount = item.discountType === 'percentage' ? (itemTotal * item.discountValue / 100) : item.discountValue;
      totalProductDiscount += discount;
    });
    const subtotalAfterProductDiscounts = rawSubtotal - totalProductDiscount;
    const billDiscount = billDiscountType === 'percentage' ? (subtotalAfterProductDiscounts * billDiscountValue / 100) : billDiscountValue;
    const finalTotal = Math.max(0, subtotalAfterProductDiscounts - billDiscount);
    return { rawSubtotal, totalProductDiscount, subtotalAfterProductDiscounts, billDiscount, finalTotal };
  }, [cart, billDiscountValue, billDiscountType]);

  // Broadcast cart state to customer display
  useEffect(() => {
    if (displayMode === 'disabled' || !isDisplayOpen) return;
    const items: CustomerDisplayItem[] = cart.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      unit: item.product.base_unit,
      price: item.product.price,
      discountValue: item.discountValue,
      discountType: item.discountType,
    }));
    if (cart.length === 0) {
      broadcastIdle(currency, settings?.shop_name || 'SmartPos', settings?.logo_url || null, settings?.footer_text || null);
    } else {
      broadcastCartUpdate({
        type: 'cart-update',
        items,
        rawSubtotal: cartStats.rawSubtotal,
        totalProductDiscount: cartStats.totalProductDiscount,
        billDiscount: cartStats.billDiscount,
        finalTotal: cartStats.finalTotal,
        currency,
        shopName: settings?.shop_name || 'SmartPos',
        logoUrl: settings?.logo_url || null,
        footerText: settings?.footer_text || null,
      });
    }
  }, [cart, cartStats, displayMode, isDisplayOpen, currency, settings]);

  const change = useMemo(() => Math.max(0, (parseFloat(cashReceived) || 0) - cartStats.finalTotal), [cashReceived, cartStats.finalTotal]);

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'Cash' && (parseFloat(cashReceived) || 0) < cartStats.finalTotal) { alertCustom("Insufficient cash received!", "Payment Error", "error"); return; }
    setLoading(true);
    const cartSnapshot = [...cart];
    const statsSnapshot = { ...cartStats };
    try {
      const items: SaleItem[] = cart.map(item => {
        const itemTotal = item.product.price * item.quantity;
        const discountAmt = item.discountType === 'percentage' ? (itemTotal * item.discountValue / 100) : item.discountValue;
        return { product_id: item.product.id!, quantity: item.quantity, unit: item.product.base_unit, price: item.product.price, discount_value: item.discountValue, discount_type: item.discountType, discount_amount: discountAmt, subtotal: itemTotal - discountAmt };
      });
      const saleId = await api.completeSale(cartStats.finalTotal, paymentMethod, items, billDiscountValue, billDiscountType, cartStats.totalProductDiscount, paymentMethod === 'Cash' ? parseFloat(cashReceived) : undefined, paymentMethod === 'Cash' ? change : undefined);
      const history = await api.getSalesHistory();
      const latest = history[0];
      setShowReceipt({ id: saleId, invoice: latest.invoice_number, items: cartSnapshot, total: statsSnapshot.finalTotal, billDiscount: statsSnapshot.billDiscount, totalProductDiscount: statsSnapshot.totalProductDiscount });
      // Auto silent-print receipt if enabled
      if (settings?.auto_print_receipt) {
        const receiptData = { items: cartSnapshot, total: statsSnapshot.finalTotal, billDiscount: statsSnapshot.billDiscount, totalProductDiscount: statsSnapshot.totalProductDiscount, invoice: latest.invoice_number };
        handleSilentPrint(receiptData);
      }
      // Broadcast sale completion to customer display
      if (displayMode !== 'disabled' && isDisplayOpen) {
        broadcastSaleComplete({
          type: 'sale-complete',
          items: cartSnapshot.map(item => ({
            name: item.product.name,
            quantity: item.quantity,
            unit: item.product.base_unit,
            price: item.product.price,
            discountValue: item.discountValue,
            discountType: item.discountType,
          })),
          rawSubtotal: statsSnapshot.rawSubtotal,
          totalProductDiscount: statsSnapshot.totalProductDiscount,
          billDiscount: statsSnapshot.billDiscount,
          finalTotal: statsSnapshot.finalTotal,
          currency,
          shopName: settings?.shop_name || 'SmartPos',
          logoUrl: settings?.logo_url || null,
          footerText: settings?.footer_text || null,
        });
      }
      setCart([]); setCashReceived(''); setBillDiscountValue(0); setBillDiscountType('percentage');
      loadData();
    } catch (error) { alertCustom("Failed to complete sale: " + error, "System Error", "error"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        

        .sales-root {
          font-family: 'Nunito', sans-serif;
          height: 100%;
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 1.25rem;
          overflow: hidden;
          animation: fadeIn 0.25s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Left panel ── */
        .sales-left {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          overflow: hidden;
        }

        .sales-search-row {
          display: flex;
          gap: 0.75rem;
        }

        .search-box {
          flex: 1;
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.75rem;
          padding: 0.7rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .search-input {
          border: none;
          flex: 1;
          background: transparent;
          font-family: 'Nunito', sans-serif;
          font-size: 0.9rem;
          color: #1a3528;
          outline: none;
        }

        .search-input::placeholder { color: #b0a898; }

        .cat-box {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.75rem;
          padding: 0.7rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          min-width: 180px;
        }

        .cat-select {
          border: none;
          background: transparent;
          font-family: 'Nunito', sans-serif;
          font-size: 0.875rem;
          color: #1a3528;
          outline: none;
          flex: 1;
          cursor: pointer;
        }

        /* Product grid */
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
          align-content: start;
          gap: 0.75rem;
          overflow-y: auto;
          padding-bottom: 0.5rem;
          flex: 1;
          min-height: 0;
        }

        .product-card {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.875rem;
          padding: 0.75rem;
          cursor: pointer;
          text-align: center;
          transition: border-color 0.12s, transform 0.1s, box-shadow 0.12s;
        }

        .product-card:hover {
          border-color: #2d5a3d;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(45,90,61,0.1);
        }

        .product-img {
          width: 100%;
          height: 76px;
          background: #edeae0;
          border-radius: 0.5rem;
          margin-bottom: 0.5rem;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #b0a898;
        }

        .product-name {
          font-weight: 700;
          font-size: 0.8rem;
          color: #1a3528;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 0.15rem;
        }

        .product-price {
          color: #2d5a3d;
          font-weight: 800;
          font-size: 0.875rem;
        }

        .product-stock {
          font-size: 0.65rem;
          color: #7a9e8a;
          margin-top: 0.1rem;
        }

        .product-stock-low { color: #c05050; }

        /* ── Right: Checkout panel ── */
        .checkout-panel {
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0;
          height: 100%;
          overflow: hidden;
        }

        .checkout-header {
          padding: 1.1rem 1.25rem;
          border-bottom: 1.5px solid #ddd8cc;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 800;
          color: #1a3528;
        }

        /* Cart items */
        .cart-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .cart-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 0;
          border-bottom: 1px solid #e8e4d8;
        }

        .cart-item-info { flex: 1; min-width: 0; }

        .cart-item-name {
          font-weight: 600;
          font-size: 0.8rem;
          color: #1a3528;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cart-item-meta {
          font-size: 0.68rem;
          color: #7a9e8a;
          margin-top: 0.1rem;
        }

        .cart-item-disc { color: #c05050; }

        .cart-item-total {
          font-weight: 700;
          font-size: 0.85rem;
          color: #1a3528;
          min-width: 56px;
          text-align: right;
        }

        .cart-item-actions {
          display: flex;
          align-items: center;
          gap: 0.2rem;
        }

        .ci-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #edeae0;
          border: 1px solid #ddd8cc;
          border-radius: 0.35rem;
          cursor: pointer;
          color: #5a7a6a;
          transition: background 0.1s;
          padding: 0;
        }

        .ci-btn:hover { background: #ddd8cc; color: #1a3528; }

        .ci-btn-disc { color: #7a9e8a; }
        .ci-btn-disc.active { color: #c05050; border-color: #e8c0c0; background: #fdf0f0; }

        .ci-btn-del {
          background: transparent;
          border: none;
          color: #c8a0a0;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 2px;
          border-radius: 0.35rem;
          transition: color 0.1s;
        }

        .ci-btn-del:hover { color: #c05050; }

        .cart-empty {
          text-align: center;
          color: #b0a898;
          margin-top: 2.5rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        /* Totals */
        .totals-box {
          background: #edeae0;
          border-top: 1.5px solid #ddd8cc;
          padding: 0.875rem 1.25rem;
        }

        .totals-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.82rem;
          color: #5a7a6a;
          margin-bottom: 0.25rem;
          font-weight: 600;
        }

        .totals-row-danger { color: #c05050; }

        .totals-row-total {
          font-size: 1.2rem;
          font-weight: 800;
          color: #1a3528;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1.5px solid #ddd8cc;
        }

        /* Bill discount */
        .bill-disc-section {
          padding: 0.75rem 1.25rem;
          border-top: 1.5px solid #ddd8cc;
        }

        .bill-disc-label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #7a9e8a;
          margin-bottom: 0.4rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .disc-type-toggle {
          display: flex;
          gap: 0.2rem;
        }

        .disc-type-btn {
          font-size: 0.65rem;
          padding: 2px 8px;
          border-radius: 0.3rem;
          border: 1px solid #ddd8cc;
          background: #f5f0e8;
          color: #7a9e8a;
          cursor: pointer;
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          transition: all 0.1s;
        }

        .disc-type-btn.active {
          background: #2d5a3d;
          color: #e8f4ec;
          border-color: #2d5a3d;
        }

        .bill-disc-input-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .bill-disc-input {
          flex: 1;
          padding: 0.45rem 0.65rem;
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-family: 'Nunito', sans-serif;
          color: #1a3528;
          outline: none;
        }

        .bill-disc-input:focus { border-color: #2d5a3d; }

        .bill-disc-amt {
          color: #c05050;
          font-weight: 700;
          font-size: 0.8rem;
          min-width: 60px;
          text-align: right;
        }

        /* Payment */
        .payment-section {
          padding: 0.75rem 1.25rem;
          border-top: 1.5px solid #ddd8cc;
        }

        .pay-label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #7a9e8a;
          margin-bottom: 0.5rem;
        }

        .pay-methods {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .pay-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.55rem;
          border-radius: 0.625rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          border: 1.5px solid #ddd8cc;
          background: #edeae0;
          color: #5a7a6a;
          transition: all 0.12s;
        }

        .pay-btn.active {
          background: #2d5a3d;
          color: #e8f4ec;
          border-color: #2d5a3d;
        }

        .cash-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .cash-label {
          font-size: 0.7rem;
          color: #7a9e8a;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .cash-input {
          width: 100%;
          padding: 0.45rem 0.65rem;
          background: #f5f0e8;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          color: #1a3528;
          outline: none;
          box-sizing: border-box;
        }

        .cash-input:focus { border-color: #2d5a3d; }

        .change-val {
          font-size: 1.2rem;
          font-weight: 800;
          color: #2d5a3d;
        }

        /* Action buttons */
        .action-row {
          display: flex;
          gap: 0.5rem;
          padding: 0.875rem 1.25rem;
          border-top: 1.5px solid #ddd8cc;
        }

        .btn-clear {
          flex: 1;
          padding: 0.75rem;
          background: transparent;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          color: #7a9e8a;
          cursor: pointer;
          transition: all 0.12s;
        }

        .btn-clear:hover { background: #edeae0; color: #1a3528; }

        .btn-complete {
          flex: 2;
          padding: 0.75rem;
          background: #2d5a3d;
          border: none;
          border-radius: 0.75rem;
          font-family: 'Nunito', sans-serif;
          font-size: 0.95rem;
          font-weight: 800;
          color: #e8f4ec;
          cursor: pointer;
          transition: background 0.12s, transform 0.1s;
          box-shadow: 0 3px 12px rgba(45,90,61,0.25);
        }

        .btn-complete:hover:not(:disabled) { background: #245033; transform: translateY(-1px); }
        .btn-complete:disabled { background: #7a9e8a; cursor: not-allowed; box-shadow: none; }

        /* ── Modals ── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(26,53,40,0.45);
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
          max-width: 400px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.2);
          border: 1.5px solid #ddd8cc;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .modal-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: #1a3528;
          margin: 0 0 0.2rem;
        }

        .modal-sub {
          font-size: 0.82rem;
          color: #7a9e8a;
          margin: 0;
          font-weight: 500;
        }

        .modal-close-btn {
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
          flex-shrink: 0;
          transition: background 0.12s;
        }

        .modal-close-btn:hover { background: #ddd8cc; color: #1a3528; }

        .modal-info-box {
          background: #edeae0;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.875rem;
          padding: 1rem;
          margin-bottom: 1.25rem;
        }

        .modal-info-label {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #7a9e8a;
          margin-bottom: 0.5rem;
        }

        .modal-info-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: #5a7a6a;
          margin-bottom: 0.2rem;
          font-weight: 600;
        }

        .modal-info-val { color: #1a3528; font-weight: 700; }

        .modal-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #7a9e8a;
          display: block;
          margin-bottom: 0.4rem;
        }

        .modal-input {
          width: 100%;
          padding: 0.75rem;
          background: #edeae0;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.75rem;
          font-size: 1.5rem;
          text-align: center;
          font-weight: 800;
          font-family: 'Nunito', sans-serif;
          color: #1a3528;
          outline: none;
          box-sizing: border-box;
          margin-bottom: 1.25rem;
        }

        .modal-input:focus { border-color: #2d5a3d; }

        .modal-subtotal-preview {
          background: #e6ede8;
          border: 1.5px solid #c8ddd0;
          border-radius: 0.875rem;
          padding: 1rem;
          text-align: center;
          margin-bottom: 1.25rem;
        }

        .modal-subtotal-label {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #2d5a3d;
          margin-bottom: 0.2rem;
        }

        .modal-subtotal-val {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1a3528;
          letter-spacing: -0.02em;
        }

        .modal-type-row {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }

        .modal-type-btn {
          flex: 1;
          padding: 0.65rem;
          border: 1.5px solid #ddd8cc;
          border-radius: 0.625rem;
          background: #edeae0;
          font-family: 'Nunito', sans-serif;
          font-size: 0.82rem;
          font-weight: 700;
          color: #5a7a6a;
          cursor: pointer;
          transition: all 0.12s;
        }

        .modal-type-btn.active {
          background: #2d5a3d;
          color: #e8f4ec;
          border-color: #2d5a3d;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
        }

        .modal-btn-cancel {
          flex: 1;
          padding: 0.75rem;
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

        .modal-btn-confirm {
          flex: 1;
          padding: 0.75rem;
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

        .modal-btn-confirm:hover { background: #245033; }

        /* Receipt */
        .receipt-dashed {
          border-top: 2px dashed #ddd8cc;
          border-bottom: 2px dashed #ddd8cc;
          padding: 1rem 0;
          margin-bottom: 1.25rem;
        }

        .receipt-item-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: #1a3528;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .receipt-disc-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          color: #c05050;
          font-style: italic;
          margin-bottom: 0.4rem;
        }

        .receipt-total-row {
          display: flex;
          justify-content: space-between;
          font-weight: 800;
          font-size: 1.05rem;
          color: #1a3528;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #ddd8cc;
        }

        .receipt-logo-circle {
          width: 48px;
          height: 48px;
          background: #2d5a3d;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
        }

        .badge-green {
          display: inline-block;
          background: #e6ede8;
          color: #2d5a3d;
          border-radius: 0.35rem;
          padding: 1px 6px;
          font-size: 0.72rem;
          font-weight: 700;
        }
      `}</style>

      <div className="sales-root">
        {/* ── Left: Product Grid ── */}
        <div className="sales-left">
          <div className="sales-search-row">
            <div className="search-box">
              <Search size={18} color="#7a9e8a" />
              <input
                type="text"
                className="search-input"
                ref={searchInputRef}
                placeholder={t('search_product_barcode')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  const match = products.find(p => p.barcode === e.target.value);
                  if (match) { handleProductClick(match); setSearch(''); }
                }}
                autoFocus
              />
            </div>
            <div className="cat-box">
              <Tag size={16} color="#7a9e8a" />
              <select
                className="cat-select"
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">{t('all_categories')}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="product-grid">
            {filteredProducts.map(product => (
              <div key={product.id} className="product-card" onClick={() => handleProductClick(product)}>
                <div className="product-img">
                  {product.image_url
                    ? <img src={product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Package size={26} />}
                </div>
                <div className="product-name">{product.name}</div>
                <div className="product-price">
                  {currency}{product.price.toFixed(2)}
                  <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{priceUnitLabel(product.base_unit)}</span>
                </div>
                <div className={`product-stock ${product.stock < 10 ? 'product-stock-low' : ''}`}>
                  {formatQtyUnit(product.stock, product.base_unit)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Checkout Panel ── */}
        <div className="checkout-panel">
          <div className="checkout-header">
            <ShoppingCart size={18} color="#2d5a3d" />
            {t('checkout')}
          </div>

          {/* Cart list */}
          <div className="cart-list">
            {cart.length === 0 && <div className="cart-empty">{t('scan_to_begin')}</div>}
            {cart.map(item => (
              <div key={item.product.id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.product.name}</div>
                  <div className="cart-item-meta">
                    {formatQtyUnit(item.quantity, item.product.base_unit)} × {currency}{item.product.price.toFixed(2)}
                    {item.discountValue > 0 && (
                      <span className="cart-item-disc"> · -{item.discountType === 'percentage' ? `${item.discountValue}%` : `${currency}${item.discountValue}`}</span>
                    )}
                  </div>
                </div>
                <div className="cart-item-total">
                  {currency}{(item.product.price * item.quantity - (item.discountType === 'percentage' ? (item.product.price * item.quantity * item.discountValue / 100) : item.discountValue)).toFixed(2)}
                </div>
                <div className="cart-item-actions">
                  <button className="ci-btn" onClick={() => updateQuantity(item.product.id!, -1)}><Minus size={11} /></button>
                  <button className="ci-btn" onClick={() => updateQuantity(item.product.id!, 1)}><Plus size={11} /></button>
                  <button className={`ci-btn ci-btn-disc ${item.discountValue > 0 ? 'active' : ''}`} onClick={() => handleItemDiscountOpen(item)} title="Discount"><Tag size={11} /></button>
                  <button className="ci-btn-del" onClick={() => setCart(c => c.filter(i => i.product.id !== item.product.id))}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>

          {/* Bill Discount */}
          <div className="bill-disc-section">
            <div className="bill-disc-label">
              <span>{t('bill_discount')}</span>
              <div className="disc-type-toggle">
                <button className={`disc-type-btn ${billDiscountType === 'percentage' ? 'active' : ''}`} onClick={() => setBillDiscountType('percentage')}>%</button>
                <button className={`disc-type-btn ${billDiscountType === 'fixed' ? 'active' : ''}`} onClick={() => setBillDiscountType('fixed')}>{currency}</button>
              </div>
            </div>
            <div className="bill-disc-input-row">
              <input className="bill-disc-input" type="number" value={billDiscountValue || ''} onChange={(e) => setBillDiscountValue(parseFloat(e.target.value) || 0)} placeholder="0.00" />
              {cartStats.billDiscount > 0 && <span className="bill-disc-amt">-{currency}{cartStats.billDiscount.toFixed(2)}</span>}
            </div>
          </div>

          {/* Totals */}
          <div className="totals-box">
            <div className="totals-row"><span>{t('items_total')}</span><span>{currency}{cartStats.rawSubtotal.toFixed(2)}</span></div>
            {cartStats.totalProductDiscount > 0 && (
              <div className="totals-row totals-row-danger"><span>{t('product_discounts')}</span><span>-{currency}{cartStats.totalProductDiscount.toFixed(2)}</span></div>
            )}
            <div className="totals-row"><span>{t('subtotal')}</span><span>{currency}{cartStats.subtotalAfterProductDiscounts.toFixed(2)}</span></div>
            <div className="totals-row totals-row-total"><span>{t('total')}</span><span>{currency}{cartStats.finalTotal.toFixed(2)}</span></div>
          </div>

          {/* Payment */}
          <div className="payment-section">
            <div className="pay-label">{t('payment_method')}</div>
            <div className="pay-methods">
              <button className={`pay-btn ${paymentMethod === 'Cash' ? 'active' : ''}`} onClick={() => setPaymentMethod('Cash')}><Banknote size={15} /> {t('cash')}</button>
              <button className={`pay-btn ${paymentMethod === 'Card' ? 'active' : ''}`} onClick={() => setPaymentMethod('Card')}><CreditCard size={15} /> {t('card')}</button>
            </div>
            {paymentMethod === 'Cash' && (
              <div className="cash-row">
                <div>
                  <div className="cash-label">{t('cash_received')}</div>
                  <input className="cash-input" type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <div className="cash-label">{t('change_amount')}</div>
                  <div className="change-val">{currency}{change.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="action-row">
            <button className="btn-clear" onClick={() => { setCart([]); setCashReceived(''); }}>{t('clear')}</button>
            <button className="btn-complete" disabled={cart.length === 0 || loading} onClick={handleCompleteSale}>
              {loading ? t('processing') : t('complete_sale')}
            </button>
          </div>
        </div>

        {/* ── Qty Modal ── */}
        {qtyModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">{t('enter_quantity')}</h3>
                  <p className="modal-sub">{qtyModal.product.name}</p>
                </div>
                <button className="modal-close-btn" onClick={() => setQtyModal(null)}><X size={16} /></button>
              </div>
              <div className="modal-info-box">
                <div className="modal-info-label">{t('quick_info')}</div>
                <div className="modal-info-row"><span>{t('price')}</span><span className="modal-info-val">{currency}{qtyModal.product.price.toFixed(2)}{priceUnitLabel(qtyModal.product.base_unit)}</span></div>
                <div className="modal-info-row"><span>{t('stock')}</span><span className="badge-green">{formatQtyUnit(qtyModal.product.stock, qtyModal.product.base_unit)}</span></div>
              </div>
              <label className="modal-label">{t('quantity')} ({t(qtyModal.product.base_unit)})</label>
              <input className="modal-input" type="number" step="0.001" autoFocus value={qtyInput} onChange={e => setQtyInput(e.target.value)} placeholder="0.000" onKeyDown={e => e.key === 'Enter' && handleQtyModalConfirm()} />
              {qtyInput && parseFloat(qtyInput) > 0 && (
                <div className="modal-subtotal-preview">
                  <div className="modal-subtotal-label">{t('subtotal')}</div>
                  <div className="modal-subtotal-val">{currency}{(parseFloat(qtyInput) * qtyModal.product.price).toFixed(2)}</div>
                </div>
              )}
              <div className="modal-actions">
                <button className="modal-btn-cancel" onClick={() => setQtyModal(null)}>{t('cancel')}</button>
                <button className="modal-btn-confirm" onClick={handleQtyModalConfirm}>{t('add_to_cart')}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Item Discount Modal ── */}
        {itemDiscountModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">{t('item_discount')}</h3>
                  <p className="modal-sub">{itemDiscountModal.name}</p>
                </div>
                <button className="modal-close-btn" onClick={() => setItemDiscountModal(null)}><X size={16} /></button>
              </div>
              <div className="modal-type-row">
                <button className={`modal-type-btn ${itemDiscountType === 'percentage' ? 'active' : ''}`} onClick={() => setItemDiscountType('percentage')}>{t('percentage')}</button>
                <button className={`modal-type-btn ${itemDiscountType === 'fixed' ? 'active' : ''}`} onClick={() => setItemDiscountType('fixed')}>{t('fixed_amount')} ({currency})</button>
              </div>
              <label className="modal-label">{t('discount_value')}</label>
              <input className="modal-input" type="number" autoFocus value={itemDiscountInput} onChange={e => setItemDiscountInput(e.target.value)} placeholder="0.00" onKeyDown={e => e.key === 'Enter' && handleItemDiscountConfirm()} />
              <div className="modal-actions">
                <button className="modal-btn-cancel" onClick={() => setItemDiscountModal(null)}>{t('cancel')}</button>
                <button className="modal-btn-confirm" onClick={handleItemDiscountConfirm}>{t('apply_discount')}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Receipt Modal ── */}
        {showReceipt && (
          <div className="modal-overlay">
            <div className="modal-card" style={{ maxWidth: '420px', padding: '2rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                {settings?.logo_url
                  ? <img src={settings.logo_url} alt="Logo" style={{ maxWidth: '90px', marginBottom: '1rem' }} />
                  : <div className="receipt-logo-circle"><ShoppingCart size={22} color="#a8d4b8" /></div>}
                <h2 style={{ fontSize: `${settings?.font_size_header || 22}px`, fontWeight: 800, color: '#1a3528', margin: '0 0 0.2rem' }}>{settings?.shop_name}</h2>
                <p style={{ fontSize: `${settings?.font_size_body || 13}px`, color: '#7a9e8a', margin: 0 }}>{settings?.receipt_text}</p>
                <div style={{ fontSize: '0.7rem', color: '#b0a898', marginTop: '0.4rem' }}>{t('invoice')} {showReceipt.invoice}</div>
              </div>
              <div className="receipt-dashed">
                {showReceipt.items.map((item, idx) => {
                  const itemTotal = item.product.price * item.quantity;
                  const disc = item.discountType === 'percentage' ? (itemTotal * item.discountValue / 100) : item.discountValue;
                  return (
                    <div key={idx} style={{ marginBottom: '0.5rem' }}>
                      <div className="receipt-item-row">
                        <span>{item.product.name} × {formatQtyUnit(item.quantity, item.product.base_unit)}</span>
                        <span>{currency}{itemTotal.toFixed(2)}</span>
                      </div>
                      {disc > 0 && (
                        <div className="receipt-disc-row">
                          <span>{t('discount')} ({item.discountType === 'percentage' ? `${item.discountValue}%` : t('fixed_amount')})</span>
                          <span>-{currency}{disc.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #ddd8cc', marginTop: '0.4rem' }}>
                  <div className="receipt-item-row" style={{ fontSize: '0.8rem', color: '#7a9e8a' }}><span>{t('subtotal')}</span><span>{currency}{(showReceipt.total + showReceipt.billDiscount).toFixed(2)}</span></div>
                  {showReceipt.billDiscount > 0 && (
                    <div className="receipt-item-row" style={{ fontSize: '0.8rem', color: '#c05050' }}><span>{t('bill_discount')}</span><span>-{currency}{showReceipt.billDiscount.toFixed(2)}</span></div>
                  )}
                  <div className="receipt-total-row"><span>{t('final_total')}</span><span>{currency}{showReceipt.total.toFixed(2)}</span></div>
                </div>
              </div>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: `${settings?.font_size_footer || 12}px`, color: '#7a9e8a', fontStyle: 'italic', margin: '0 0 0.4rem' }}>{settings?.footer_text || t('thank_you')}</p>
                <div style={{ fontSize: '0.65rem', color: '#b0a898' }}>{new Date().toLocaleString()}</div>
              </div>
              <div className="modal-actions no-print">
                <button className="modal-btn-cancel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }} onClick={() => setShowReceipt(null)}><X size={15} /> {t('close')}</button>
                <button 
                  className="modal-btn-confirm" 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }} 
                  title={`Print to: ${settings?.printer_name || 'Default Printer'}`}
                  onClick={() => handleSilentPrint({ items: showReceipt.items, total: showReceipt.total, billDiscount: showReceipt.billDiscount, totalProductDiscount: showReceipt.totalProductDiscount, invoice: showReceipt.invoice })}
                >
                  <Printer size={15} /> {t('print')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SalesScreen;