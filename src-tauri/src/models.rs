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
