use crate::db::DbState;
use crate::models::{
    Product, Sale, SaleItem, SaleWithItems, SaleItemDetailed, Settings, Category, DashboardStats,
    SalesByPeriod, PaymentMethodSummary, TopProduct, CategorySales, HourlySales,
    StockReport, ExpiryReport, CategoryStockValue,
    SupplierWithStats, PurchaseInvoice, PurchaseInvoiceItem,
    PurchaseInvoiceWithItems, PurchaseInvoiceItemDetailed, PurchaseInvoiceSummary,
    RevenueByPeriod, ProductProfit, CategoryProfit, RevenueSummary,
};
use rusqlite::params;
use tauri::State;
use chrono::Local;
use std::fs;
use tauri::AppHandle;
use tauri::Manager;
use rand::Rng;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

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

// --- Barcode ---

#[tauri::command]
pub fn generate_barcode(state: State<DbState>) -> Result<String, String> {
    let conn = state.0.lock().unwrap();
    let mut rng = rand::thread_rng();
    loop {
        let code: u64 = rng.gen_range(100_000_000_000..999_999_999_999);
        let barcode = format!("{}", code);
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM products WHERE barcode = ?",
            params![barcode],
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;
        if count == 0 {
            return Ok(barcode);
        }
    }
}

#[tauri::command]
pub fn check_barcode_unique(state: State<DbState>, barcode: String, exclude_product_id: Option<i64>) -> Result<bool, String> {
    let conn = state.0.lock().unwrap();
    let count: i64 = if let Some(pid) = exclude_product_id {
        conn.query_row(
            "SELECT COUNT(*) FROM products WHERE barcode = ? AND id != ?",
            params![barcode, pid],
            |row| row.get(0)
        ).map_err(|e| e.to_string())?
    } else {
        conn.query_row(
            "SELECT COUNT(*) FROM products WHERE barcode = ?",
            params![barcode],
            |row| row.get(0)
        ).map_err(|e| e.to_string())?
    };
    Ok(count == 0)
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
        let result = tx.execute(
            "INSERT OR IGNORE INTO products (name, price, barcode, stock, category_id, image_url, base_unit, allow_decimal_quantity, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
        if result > 0 {
            count += 1;
        }
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
        "SELECT shop_name, receipt_text, logo_url, footer_text, font_size_header, font_size_body, font_size_footer, currency, kiosk_enabled, kiosk_pin, idle_timeout_minutes, auto_start_kiosk, printer_name, auto_print_receipt FROM settings WHERE id = 1",
        [],
        |row| {
            let kiosk_en: i32 = row.get(8)?;
            let auto_start: i32 = row.get(11)?;
            let auto_print: i32 = row.get(13)?;
            Ok(Settings {
                shop_name: row.get(0)?,
                receipt_text: row.get(1)?,
                logo_url: row.get(2)?,
                footer_text: row.get(3)?,
                font_size_header: row.get(4)?,
                font_size_body: row.get(5)?,
                font_size_footer: row.get(6)?,
                currency: row.get(7)?,
                kiosk_enabled: kiosk_en != 0,
                kiosk_pin: row.get(9)?,
                idle_timeout_minutes: row.get(10)?,
                auto_start_kiosk: auto_start != 0,
                printer_name: row.get(12)?,
                auto_print_receipt: auto_print != 0,
            })
        }
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
    kiosk_enabled: bool,
    kiosk_pin: Option<String>,
    idle_timeout_minutes: i32,
    auto_start_kiosk: bool,
    printer_name: Option<String>,
    auto_print_receipt: bool,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    let kiosk_en: i32 = if kiosk_enabled { 1 } else { 0 };
    let auto_start: i32 = if auto_start_kiosk { 1 } else { 0 };
    let auto_print: i32 = if auto_print_receipt { 1 } else { 0 };
    conn.execute(
        "UPDATE settings SET 
            shop_name = ?1, 
            receipt_text = ?2, 
            logo_url = ?3, 
            footer_text = ?4, 
            font_size_header = ?5, 
            font_size_body = ?6, 
            font_size_footer = ?7,
            currency = ?8,
            kiosk_enabled = ?9,
            kiosk_pin = ?10,
            idle_timeout_minutes = ?11,
            auto_start_kiosk = ?12,
            printer_name = ?13,
            auto_print_receipt = ?14
         WHERE id = 1",
        params![
            shop_name, 
            receipt_text, 
            logo_url, 
            footer_text, 
            font_size_header, 
            font_size_body, 
            font_size_footer,
            currency,
            kiosk_en,
            kiosk_pin,
            idle_timeout_minutes,
            auto_start,
            printer_name,
            auto_print,
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

#[tauri::command]
pub fn get_printers() -> Result<Vec<String>, String> {
    #[cfg(target_os = "linux")]
    {
        let output = std::process::Command::new("lpstat")
            .arg("-a")
            .output()
            .map_err(|e| format!("Failed to list printers: {}. Is CUPS installed?", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let printers: Vec<String> = stdout
            .lines()
            .filter_map(|line| line.split_whitespace().next())
            .map(|s| s.to_string())
            .collect();
        Ok(printers)
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        // Method 1: Try WMI (more compatible across Windows versions)
        let wmi_output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Get-WmiObject -Query \"Select Name from Win32_Printer where Network=False\" | Select-Object -ExpandProperty Name"
            ])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output();

        if let Ok(output) = wmi_output {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let printers: Vec<String> = stdout
                    .lines()
                    .filter(|line| !line.trim().is_empty())
                    .map(|line| line.trim().to_string())
                    .collect();
                
                if !printers.is_empty() {
                    return Ok(printers);
                }
            }
        }

        // Method 2: Fallback - Try Get-Printer (Windows 8+)
        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Get-Printer | Select-Object -ExpandProperty Name"
            ])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output()
            .map_err(|e| format!("Failed to list printers: {}", e))?;

        if !output.status.success() {
            return Err("Failed to enumerate printers. Please ensure at least one printer is installed and accessible.".to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let printers: Vec<String> = stdout
            .lines()
            .filter(|line| !line.trim().is_empty())
            .map(|line| line.trim().to_string())
            .collect();
        
        if printers.is_empty() {
            Err("No printers found. Please install a printer driver first (File > Print > Add printer).".to_string())
        } else {
            Ok(printers)
        }
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        Err("Printer detection is not supported on this platform.".to_string())
    }
}

#[tauri::command]
pub fn silent_print(receipt_text: String, printer_name: Option<String>) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let temp_dir = std::env::temp_dir();
        let temp_file = temp_dir.join(format!(
            "receipt_{}.txt",
            Local::now().format("%Y%m%d%H%M%S%3f")
        ));
        fs::write(&temp_file, receipt_text.as_bytes())
            .map_err(|e| format!("Failed to write temp file: {}", e))?;

        let mut cmd = std::process::Command::new("lp");
        if let Some(ref name) = printer_name {
            if !name.is_empty() {
                cmd.args(["-d", name]);
            }
        }
        cmd.arg(&temp_file);

        let output = cmd.output().map_err(|e| {
            let _ = fs::remove_file(&temp_file);
            format!("Print failed: {}. Is CUPS installed?", e)
        })?;

        let _ = fs::remove_file(&temp_file);

        if !output.status.success() {
            return Err(format!(
                "Print failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        // Create a temporary file with the receipt content
        let temp_dir = std::env::temp_dir();
        let temp_file = temp_dir.join(format!(
            "receipt_{}.txt",
            Local::now().format("%Y%m%d%H%M%S%3f")
        ));
        
        fs::write(&temp_file, receipt_text.as_bytes())
            .map_err(|e| format!("Failed to write receipt file: {}", e))?;

        let file_path = temp_file.to_string_lossy().into_owned();
        let file_path_escaped = file_path.replace("'", "''");
        
        let result = if let Some(printer) = printer_name.filter(|p| !p.is_empty()) {
            // Use PowerShell to send file to specific printer
            let ps_cmd = format!(
                "Get-Content '{}' | Out-Printer -Name '{}'",
                file_path_escaped, 
                printer.replace("'", "''")
            );
            
            let output = Command::new("powershell")
                .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
                .creation_flags(0x08000000) // CREATE_NO_WINDOW
                .output();

            match output {
                Ok(out) if out.status.success() => Ok(()),
                _ => {
                    // Fallback: Use notepad print (most compatible)
                    let notepad_output = Command::new("notepad")
                        .args(["/p", &file_path])
                        .creation_flags(0x08000000)
                        .spawn();
                    
                    match notepad_output {
                        Ok(_) => Ok(()),
                        Err(e) => Err(format!("Failed to print to printer '{}': {}", printer, e))
                    }
                }
            }
        } else {
            // Print to default printer - use notepad which respects default printer
            let notepad_output = Command::new("notepad")
                .args(["/p", &file_path])
                .creation_flags(0x08000000)
                .spawn();

            match notepad_output {
                Ok(_) => Ok(()),
                Err(e) => Err(format!("Failed to print: {}", e))
            }
        };

        // Clean up temp file after a delay (notepad takes time to spool)
        let file_to_clean = temp_file.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_secs(5));
            let _ = std::fs::remove_file(&file_to_clean);
        });
        
        result
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        let _ = (receipt_text, printer_name);
        Err("Silent printing is not supported on this platform.".to_string())
    }
}

#[tauri::command]
pub fn reset_db(state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    
    // Wipe all tables in FK-safe order (children first).
    conn.execute_batch(
        "DELETE FROM purchase_invoice_items;
         DELETE FROM purchase_invoices;
         DELETE FROM sale_items;
         DELETE FROM sales;
         DELETE FROM suppliers;
         DELETE FROM products;
         DELETE FROM categories;
         DELETE FROM users;
         DELETE FROM settings;
         
         DELETE FROM sqlite_sequence;" // resets autoincrement IDs
    ).map_err(|e| e.to_string())?;

    // Re-insert default settings
    conn.execute(
        "INSERT INTO settings (id, shop_name, receipt_text, font_size_header, font_size_body, font_size_footer, currency) 
         VALUES (1, 'My Awesome Shop', 'Thank you for shopping with us!', 24, 14, 12, '$')",
        [],
    ).map_err(|e| e.to_string())?;

    // Re-insert default admin
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let default_hash = crate::db::hash_password("admin", "admin");
    conn.execute(
        "INSERT INTO users (username, password_hash, role, is_active, is_default_password, created_at) VALUES ('admin', ?1, 'admin', 1, 1, ?2)",
        rusqlite::params![default_hash, now],
    ).map_err(|e| e.to_string())?;

    Ok(())
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

// --- Kiosk ---

// ── Report commands ──

#[tauri::command]
pub fn get_sales_by_period(
    state: State<DbState>,
    start_date: Option<String>,
    end_date: Option<String>,
    group_by: String, // "day", "week", "month"
) -> Result<Vec<SalesByPeriod>, String> {
    let conn = state.0.lock().unwrap();

    let date_fmt = match group_by.as_str() {
        "week" => "strftime('%Y-W%W', date)",
        "month" => "strftime('%Y-%m', date)",
        _ => "date(date)", // day
    };

    let mut query = format!(
        "SELECT {fmt} as period, COALESCE(SUM(total), 0), COUNT(*), COALESCE(SUM(bill_discount_value + total_product_discount), 0)
         FROM sales",
        fmt = date_fmt
    );
    let mut params_vec: Vec<String> = Vec::new();

    if let (Some(s), Some(e)) = (&start_date, &end_date) {
        query.push_str(" WHERE date >= ? AND date <= ?");
        params_vec.push(format!("{} 00:00:00", s));
        params_vec.push(format!("{} 23:59:59", e));
    }

    query.push_str(&format!(" GROUP BY {fmt} ORDER BY period ASC", fmt = date_fmt));

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
        Ok(SalesByPeriod {
            period: row.get(0)?,
            total: row.get(1)?,
            count: row.get(2)?,
            discounts: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn get_payment_method_summary(
    state: State<DbState>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Vec<PaymentMethodSummary>, String> {
    let conn = state.0.lock().unwrap();
    let mut query = "SELECT payment_method, COALESCE(SUM(total), 0), COUNT(*) FROM sales".to_string();
    let mut params_vec: Vec<String> = Vec::new();

    if let (Some(s), Some(e)) = (&start_date, &end_date) {
        query.push_str(" WHERE date >= ? AND date <= ?");
        params_vec.push(format!("{} 00:00:00", s));
        params_vec.push(format!("{} 23:59:59", e));
    }
    query.push_str(" GROUP BY payment_method ORDER BY 2 DESC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
        Ok(PaymentMethodSummary {
            payment_method: row.get(0)?,
            total: row.get(1)?,
            count: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn get_top_products(
    state: State<DbState>,
    start_date: Option<String>,
    end_date: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<TopProduct>, String> {
    let conn = state.0.lock().unwrap();
    let lim = limit.unwrap_or(10);
    let mut query = "SELECT p.name, COALESCE(SUM(si.quantity), 0), COALESCE(SUM(si.subtotal), 0)
         FROM sale_items si
         JOIN products p ON si.product_id = p.id
         JOIN sales s ON si.sale_id = s.id".to_string();
    let mut params_vec: Vec<String> = Vec::new();

    if let (Some(s), Some(e)) = (&start_date, &end_date) {
        query.push_str(" WHERE s.date >= ? AND s.date <= ?");
        params_vec.push(format!("{} 00:00:00", s));
        params_vec.push(format!("{} 23:59:59", e));
    }
    query.push_str(&format!(" GROUP BY p.id ORDER BY 3 DESC LIMIT {}", lim));

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
        Ok(TopProduct {
            product_name: row.get(0)?,
            total_qty: row.get(1)?,
            total_revenue: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn get_category_sales(
    state: State<DbState>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Vec<CategorySales>, String> {
    let conn = state.0.lock().unwrap();
    let mut query = "SELECT COALESCE(c.name, 'Uncategorized'), COALESCE(SUM(si.subtotal), 0), COUNT(DISTINCT s.id)
         FROM sale_items si
         JOIN products p ON si.product_id = p.id
         JOIN sales s ON si.sale_id = s.id
         LEFT JOIN categories c ON p.category_id = c.id".to_string();
    let mut params_vec: Vec<String> = Vec::new();

    if let (Some(s), Some(e)) = (&start_date, &end_date) {
        query.push_str(" WHERE s.date >= ? AND s.date <= ?");
        params_vec.push(format!("{} 00:00:00", s));
        params_vec.push(format!("{} 23:59:59", e));
    }
    query.push_str(" GROUP BY COALESCE(c.name, 'Uncategorized') ORDER BY 2 DESC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
        Ok(CategorySales {
            category_name: row.get(0)?,
            total: row.get(1)?,
            count: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn get_hourly_sales(
    state: State<DbState>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Vec<HourlySales>, String> {
    let conn = state.0.lock().unwrap();
    let mut query = "SELECT CAST(strftime('%H', date) AS INTEGER), COALESCE(SUM(total), 0), COUNT(*)
         FROM sales".to_string();
    let mut params_vec: Vec<String> = Vec::new();

    if let (Some(s), Some(e)) = (&start_date, &end_date) {
        query.push_str(" WHERE date >= ? AND date <= ?");
        params_vec.push(format!("{} 00:00:00", s));
        params_vec.push(format!("{} 23:59:59", e));
    }
    query.push_str(" GROUP BY 1 ORDER BY 1 ASC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
        Ok(HourlySales {
            hour: row.get(0)?,
            total: row.get(1)?,
            count: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn get_stock_report(state: State<DbState>) -> Result<Vec<StockReport>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT p.name, p.stock, p.price, (p.stock * p.price), p.base_unit, COALESCE(c.name, 'Uncategorized'),
            CASE
                WHEN p.stock <= 0 THEN 'out_of_stock'
                WHEN p.stock < 10 THEN 'low_stock'
                ELSE 'in_stock'
            END
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         ORDER BY p.stock ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(StockReport {
            product_name: row.get(0)?,
            stock: row.get(1)?,
            price: row.get(2)?,
            value: row.get(3)?,
            base_unit: row.get(4)?,
            category_name: row.get(5)?,
            status: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn get_expiry_report(state: State<DbState>) -> Result<Vec<ExpiryReport>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT p.name, p.stock, p.expiry_date,
            CAST(julianday(p.expiry_date) - julianday('now') AS INTEGER),
            CASE
                WHEN julianday(p.expiry_date) < julianday('now') THEN 'expired'
                WHEN julianday(p.expiry_date) <= julianday('now', '+7 days') THEN 'critical'
                WHEN julianday(p.expiry_date) <= julianday('now', '+30 days') THEN 'warning'
                ELSE 'good'
            END
         FROM products p
         WHERE p.expiry_date IS NOT NULL AND p.expiry_date != ''
         ORDER BY p.expiry_date ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(ExpiryReport {
            product_name: row.get(0)?,
            stock: row.get(1)?,
            expiry_date: row.get(2)?,
            days_left: row.get(3)?,
            status: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn get_category_stock_value(state: State<DbState>) -> Result<Vec<CategoryStockValue>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT COALESCE(c.name, 'Uncategorized'), COUNT(*), COALESCE(SUM(p.stock * p.price), 0)
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         GROUP BY COALESCE(c.name, 'Uncategorized')
         ORDER BY 3 DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(CategoryStockValue {
            category_name: row.get(0)?,
            product_count: row.get(1)?,
            total_value: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

// --- Kiosk (original) ---

#[tauri::command]
pub fn verify_kiosk_pin(state: State<DbState>, pin: String) -> Result<bool, String> {
    let conn = state.0.lock().unwrap();
    let stored_pin: Option<String> = conn.query_row(
        "SELECT kiosk_pin FROM settings WHERE id = 1",
        [],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    match stored_pin {
        Some(p) => Ok(p == pin),
        None => Ok(false),
    }
}

// ── Supplier Management ──

#[tauri::command]
pub fn get_suppliers(state: State<DbState>) -> Result<Vec<SupplierWithStats>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT s.id, s.name, s.company_name, s.contact_person, s.phone, s.email, s.address, s.tax_number, s.notes, s.created_at,
            COALESCE((SELECT SUM(pi.grand_total) FROM purchase_invoices pi WHERE pi.supplier_id = s.id), 0),
            COALESCE((SELECT SUM(pi.grand_total) FROM purchase_invoices pi WHERE pi.supplier_id = s.id AND pi.payment_status != 'paid'), 0)
         FROM suppliers s
         ORDER BY s.name ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(SupplierWithStats {
            id: row.get(0)?,
            name: row.get(1)?,
            company_name: row.get(2)?,
            contact_person: row.get(3)?,
            phone: row.get(4)?,
            email: row.get(5)?,
            address: row.get(6)?,
            tax_number: row.get(7)?,
            notes: row.get(8)?,
            created_at: row.get(9)?,
            total_purchases: row.get(10)?,
            outstanding_balance: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn add_supplier(
    state: State<DbState>,
    name: String,
    company_name: Option<String>,
    contact_person: String,
    phone: String,
    email: Option<String>,
    address: Option<String>,
    tax_number: Option<String>,
    notes: Option<String>,
) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO suppliers (name, company_name, contact_person, phone, email, address, tax_number, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![name, company_name, contact_person, phone, email, address, tax_number, notes, now],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn update_supplier(
    state: State<DbState>,
    id: i64,
    name: String,
    company_name: Option<String>,
    contact_person: String,
    phone: String,
    email: Option<String>,
    address: Option<String>,
    tax_number: Option<String>,
    notes: Option<String>,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "UPDATE suppliers SET name=?1, company_name=?2, contact_person=?3, phone=?4, email=?5, address=?6, tax_number=?7, notes=?8 WHERE id=?9",
        params![name, company_name, contact_person, phone, email, address, tax_number, notes, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_supplier(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    // Check if supplier has invoices
    let inv_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM purchase_invoices WHERE supplier_id = ?",
        params![id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    if inv_count > 0 {
        return Err("Cannot delete supplier with existing purchase invoices.".to_string());
    }
    conn.execute("DELETE FROM suppliers WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ── Purchase Invoices ──

#[tauri::command]
pub fn create_purchase_invoice(
    state: State<DbState>,
    supplier_id: i64,
    date: String,
    subtotal: f64,
    discount: f64,
    tax: f64,
    grand_total: f64,
    payment_status: String,
    notes: Option<String>,
    items: Vec<PurchaseInvoiceItem>,
) -> Result<i64, String> {
    let mut conn = state.0.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    // Auto-generate invoice number: PUR-XXXXX
    let count: i64 = tx.query_row("SELECT COUNT(*) FROM purchase_invoices", [], |row| row.get(0)).unwrap_or(0);
    let invoice_number = format!("PUR-{:05}", count + 1);

    tx.execute(
        "INSERT INTO purchase_invoices (invoice_number, supplier_id, date, subtotal, discount, tax, grand_total, payment_status, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![invoice_number, supplier_id, date, subtotal, discount, tax, grand_total, payment_status, notes, now],
    ).map_err(|e| e.to_string())?;

    let invoice_id = tx.last_insert_rowid();

    for item in &items {
        tx.execute(
            "INSERT INTO purchase_invoice_items (invoice_id, product_id, quantity, purchase_price, discount, tax, subtotal) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![invoice_id, item.product_id, item.quantity, item.purchase_price, item.discount, item.tax, item.subtotal],
        ).map_err(|e| e.to_string())?;

        // Automatically increase product stock
        tx.execute(
            "UPDATE products SET stock = stock + ? WHERE id = ?",
            params![item.quantity, item.product_id],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(invoice_id)
}

#[tauri::command]
pub fn get_purchase_invoices(
    state: State<DbState>,
    supplier_id: Option<i64>,
    start_date: Option<String>,
    end_date: Option<String>,
    payment_status: Option<String>,
) -> Result<Vec<PurchaseInvoiceSummary>, String> {
    let conn = state.0.lock().unwrap();
    let mut query = "SELECT pi.id, pi.invoice_number, s.name, pi.date, pi.grand_total, pi.payment_status
         FROM purchase_invoices pi
         JOIN suppliers s ON pi.supplier_id = s.id
         WHERE 1=1".to_string();
    let mut params_vec: Vec<String> = Vec::new();

    if let Some(sid) = supplier_id {
        query.push_str(&format!(" AND pi.supplier_id = {}", sid));
    }
    if let (Some(s), Some(e)) = (&start_date, &end_date) {
        query.push_str(" AND pi.date >= ? AND pi.date <= ?");
        params_vec.push(format!("{} 00:00:00", s));
        params_vec.push(format!("{} 23:59:59", e));
    }
    if let Some(ps) = &payment_status {
        if !ps.is_empty() {
            query.push_str(&format!(" AND pi.payment_status = '{}'", ps.replace('\'', "''")));
        }
    }
    query.push_str(" ORDER BY pi.id DESC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
        Ok(PurchaseInvoiceSummary {
            id: row.get(0)?,
            invoice_number: row.get(1)?,
            supplier_name: row.get(2)?,
            date: row.get(3)?,
            grand_total: row.get(4)?,
            payment_status: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn get_purchase_invoice_details(state: State<DbState>, invoice_id: i64) -> Result<PurchaseInvoiceWithItems, String> {
    let conn = state.0.lock().unwrap();

    let (invoice, supplier_name) = conn.query_row(
        "SELECT pi.id, pi.invoice_number, pi.supplier_id, pi.date, pi.subtotal, pi.discount, pi.tax, pi.grand_total, pi.payment_status, pi.notes, pi.created_at, s.name
         FROM purchase_invoices pi
         JOIN suppliers s ON pi.supplier_id = s.id
         WHERE pi.id = ?",
        params![invoice_id],
        |row| {
            Ok((PurchaseInvoice {
                id: Some(row.get(0)?),
                invoice_number: row.get(1)?,
                supplier_id: row.get(2)?,
                date: row.get(3)?,
                subtotal: row.get(4)?,
                discount: row.get(5)?,
                tax: row.get(6)?,
                grand_total: row.get(7)?,
                payment_status: row.get(8)?,
                notes: row.get(9)?,
                created_at: row.get(10)?,
            }, row.get::<_, String>(11)?))
        }
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT p.name, pii.quantity, pii.purchase_price, pii.discount, pii.tax, pii.subtotal
         FROM purchase_invoice_items pii
         JOIN products p ON pii.product_id = p.id
         WHERE pii.invoice_id = ?"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map(params![invoice_id], |row| {
        Ok(PurchaseInvoiceItemDetailed {
            product_name: row.get(0)?,
            quantity: row.get(1)?,
            purchase_price: row.get(2)?,
            discount: row.get(3)?,
            tax: row.get(4)?,
            subtotal: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(PurchaseInvoiceWithItems { invoice, items, supplier_name })
}

#[tauri::command]
pub fn update_purchase_invoice_status(
    state: State<DbState>,
    invoice_id: i64,
    payment_status: String,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "UPDATE purchase_invoices SET payment_status = ? WHERE id = ?",
        params![payment_status, invoice_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ── Revenue / Profit report commands ──

#[tauri::command]
pub fn get_revenue_summary(
    state: State<DbState>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<RevenueSummary, String> {
    let conn = state.0.lock().unwrap();

    // Sales totals
    let mut sales_q = "SELECT COALESCE(SUM(total), 0), COALESCE(SUM(bill_discount_value + total_product_discount), 0), COUNT(*) FROM sales".to_string();
    let mut pv: Vec<String> = Vec::new();
    if let (Some(s), Some(e)) = (&start_date, &end_date) {
        sales_q.push_str(" WHERE date >= ? AND date <= ?");
        pv.push(format!("{} 00:00:00", s));
        pv.push(format!("{} 23:59:59", e));
    }
    let (total_sales, total_discounts, sale_count): (f64, f64, i64) = conn.query_row(
        &sales_q, rusqlite::params_from_iter(pv.iter()), |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    ).map_err(|e| e.to_string())?;

    // COGS: average purchase price * quantity sold for items in period
    let mut cogs_q = "SELECT COALESCE(SUM(si.quantity * COALESCE(
        (SELECT AVG(pii.purchase_price) FROM purchase_invoice_items pii WHERE pii.product_id = si.product_id), 0
    )), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id".to_string();
    let mut pv2: Vec<String> = Vec::new();
    if let (Some(s), Some(e)) = (&start_date, &end_date) {
        cogs_q.push_str(" WHERE s.date >= ? AND s.date <= ?");
        pv2.push(format!("{} 00:00:00", s));
        pv2.push(format!("{} 23:59:59", e));
    }
    let total_cogs: f64 = conn.query_row(
        &cogs_q, rusqlite::params_from_iter(pv2.iter()), |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    // Total purchase expenses in period
    let mut exp_q = "SELECT COALESCE(SUM(grand_total), 0), COUNT(*) FROM purchase_invoices".to_string();
    let mut pv3: Vec<String> = Vec::new();
    if let (Some(s), Some(e)) = (&start_date, &end_date) {
        exp_q.push_str(" WHERE date >= ? AND date <= ?");
        pv3.push(s.clone());
        pv3.push(e.clone());
    }
    let (total_expenses, purchase_count): (f64, i64) = conn.query_row(
        &exp_q, rusqlite::params_from_iter(pv3.iter()), |row| Ok((row.get(0)?, row.get(1)?))
    ).map_err(|e| e.to_string())?;

    let gross_profit = total_sales - total_cogs;
    let net_profit = total_sales - total_cogs - total_discounts;
    let profit_margin = if total_sales > 0.0 { (net_profit / total_sales) * 100.0 } else { 0.0 };

    Ok(RevenueSummary {
        total_sales,
        total_cogs,
        total_discounts,
        total_expenses,
        gross_profit,
        net_profit,
        profit_margin,
        sale_count,
        purchase_count,
    })
}

#[tauri::command]
pub fn get_revenue_by_period(
    state: State<DbState>,
    start_date: Option<String>,
    end_date: Option<String>,
    group_by: String,
) -> Result<Vec<RevenueByPeriod>, String> {
    let conn = state.0.lock().unwrap();

    let date_fmt = match group_by.as_str() {
        "week" => "strftime('%Y-W%W', date)",
        "month" => "strftime('%Y-%m', date)",
        _ => "date(date)",
    };

    // Sales data by period
    let mut sales_q = format!(
        "SELECT {fmt} as period, COALESCE(SUM(total), 0), COALESCE(SUM(bill_discount_value + total_product_discount), 0), COUNT(*)
         FROM sales", fmt = date_fmt
    );
    let mut pv: Vec<String> = Vec::new();
    if let (Some(s), Some(e)) = (&start_date, &end_date) {
        sales_q.push_str(" WHERE date >= ? AND date <= ?");
        pv.push(format!("{} 00:00:00", s));
        pv.push(format!("{} 23:59:59", e));
    }
    sales_q.push_str(&format!(" GROUP BY {fmt} ORDER BY period ASC", fmt = date_fmt));

    let mut stmt = conn.prepare(&sales_q).map_err(|e| e.to_string())?;
    let sales_rows: Vec<(String, f64, f64, i64)> = stmt.query_map(
        rusqlite::params_from_iter(pv.iter()), |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
    ).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    // Purchase expenses by period
    let pur_date_fmt = match group_by.as_str() {
        "week" => "strftime('%Y-W%W', date)",
        "month" => "strftime('%Y-%m', date)",
        _ => "date(date)",
    };
    let mut pur_q = format!(
        "SELECT {fmt} as period, COALESCE(SUM(grand_total), 0), COALESCE(SUM(tax), 0)
         FROM purchase_invoices", fmt = pur_date_fmt
    );
    let mut pv2: Vec<String> = Vec::new();
    if let (Some(s), Some(e)) = (&start_date, &end_date) {
        pur_q.push_str(" WHERE date >= ? AND date <= ?");
        pv2.push(s.clone());
        pv2.push(e.clone());
    }
    pur_q.push_str(&format!(" GROUP BY {fmt}", fmt = pur_date_fmt));

    let mut stmt2 = conn.prepare(&pur_q).map_err(|e| e.to_string())?;
    let pur_rows: Vec<(String, f64, f64)> = stmt2.query_map(
        rusqlite::params_from_iter(pv2.iter()), |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    ).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    // Merge by period
    let mut result: Vec<RevenueByPeriod> = Vec::new();
    for (period, total_sales, total_discounts, sale_count) in &sales_rows {
        let (cogs, ptax) = pur_rows.iter()
            .find(|(p, _, _)| p == period)
            .map(|(_, c, t)| (*c, *t))
            .unwrap_or((0.0, 0.0));
        result.push(RevenueByPeriod {
            period: period.clone(),
            total_sales: *total_sales,
            total_cogs: cogs,
            total_discounts: *total_discounts,
            total_purchase_tax: ptax,
            net_profit: *total_sales - cogs - *total_discounts,
            sale_count: *sale_count,
        });
    }
    // Add periods that only have purchases
    for (period, cogs, ptax) in &pur_rows {
        if !result.iter().any(|r| &r.period == period) {
            result.push(RevenueByPeriod {
                period: period.clone(),
                total_sales: 0.0,
                total_cogs: *cogs,
                total_discounts: 0.0,
                total_purchase_tax: *ptax,
                net_profit: -*cogs,
                sale_count: 0,
            });
        }
    }
    result.sort_by(|a, b| a.period.cmp(&b.period));
    Ok(result)
}

#[tauri::command]
pub fn get_product_profit(
    state: State<DbState>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Vec<ProductProfit>, String> {
    let conn = state.0.lock().unwrap();
    let mut query = "SELECT p.name, COALESCE(c.name, 'Uncategorized'),
        COALESCE(SUM(si.quantity), 0),
        COALESCE(SUM(si.subtotal), 0),
        COALESCE(SUM(si.quantity * COALESCE(
            (SELECT AVG(pii.purchase_price) FROM purchase_invoice_items pii WHERE pii.product_id = si.product_id), 0
        )), 0)
     FROM sale_items si
     JOIN products p ON si.product_id = p.id
     JOIN sales s ON si.sale_id = s.id
     LEFT JOIN categories c ON p.category_id = c.id".to_string();
    let mut pv: Vec<String> = Vec::new();
    if let (Some(s), Some(e)) = (&start_date, &end_date) {
        query.push_str(" WHERE s.date >= ? AND s.date <= ?");
        pv.push(format!("{} 00:00:00", s));
        pv.push(format!("{} 23:59:59", e));
    }
    query.push_str(" GROUP BY p.id ORDER BY 4 DESC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params_from_iter(pv.iter()), |row| {
        let revenue: f64 = row.get(3)?;
        let cost: f64 = row.get(4)?;
        Ok(ProductProfit {
            product_name: row.get(0)?,
            category_name: row.get(1)?,
            qty_sold: row.get(2)?,
            selling_revenue: revenue,
            purchase_cost: cost,
            profit: revenue - cost,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn get_category_profit(
    state: State<DbState>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Vec<CategoryProfit>, String> {
    let conn = state.0.lock().unwrap();
    let mut query = "SELECT COALESCE(c.name, 'Uncategorized'),
        COALESCE(SUM(si.subtotal), 0),
        COALESCE(SUM(si.quantity * COALESCE(
            (SELECT AVG(pii.purchase_price) FROM purchase_invoice_items pii WHERE pii.product_id = si.product_id), 0
        )), 0),
        COUNT(DISTINCT p.id)
     FROM sale_items si
     JOIN products p ON si.product_id = p.id
     JOIN sales s ON si.sale_id = s.id
     LEFT JOIN categories c ON p.category_id = c.id".to_string();
    let mut pv: Vec<String> = Vec::new();
    if let (Some(s), Some(e)) = (&start_date, &end_date) {
        query.push_str(" WHERE s.date >= ? AND s.date <= ?");
        pv.push(format!("{} 00:00:00", s));
        pv.push(format!("{} 23:59:59", e));
    }
    query.push_str(" GROUP BY COALESCE(c.name, 'Uncategorized') ORDER BY 2 DESC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params_from_iter(pv.iter()), |row| {
        let sales: f64 = row.get(1)?;
        let cost: f64 = row.get(2)?;
        Ok(CategoryProfit {
            category_name: row.get(0)?,
            total_sales: sales,
            total_cost: cost,
            profit: sales - cost,
            product_count: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}
