use crate::db::DbState;
use crate::models::{Product, Sale, SaleItem, SaleWithItems, SaleItemDetailed, Settings, Category, DashboardStats};
use rusqlite::params;
use tauri::State;
use chrono::Local;
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

// --- Categories ---

#[tauri::command]
pub fn get_categories(state: State<DbState>) -> Result<Vec<Category>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, name FROM categories").map_err(|e| e.to_string())?;
    let cats = stmt.query_map([], |row| {
        Ok(Category {
            id: Some(row.get(0)?),
            name: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(cats)
}

#[tauri::command]
pub fn add_category(state: State<DbState>, name: String) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();
    conn.execute("INSERT INTO categories (name) VALUES (?)", params![name]).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn delete_category(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM categories WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// --- Products ---

#[tauri::command]
pub fn get_products(state: State<DbState>) -> Result<Vec<Product>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, name, price, barcode, stock, category_id, image_url, base_unit, allow_decimal_quantity, expiry_date FROM products"
    ).map_err(|e| e.to_string())?;
    let products = stmt.query_map([], |row| {
        let allow_dec: i32 = row.get(8)?;
        Ok(Product {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            price: row.get(2)?,
            barcode: row.get(3)?,
            stock: row.get(4)?,
            category_id: row.get(5)?,
            image_url: row.get(6)?,
            base_unit: row.get(7)?,
            allow_decimal_quantity: allow_dec != 0,
            expiry_date: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    
    Ok(products)
}

#[tauri::command]
pub fn add_product(
    state: State<DbState>, 
    name: String, 
    price: f64, 
    barcode: Option<String>, 
    stock: f64, 
    category_id: Option<i64>, 
    image_url: Option<String>,
    base_unit: String,
    allow_decimal_quantity: bool,
    expiry_date: Option<String>,
) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();
    let allow_dec_int: i32 = if allow_decimal_quantity { 1 } else { 0 };
    conn.execute(
        "INSERT INTO products (name, price, barcode, stock, category_id, image_url, base_unit, allow_decimal_quantity, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![name, price, barcode, stock, category_id, image_url, base_unit, allow_dec_int, expiry_date],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn bulk_add_products(state: State<DbState>, products: Vec<Product>) -> Result<i32, String> {
    let mut conn = state.0.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let mut count = 0;
    for product in products {
        let allow_dec_int: i32 = if product.allow_decimal_quantity { 1 } else { 0 };
        tx.execute(
            "INSERT INTO products (name, price, barcode, stock, category_id, image_url, base_unit, allow_decimal_quantity, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                product.name,
                product.price,
                product.barcode,
                product.stock,
                product.category_id,
                product.image_url,
                product.base_unit,
                allow_dec_int,
                product.expiry_date
            ],
        ).map_err(|e| e.to_string())?;
        count += 1;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(count)
}

#[tauri::command]
pub fn update_product(
    state: State<DbState>, 
    id: i64, 
    name: String, 
    price: f64, 
    barcode: Option<String>, 
    stock: f64,
    category_id: Option<i64>,
    image_url: Option<String>,
    base_unit: String,
    allow_decimal_quantity: bool,
    expiry_date: Option<String>,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    let allow_dec_int: i32 = if allow_decimal_quantity { 1 } else { 0 };
    conn.execute(
        "UPDATE products SET name = ?, price = ?, barcode = ?, stock = ?, category_id = ?, image_url = ?, base_unit = ?, allow_decimal_quantity = ?, expiry_date = ? WHERE id = ?",
        params![name, price, barcode, stock, category_id, image_url, base_unit, allow_dec_int, expiry_date, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_product(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM products WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// --- Sales ---

#[tauri::command]
pub fn complete_sale(
    state: State<DbState>, 
    total: f64, 
    payment_method: String, 
    cash_received: Option<f64>,
    change_given: Option<f64>,
    bill_discount_value: f64,
    bill_discount_type: String,
    total_product_discount: f64,
    items: Vec<SaleItem>
) -> Result<i64, String> {
    let mut conn = state.0.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Check stock availability first
    for item in &items {
        let current_stock: f64 = tx.query_row(
            "SELECT stock FROM products WHERE id = ?",
            params![item.product_id],
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;
        
        if current_stock < item.quantity {
            let pname: String = tx.query_row(
                "SELECT name FROM products WHERE id = ?",
                params![item.product_id],
                |row| row.get(0)
            ).map_err(|e| e.to_string())?;
            return Err(format!("Insufficient stock for '{}'. Available: {}, Requested: {}", pname, current_stock, item.quantity));
        }
    }

    let date = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    // Generate Invoice Number: INV-XXXXX
    let count: i64 = tx.query_row("SELECT COUNT(*) FROM sales", [], |row| row.get(0)).unwrap_or(0);
    let invoice_number = format!("INV-{:05}", count + 1);

    tx.execute(
        "INSERT INTO sales (invoice_number, date, total, payment_method, cash_received, change_given, bill_discount_value, bill_discount_type, total_product_discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![invoice_number, date, total, payment_method, cash_received, change_given, bill_discount_value, bill_discount_type, total_product_discount],
    ).map_err(|e| e.to_string())?;

    let sale_id = tx.last_insert_rowid();

    for item in &items {
        let unit = item.unit.clone().unwrap_or_else(|| "piece".to_string());
        let subtotal = item.subtotal.unwrap_or(item.quantity * item.price - item.discount_amount);
        
        tx.execute(
            "INSERT INTO sale_items (sale_id, product_id, quantity, unit, price, discount_value, discount_type, discount_amount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![sale_id, item.product_id, item.quantity, unit, item.price, item.discount_value, item.discount_type, item.discount_amount, subtotal],
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "UPDATE products SET stock = stock - ? WHERE id = ?",
            params![item.quantity, item.product_id],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(sale_id)
}

#[tauri::command]
pub fn get_sales_history(state: State<DbState>, start_date: Option<String>, end_date: Option<String>) -> Result<Vec<Sale>, String> {
    let conn = state.0.lock().unwrap();
    let mut query = "SELECT id, invoice_number, date, total, payment_method, cash_received, change_given, bill_discount_value, bill_discount_type, total_product_discount FROM sales".to_string();
    let mut params_vec: Vec<String> = Vec::new();

    if let (Some(s), Some(e)) = (start_date, end_date) {
        query.push_str(" WHERE date >= ? AND date <= ?");
        params_vec.push(format!("{} 00:00:00", s));
        params_vec.push(format!("{} 23:59:59", e));
    }

    query.push_str(" ORDER BY id DESC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let sales = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
        Ok(Sale {
            id: Some(row.get(0)?),
            invoice_number: row.get(1)?,
            date: row.get(2)?,
            total: row.get(3)?,
            payment_method: row.get(4)?,
            cash_received: row.get(5)?,
            change_given: row.get(6)?,
            bill_discount_value: row.get(7)?,
            bill_discount_type: row.get(8)?,
            total_product_discount: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    
    Ok(sales)
}

#[tauri::command]
pub fn get_sale_details(state: State<DbState>, sale_id: i64) -> Result<SaleWithItems, String> {
    let conn = state.0.lock().unwrap();
    
    let sale = conn.query_row(
        "SELECT id, invoice_number, date, total, payment_method, cash_received, change_given, bill_discount_value, bill_discount_type, total_product_discount FROM sales WHERE id = ?",
        params![sale_id],
        |row| Ok(Sale {
            id: Some(row.get(0)?),
            invoice_number: row.get(1)?,
            date: row.get(2)?,
            total: row.get(3)?,
            payment_method: row.get(4)?,
            cash_received: row.get(5)?,
            change_given: row.get(6)?,
            bill_discount_value: row.get(7)?,
            bill_discount_type: row.get(8)?,
            total_product_discount: row.get(9)?,
        })
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT p.name, si.quantity, si.unit, si.price, si.discount_amount, si.subtotal 
         FROM sale_items si 
         JOIN products p ON si.product_id = p.id 
         WHERE si.sale_id = ?"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map(params![sale_id], |row| {
        Ok(SaleItemDetailed {
            product_name: row.get(0)?,
            quantity: row.get(1)?,
            unit: row.get(2)?,
            price: row.get(3)?,
            discount_amount: row.get(4)?,
            subtotal: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(SaleWithItems { sale, items })
}

// --- Dashboard ---

#[tauri::command]
pub fn get_dashboard_stats(state: State<DbState>) -> Result<DashboardStats, String> {
    let conn = state.0.lock().unwrap();
    let today = Local::now().format("%Y-%m-%d").to_string();
    
    let today_sales: f64 = conn.query_row(
        "SELECT COALESCE(SUM(total), 0) FROM sales WHERE date LIKE ?",
        params![format!("{}%", today)],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    let today_orders: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sales WHERE date LIKE ?",
        params![format!("{}%", today)],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    let low_stock_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM products WHERE stock < 10",
        [],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    let expiring_soon_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM products WHERE expiry_date IS NOT NULL AND expiry_date <= date('now', '+30 days')",
        [],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    Ok(DashboardStats {
        today_sales,
        today_orders,
        low_stock_count,
        expiring_soon_count,
    })
}

#[tauri::command]
pub fn get_expiring_products(state: State<DbState>) -> Result<Vec<Product>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, name, price, barcode, stock, category_id, image_url, base_unit, allow_decimal_quantity, expiry_date 
         FROM products 
         WHERE expiry_date IS NOT NULL AND expiry_date <= date('now', '+30 days')
         ORDER BY expiry_date ASC"
    ).map_err(|e| e.to_string())?;
    
    let products = stmt.query_map([], |row| {
        let allow_dec: i32 = row.get(8)?;
        Ok(Product {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            price: row.get(2)?,
            barcode: row.get(3)?,
            stock: row.get(4)?,
            category_id: row.get(5)?,
            image_url: row.get(6)?,
            base_unit: row.get(7)?,
            allow_decimal_quantity: allow_dec != 0,
            expiry_date: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    
    Ok(products)
}

// --- Utilities ---

#[tauri::command]
pub fn get_settings(state: State<DbState>) -> Result<Settings, String> {
    let conn = state.0.lock().unwrap();
    conn.query_row(
        "SELECT shop_name, receipt_text, logo_url, footer_text, font_size_header, font_size_body, font_size_footer, currency FROM settings WHERE id = 1",
        [],
        |row| Ok(Settings {
            shop_name: row.get(0)?,
            receipt_text: row.get(1)?,
            logo_url: row.get(2)?,
            footer_text: row.get(3)?,
            font_size_header: row.get(4)?,
            font_size_body: row.get(5)?,
            font_size_footer: row.get(6)?,
            currency: row.get(7)?,
        })
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_settings(
    state: State<DbState>, 
    shop_name: String, 
    receipt_text: String,
    logo_url: Option<String>,
    footer_text: Option<String>,
    font_size_header: i32,
    font_size_body: i32,
    font_size_footer: i32,
    currency: String,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "UPDATE settings SET 
            shop_name = ?1, 
            receipt_text = ?2, 
            logo_url = ?3, 
            footer_text = ?4, 
            font_size_header = ?5, 
            font_size_body = ?6, 
            font_size_footer = ?7,
            currency = ?8
         WHERE id = 1",
        params![
            shop_name, 
            receipt_text, 
            logo_url, 
            footer_text, 
            font_size_header, 
            font_size_body, 
            font_size_footer,
            currency
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn backup_db(app_handle: AppHandle) -> Result<String, String> {
    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    let db_path = app_dir.join("pos.db");
    
    let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_path = app_dir.join(format!("pos_backup_{}.db", timestamp));

    fs::copy(db_path, &backup_path).map_err(|e| e.to_string())?;
    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn restore_db(app_handle: AppHandle, backup_path: String) -> Result<(), String> {
    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    let db_path = app_dir.join("pos.db");
    
    fs::copy(backup_path, db_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_daily_sales(state: State<DbState>) -> Result<f64, String> {
    let conn = state.0.lock().unwrap();
    let today = Local::now().format("%Y-%m-%d").to_string();
    let total: f64 = conn.query_row(
        "SELECT COALESCE(SUM(total), 0) FROM sales WHERE date LIKE ?",
        params![format!("{}%", today)],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;
    Ok(total)
}

// --- Auth / Users ---

#[tauri::command]
pub fn login(state: State<DbState>, username: String, password: String) -> Result<crate::models::UserPublic, String> {
    let conn = state.0.lock().unwrap();
    let hash = crate::db::hash_password(&username, &password);

    let result = conn.query_row(
        "SELECT id, username, role, is_active, is_default_password FROM users WHERE username = ?1 AND password_hash = ?2",
        params![username, hash],
        |row| {
            Ok(crate::models::UserPublic {
                id: row.get(0)?,
                username: row.get(1)?,
                role: row.get(2)?,
                is_active: {
                    let v: i32 = row.get(3)?;
                    v != 0
                },
                is_default_password: {
                    let v: i32 = row.get(4)?;
                    v != 0
                },
            })
        },
    );

    match result {
        Ok(user) => {
            if !user.is_active {
                Err("Account is inactive. Please contact your administrator.".to_string())
            } else {
                Ok(user)
            }
        }
        Err(_) => Err("Invalid username or password.".to_string()),
    }
}

#[tauri::command]
pub fn change_password(
    state: State<DbState>,
    username: String,
    old_password: String,
    new_password: String,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    let old_hash = crate::db::hash_password(&username, &old_password);

    // Verify current password
    let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM users WHERE username = ?1 AND password_hash = ?2",
        params![username, old_hash],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    if exists == 0 {
        return Err("Current password is incorrect.".to_string());
    }

    if new_password.len() < 4 {
        return Err("New password must be at least 4 characters.".to_string());
    }

    let new_hash = crate::db::hash_password(&username, &new_password);
    conn.execute(
        "UPDATE users SET password_hash = ?1, is_default_password = 0 WHERE username = ?2",
        params![new_hash, username],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_users(state: State<DbState>) -> Result<Vec<crate::models::UserPublic>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, username, role, is_active, is_default_password FROM users ORDER BY id ASC"
    ).map_err(|e| e.to_string())?;

    let users = stmt.query_map([], |row| {
        Ok(crate::models::UserPublic {
            id: row.get(0)?,
            username: row.get(1)?,
            role: row.get(2)?,
            is_active: {
                let v: i32 = row.get(3)?;
                v != 0
            },
            is_default_password: {
                let v: i32 = row.get(4)?;
                v != 0
            },
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(users)
}

#[tauri::command]
pub fn add_user(
    state: State<DbState>,
    username: String,
    password: String,
    role: String,
) -> Result<i64, String> {
    if role != "admin" && role != "cashier" {
        return Err("Invalid role. Must be 'admin' or 'cashier'.".to_string());
    }
    if password.len() < 4 {
        return Err("Password must be at least 4 characters.".to_string());
    }

    let conn = state.0.lock().unwrap();
    let hash = crate::db::hash_password(&username, &password);
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "INSERT INTO users (username, password_hash, role, is_active, is_default_password, created_at) VALUES (?1, ?2, ?3, 1, 0, ?4)",
        params![username, hash, role, now],
    ).map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "Username already exists.".to_string()
        } else {
            e.to_string()
        }
    })?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn update_user(
    state: State<DbState>,
    id: i64,
    role: String,
    is_active: bool,
) -> Result<(), String> {
    if role != "admin" && role != "cashier" {
        return Err("Invalid role.".to_string());
    }
    let conn = state.0.lock().unwrap();
    let active_val: i32 = if is_active { 1 } else { 0 };
    conn.execute(
        "UPDATE users SET role = ?1, is_active = ?2 WHERE id = ?3",
        params![role, active_val, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_user(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    // Prevent deleting the last admin
    let admin_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1",
        [],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let target_role: String = conn.query_row(
        "SELECT role FROM users WHERE id = ?1",
        params![id],
        |row| row.get(0),
    ).map_err(|_| "User not found.".to_string())?;

    if target_role == "admin" && admin_count <= 1 {
        return Err("Cannot delete the last admin account.".to_string());
    }

    conn.execute("DELETE FROM users WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reset_user_password(
    state: State<DbState>,
    id: i64,
    new_password: String,
) -> Result<(), String> {
    if new_password.len() < 4 {
        return Err("Password must be at least 4 characters.".to_string());
    }
    let conn = state.0.lock().unwrap();
    let username: String = conn.query_row(
        "SELECT username FROM users WHERE id = ?1",
        params![id],
        |row| row.get(0),
    ).map_err(|_| "User not found.".to_string())?;

    let new_hash = crate::db::hash_password(&username, &new_password);
    conn.execute(
        "UPDATE users SET password_hash = ?1, is_default_password = 1 WHERE id = ?2",
        params![new_hash, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
