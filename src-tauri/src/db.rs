use rusqlite::{Connection, Result};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use std::fs;
use sha2::{Sha256, Digest};

pub struct DbState(pub Mutex<Connection>);

pub fn hash_password(username: &str, password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(format!("{}:{}", username, password).as_bytes());
    hex::encode(hasher.finalize())
}

pub fn init_db(app_handle: &AppHandle) -> Result<Connection, String> {
    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let db_path = app_dir.join("pos.db");
    
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            barcode TEXT,
            stock REAL NOT NULL DEFAULT 0,
            category_id INTEGER,
            image_url TEXT,
            base_unit TEXT NOT NULL DEFAULT 'piece',
            allow_decimal_quantity INTEGER NOT NULL DEFAULT 0,
            expiry_date TEXT,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Migration: add new columns if missing (for existing databases)
    let _ = conn.execute("ALTER TABLE products ADD COLUMN base_unit TEXT NOT NULL DEFAULT 'piece'", []);
    let _ = conn.execute("ALTER TABLE products ADD COLUMN allow_decimal_quantity INTEGER NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE products ADD COLUMN expiry_date TEXT", []);

    conn.execute(
        "CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT NOT NULL UNIQUE,
            date TEXT NOT NULL,
            total REAL NOT NULL,
            payment_method TEXT NOT NULL,
            cash_received REAL,
            change_given REAL,
            bill_discount_value REAL NOT NULL DEFAULT 0,
            bill_discount_type TEXT NOT NULL DEFAULT 'percentage',
            total_product_discount REAL NOT NULL DEFAULT 0
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity REAL NOT NULL,
            unit TEXT NOT NULL DEFAULT 'piece',
            price REAL NOT NULL,
            discount_value REAL NOT NULL DEFAULT 0,
            discount_type TEXT NOT NULL DEFAULT 'percentage',
            discount_amount REAL NOT NULL DEFAULT 0,
            subtotal REAL NOT NULL DEFAULT 0,
            FOREIGN KEY (sale_id) REFERENCES sales(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Migration: add new columns if missing
    let _ = conn.execute("ALTER TABLE sale_items ADD COLUMN unit TEXT NOT NULL DEFAULT 'piece'", []);
    let _ = conn.execute("ALTER TABLE sale_items ADD COLUMN subtotal REAL NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE sales ADD COLUMN bill_discount_value REAL NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE sales ADD COLUMN bill_discount_type TEXT NOT NULL DEFAULT 'percentage'", []);
    let _ = conn.execute("ALTER TABLE sales ADD COLUMN total_product_discount REAL NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE sale_items ADD COLUMN discount_value REAL NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE sale_items ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'percentage'", []);
    let _ = conn.execute("ALTER TABLE sale_items ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0", []);

    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            shop_name TEXT NOT NULL,
            receipt_text TEXT NOT NULL,
            logo_url TEXT,
            footer_text TEXT,
            font_size_header INTEGER NOT NULL DEFAULT 24,
            font_size_body INTEGER NOT NULL DEFAULT 14,
            font_size_footer INTEGER NOT NULL DEFAULT 12,
            currency TEXT NOT NULL DEFAULT '$'
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Migration: add new branding columns if missing
    let _ = conn.execute("ALTER TABLE settings ADD COLUMN logo_url TEXT", []);
    let _ = conn.execute("ALTER TABLE settings ADD COLUMN footer_text TEXT", []);
    let _ = conn.execute("ALTER TABLE settings ADD COLUMN font_size_header INTEGER NOT NULL DEFAULT 24", []);
    let _ = conn.execute("ALTER TABLE settings ADD COLUMN font_size_body INTEGER NOT NULL DEFAULT 14", []);
    let _ = conn.execute("ALTER TABLE settings ADD COLUMN font_size_footer INTEGER NOT NULL DEFAULT 12", []);
    let _ = conn.execute("ALTER TABLE settings ADD COLUMN currency TEXT NOT NULL DEFAULT '$'", []);

    // Insert default settings if not exists
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM settings", [], |row| row.get(0)).unwrap_or(0);
    if count == 0 {
        conn.execute(
            "INSERT INTO settings (id, shop_name, receipt_text, font_size_header, font_size_body, font_size_footer, currency) 
             VALUES (1, 'My Awesome Shop', 'Thank you for shopping with us!', 24, 14, 12, '$')",
            [],
        ).map_err(|e| e.to_string())?;
    }

    // Users table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'cashier',
            is_active INTEGER NOT NULL DEFAULT 1,
            is_default_password INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Seed default admin account if no users exist
    let user_count: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0)).unwrap_or(0);
    if user_count == 0 {
        let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let default_hash = hash_password("admin", "admin");
        conn.execute(
            "INSERT INTO users (username, password_hash, role, is_active, is_default_password, created_at) VALUES ('admin', ?1, 'admin', 1, 1, ?2)",
            rusqlite::params![default_hash, now],
        ).map_err(|e| e.to_string())?;
    }

    Ok(conn)
}
