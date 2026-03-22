use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: Option<i64>,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Product {
    pub id: Option<i64>,
    pub name: String,
    pub price: f64,
    pub barcode: Option<String>,
    pub stock: f64,
    pub category_id: Option<i64>,
    pub image_url: Option<String>,
    pub base_unit: String,
    pub allow_decimal_quantity: bool,
    pub expiry_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Sale {
    pub id: Option<i64>,
    pub invoice_number: String,
    pub date: String,
    pub total: f64,
    pub payment_method: String,
    pub cash_received: Option<f64>,
    pub change_given: Option<f64>,
    pub bill_discount_value: f64,
    pub bill_discount_type: String, // "percentage" or "fixed"
    pub total_product_discount: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaleItem {
    pub id: Option<i64>,
    pub sale_id: Option<i64>,
    pub product_id: i64,
    pub quantity: f64,
    pub unit: Option<String>,
    pub price: f64,
    pub discount_value: f64,
    pub discount_type: String, // "percentage" or "fixed"
    pub discount_amount: f64,
    pub subtotal: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub shop_name: String,
    pub receipt_text: String,
    pub logo_url: Option<String>,
    pub footer_text: Option<String>,
    pub font_size_header: i32,
    pub font_size_body: i32,
    pub font_size_footer: i32,
    pub currency: String,
    pub kiosk_enabled: bool,
    pub kiosk_pin: Option<String>,
    pub idle_timeout_minutes: i32,
    pub auto_start_kiosk: bool,
    pub printer_name: Option<String>,
    pub auto_print_receipt: bool,
    pub receipt_width: i32,
    pub separator_style: String,
    pub show_invoice_number: bool,
    pub currency_position: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaleWithItems {
    pub sale: Sale,
    pub items: Vec<SaleItemDetailed>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaleItemDetailed {
    pub product_name: String,
    pub quantity: f64,
    pub unit: String,
    pub price: f64,
    pub discount_amount: f64,
    pub subtotal: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DashboardStats {
    pub today_sales: f64,
    pub today_orders: i64,
    pub low_stock_count: i64,
    pub expiring_soon_count: i64,
}



/// Public user info returned to the frontend (no password_hash)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserPublic {
    pub id: i64,
    pub username: String,
    pub role: String,
    pub is_active: bool,
    pub is_default_password: bool,
}

// ── Report models ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SalesByPeriod {
    pub period: String,
    pub total: f64,
    pub count: i64,
    pub discounts: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaymentMethodSummary {
    pub payment_method: String,
    pub total: f64,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TopProduct {
    pub product_name: String,
    pub total_qty: f64,
    pub total_revenue: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CategorySales {
    pub category_name: String,
    pub total: f64,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HourlySales {
    pub hour: i32,
    pub total: f64,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StockReport {
    pub product_name: String,
    pub stock: f64,
    pub price: f64,
    pub value: f64,
    pub base_unit: String,
    pub category_name: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExpiryReport {
    pub product_name: String,
    pub stock: f64,
    pub expiry_date: String,
    pub days_left: i64,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CategoryStockValue {
    pub category_name: String,
    pub product_count: i64,
    pub total_value: f64,
}

// ── Supplier models ──

#[derive(Debug, Serialize, Deserialize, Clone)]
#[allow(dead_code)]
pub struct Supplier {
    pub id: Option<i64>,
    pub name: String,
    pub company_name: Option<String>,
    pub contact_person: String,
    pub phone: String,
    pub email: Option<String>,
    pub address: Option<String>,
    pub tax_number: Option<String>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SupplierWithStats {
    pub id: i64,
    pub name: String,
    pub company_name: Option<String>,
    pub contact_person: String,
    pub phone: String,
    pub email: Option<String>,
    pub address: Option<String>,
    pub tax_number: Option<String>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub total_purchases: f64,
    pub outstanding_balance: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PurchaseInvoice {
    pub id: Option<i64>,
    pub invoice_number: String,
    pub supplier_id: i64,
    pub date: String,
    pub subtotal: f64,
    pub discount: f64,
    pub tax: f64,
    pub grand_total: f64,
    pub payment_status: String, // "paid", "unpaid", "partial"
    pub notes: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PurchaseInvoiceItem {
    pub id: Option<i64>,
    pub invoice_id: Option<i64>,
    pub product_id: i64,
    pub quantity: f64,
    pub purchase_price: f64,
    pub discount: f64,
    pub tax: f64,
    pub subtotal: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PurchaseInvoiceWithItems {
    pub invoice: PurchaseInvoice,
    pub items: Vec<PurchaseInvoiceItemDetailed>,
    pub supplier_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PurchaseInvoiceItemDetailed {
    pub product_name: String,
    pub quantity: f64,
    pub purchase_price: f64,
    pub discount: f64,
    pub tax: f64,
    pub subtotal: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PurchaseInvoiceSummary {
    pub id: i64,
    pub invoice_number: String,
    pub supplier_name: String,
    pub date: String,
    pub grand_total: f64,
    pub payment_status: String,
}

// ── Revenue / Profit report models ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RevenueByPeriod {
    pub period: String,
    pub total_sales: f64,
    pub total_cogs: f64,
    pub total_discounts: f64,
    pub total_purchase_tax: f64,
    pub net_profit: f64,
    pub sale_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProductProfit {
    pub product_name: String,
    pub category_name: String,
    pub qty_sold: f64,
    pub selling_revenue: f64,
    pub purchase_cost: f64,
    pub profit: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CategoryProfit {
    pub category_name: String,
    pub total_sales: f64,
    pub total_cost: f64,
    pub profit: f64,
    pub product_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RevenueSummary {
    pub total_sales: f64,
    pub total_cogs: f64,
    pub total_discounts: f64,
    pub total_expenses: f64,
    pub gross_profit: f64,
    pub net_profit: f64,
    pub profit_margin: f64,
    pub sale_count: i64,
    pub purchase_count: i64,
}
