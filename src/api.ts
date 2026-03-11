import { invoke } from "@tauri-apps/api/core";

export interface Category {
  id?: number;
  name: string;
}

export interface UserPublic {
  id: number;
  username: string;
  role: 'admin' | 'cashier';
  is_active: boolean;
  is_default_password: boolean;
}

export interface Product {
  id?: number;
  name: string;
  price: number;
  barcode?: string;
  stock: number;
  category_id?: number;
  image_url?: string;
  base_unit: string;
  allow_decimal_quantity: boolean;
  expiry_date: string | null;
}

export interface Sale {
  id?: number;
  invoice_number: string;
  date: string;
  total: number;
  payment_method: string;
  cash_received?: number;
  change_given?: number;
  bill_discount_value: number;
  bill_discount_type: string;
  total_product_discount: number;
}

export interface SaleItem {
  product_id: number;
  quantity: number;
  unit?: string;
  price: number;
  discount_value: number;
  discount_type: string;
  discount_amount: number;
  subtotal?: number;
}

export interface SaleItemDetailed {
  product_name: string;
  quantity: number;
  unit: string;
  price: number;
  discount_amount: number;
  subtotal: number;
}

export interface SaleWithItems {
  sale: Sale;
  items: SaleItemDetailed[];
}

export interface Settings {
  shop_name: string;
  receipt_text: string;
  logo_url: string | null;
  footer_text: string | null;
  font_size_header: number;
  font_size_body: number;
  font_size_footer: number;
  currency: string;
  kiosk_enabled: boolean;
  kiosk_pin: string | null;
  idle_timeout_minutes: number;
  auto_start_kiosk: boolean;
}

export interface DashboardStats {
  today_sales: number;
  today_orders: number;
  low_stock_count: number;
  expiring_soon_count: number;
}

// Report interfaces
export interface SalesByPeriod {
  period: string;
  total: number;
  count: number;
  discounts: number;
}

export interface PaymentMethodSummary {
  payment_method: string;
  total: number;
  count: number;
}

export interface TopProduct {
  product_name: string;
  total_qty: number;
  total_revenue: number;
}

export interface CategorySales {
  category_name: string;
  total: number;
  count: number;
}

export interface HourlySales {
  hour: number;
  total: number;
  count: number;
}

export interface StockReport {
  product_name: string;
  stock: number;
  price: number;
  value: number;
  base_unit: string;
  category_name: string;
  status: string;
}

export interface ExpiryReport {
  product_name: string;
  stock: number;
  expiry_date: string;
  days_left: number;
  status: string;
}

export interface CategoryStockValue {
  category_name: string;
  product_count: number;
  total_value: number;
}

// Supplier interfaces
export interface Supplier {
  id?: number;
  name: string;
  company_name?: string;
  contact_person: string;
  phone: string;
  email?: string;
  address?: string;
  tax_number?: string;
  notes?: string;
  created_at?: string;
}

export interface SupplierWithStats {
  id: number;
  name: string;
  company_name?: string;
  contact_person: string;
  phone: string;
  email?: string;
  address?: string;
  tax_number?: string;
  notes?: string;
  created_at?: string;
  total_purchases: number;
  outstanding_balance: number;
}

export interface PurchaseInvoice {
  id?: number;
  invoice_number: string;
  supplier_id: number;
  date: string;
  subtotal: number;
  discount: number;
  tax: number;
  grand_total: number;
  payment_status: string;
  notes?: string;
  created_at?: string;
}

export interface PurchaseInvoiceItem {
  id?: number;
  invoice_id?: number;
  product_id: number;
  quantity: number;
  purchase_price: number;
  discount: number;
  tax: number;
  subtotal: number;
}

export interface PurchaseInvoiceItemDetailed {
  product_name: string;
  quantity: number;
  purchase_price: number;
  discount: number;
  tax: number;
  subtotal: number;
}

export interface PurchaseInvoiceWithItems {
  invoice: PurchaseInvoice;
  items: PurchaseInvoiceItemDetailed[];
  supplier_name: string;
}

export interface PurchaseInvoiceSummary {
  id: number;
  invoice_number: string;
  supplier_name: string;
  date: string;
  grand_total: number;
  payment_status: string;
}

// Revenue report interfaces
export interface RevenueByPeriod {
  period: string;
  total_sales: number;
  total_cogs: number;
  total_discounts: number;
  total_purchase_tax: number;
  net_profit: number;
  sale_count: number;
}

export interface ProductProfit {
  product_name: string;
  category_name: string;
  qty_sold: number;
  selling_revenue: number;
  purchase_cost: number;
  profit: number;
}

export interface CategoryProfit {
  category_name: string;
  total_sales: number;
  total_cost: number;
  profit: number;
  product_count: number;
}

export interface RevenueSummary {
  total_sales: number;
  total_cogs: number;
  total_discounts: number;
  total_expenses: number;
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
  sale_count: number;
  purchase_count: number;
}

export const api = {
  // Categories
  getCategories: () => invoke<Category[]>("get_categories"),
  addCategory: (name: string) => invoke<number>("add_category", { name }),
  deleteCategory: (id: number) => invoke<void>("delete_category", { id }),

  // Products
  getProducts: () => invoke<Product[]>("get_products"),
  addProduct: (product: { 
    name: string; 
    price: number; 
    barcode?: string; 
    stock: number; 
    category_id?: number; 
    image_url?: string;
    base_unit: string;
    allow_decimal_quantity: boolean;
    expiry_date: string | null;
  }) => invoke<number>("add_product", { 
    name: product.name,
    price: product.price,
    barcode: product.barcode,
    stock: product.stock,
    categoryId: product.category_id,
    imageUrl: product.image_url,
    baseUnit: product.base_unit,
    allowDecimalQuantity: product.allow_decimal_quantity,
    expiryDate: product.expiry_date
  }),
  bulkAddProducts: (products: Product[]) => invoke<number>("bulk_add_products", { products }),
  updateProduct: (product: Product) => invoke<void>("update_product", { 
    id: product.id,
    name: product.name,
    price: product.price,
    barcode: product.barcode,
    stock: product.stock,
    categoryId: product.category_id,
    imageUrl: product.image_url,
    baseUnit: product.base_unit,
    allowDecimalQuantity: product.allow_decimal_quantity,
    expiryDate: product.expiry_date
  }),
  deleteProduct: (id: number) => invoke<void>("delete_product", { id }),

  // Barcode
  generateBarcode: () => invoke<string>("generate_barcode"),
  checkBarcodeUnique: (barcode: string, excludeProductId?: number) => 
    invoke<boolean>("check_barcode_unique", { barcode, excludeProductId }),
  
  // Sales
  completeSale: (
    total: number, 
    paymentMethod: string, 
    items: SaleItem[],
    billDiscountValue: number,
    billDiscountType: string,
    totalProductDiscount: number,
    cashReceived?: number, 
    changeGiven?: number
  ) => invoke<number>("complete_sale", { 
    total, 
    paymentMethod, 
    items, 
    billDiscountValue,
    billDiscountType,
    totalProductDiscount,
    cashReceived, 
    changeGiven 
  }),
  
  getSalesHistory: (startDate?: string, endDate?: string) => 
    invoke<Sale[]>("get_sales_history", { startDate, endDate }),
  getSaleDetails: (saleId: number) => invoke<SaleWithItems>("get_sale_details", { saleId }),
  getExpiringProducts: () => invoke<Product[]>("get_expiring_products"),
  
  // Dashboard
  getDashboardStats: () => invoke<DashboardStats>("get_dashboard_stats"),

  // Settings & Utilities
  getSettings: () => invoke<Settings>("get_settings"),
  updateSettings: (settings: Settings) => invoke<void>("update_settings", { 
    shopName: settings.shop_name,
    receiptText: settings.receipt_text,
    logoUrl: settings.logo_url,
    footerText: settings.footer_text,
    fontSizeHeader: settings.font_size_header,
    fontSizeBody: settings.font_size_body,
    fontSizeFooter: settings.font_size_footer,
    currency: settings.currency,
    kioskEnabled: settings.kiosk_enabled,
    kioskPin: settings.kiosk_pin,
    idleTimeoutMinutes: settings.idle_timeout_minutes,
    autoStartKiosk: settings.auto_start_kiosk,
  }),
  backupDb: () => invoke<string>("backup_db"),
  restoreDb: (backupPath: string) => invoke<void>("restore_db", { backupPath }),
  resetDb: () => invoke<void>("reset_db"),
  
  getDailySales: () => invoke<number>("get_daily_sales"),

  // --- Auth ---
  login: (username: string, password: string) => invoke<UserPublic>("login", { username, password }),
  changePassword: (username: string, oldPassword: string, newPassword: string) =>
    invoke<void>("change_password", { username, oldPassword, newPassword }),

  // --- User Management ---
  getUsers: () => invoke<UserPublic[]>("get_users"),
  addUser: (username: string, password: string, role: string) =>
    invoke<number>("add_user", { username, password, role }),
  updateUser: (id: number, role: string, isActive: boolean) =>
    invoke<void>("update_user", { id, role, isActive }),
  deleteUser: (id: number) => invoke<void>("delete_user", { id }),
  resetUserPassword: (id: number, newPassword: string) =>
    invoke<void>("reset_user_password", { id, newPassword }),

  // --- Kiosk ---
  verifyKioskPin: (pin: string) => invoke<boolean>("verify_kiosk_pin", { pin }),

  // --- Reports ---
  getSalesByPeriod: (startDate?: string, endDate?: string, groupBy: string = 'day') =>
    invoke<SalesByPeriod[]>("get_sales_by_period", { startDate, endDate, groupBy }),
  getPaymentMethodSummary: (startDate?: string, endDate?: string) =>
    invoke<PaymentMethodSummary[]>("get_payment_method_summary", { startDate, endDate }),
  getTopProducts: (startDate?: string, endDate?: string, limit?: number) =>
    invoke<TopProduct[]>("get_top_products", { startDate, endDate, limit }),
  getCategorySales: (startDate?: string, endDate?: string) =>
    invoke<CategorySales[]>("get_category_sales", { startDate, endDate }),
  getHourlySales: (startDate?: string, endDate?: string) =>
    invoke<HourlySales[]>("get_hourly_sales", { startDate, endDate }),
  getStockReport: () => invoke<StockReport[]>("get_stock_report"),
  getExpiryReport: () => invoke<ExpiryReport[]>("get_expiry_report"),
  getCategoryStockValue: () => invoke<CategoryStockValue[]>("get_category_stock_value"),

  // --- Suppliers ---
  getSuppliers: () => invoke<SupplierWithStats[]>("get_suppliers"),
  addSupplier: (s: Supplier) => invoke<number>("add_supplier", {
    name: s.name, companyName: s.company_name, contactPerson: s.contact_person,
    phone: s.phone, email: s.email, address: s.address, taxNumber: s.tax_number, notes: s.notes,
  }),
  updateSupplier: (s: Supplier) => invoke<void>("update_supplier", {
    id: s.id, name: s.name, companyName: s.company_name, contactPerson: s.contact_person,
    phone: s.phone, email: s.email, address: s.address, taxNumber: s.tax_number, notes: s.notes,
  }),
  deleteSupplier: (id: number) => invoke<void>("delete_supplier", { id }),

  // --- Purchase Invoices ---
  createPurchaseInvoice: (
    supplierId: number, date: string, subtotal: number, discount: number,
    tax: number, grandTotal: number, paymentStatus: string, notes: string | undefined,
    items: PurchaseInvoiceItem[]
  ) => invoke<number>("create_purchase_invoice", {
    supplierId, date, subtotal, discount, tax, grandTotal, paymentStatus, notes, items,
  }),
  getPurchaseInvoices: (supplierId?: number, startDate?: string, endDate?: string, paymentStatus?: string) =>
    invoke<PurchaseInvoiceSummary[]>("get_purchase_invoices", { supplierId, startDate, endDate, paymentStatus }),
  getPurchaseInvoiceDetails: (invoiceId: number) =>
    invoke<PurchaseInvoiceWithItems>("get_purchase_invoice_details", { invoiceId }),
  updatePurchaseInvoiceStatus: (invoiceId: number, paymentStatus: string) =>
    invoke<void>("update_purchase_invoice_status", { invoiceId, paymentStatus }),

  // --- Revenue Reports ---
  getRevenueSummary: (startDate?: string, endDate?: string) =>
    invoke<RevenueSummary>("get_revenue_summary", { startDate, endDate }),
  getRevenueByPeriod: (startDate?: string, endDate?: string, groupBy: string = 'day') =>
    invoke<RevenueByPeriod[]>("get_revenue_by_period", { startDate, endDate, groupBy }),
  getProductProfit: (startDate?: string, endDate?: string) =>
    invoke<ProductProfit[]>("get_product_profit", { startDate, endDate }),
  getCategoryProfit: (startDate?: string, endDate?: string) =>
    invoke<CategoryProfit[]>("get_category_profit", { startDate, endDate }),
};

// Helper: format a quantity with its unit for display
export function formatQtyUnit(qty: number, unit: string): string {
  if (unit === 'kg' && qty < 1) return `${(qty * 1000).toFixed(0)} g`;
  if (unit === 'l' && qty < 1) return `${(qty * 1000).toFixed(0)} ml`;
  return `${qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(3)} ${unit}`;
}

// Helper: get unit label for prices
export function priceUnitLabel(unit: string): string {
  const map: Record<string, string> = {
    'kg': '/kg', 'g': '/g', 'l': '/l', 'ml': '/ml',
    'piece': '/pc', 'packet': '/pkt'
  };
  return map[unit] || `/${unit}`;
}
