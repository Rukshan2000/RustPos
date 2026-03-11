mod db;
mod models;
mod commands;

use std::sync::Mutex;
use tauri::Manager;
use crate::db::{init_db, DbState};
use crate::commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let conn = init_db(app.handle()).expect("failed to initialize database");
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_products,
            add_product,
            bulk_add_products,
            update_product,
            delete_product,
            get_categories,
            add_category,
            delete_category,
            generate_barcode,
            check_barcode_unique,
            complete_sale,
            get_sales_history,
            get_sale_details,
            get_settings,
            update_settings,
            get_dashboard_stats,
            backup_db,
            restore_db,
            get_daily_sales,
            login,
            change_password,
            get_users,
            add_user,
            update_user,
            delete_user,
            reset_user_password,
            get_expiring_products,
            reset_db,
            verify_kiosk_pin,
            get_sales_by_period,
            get_payment_method_summary,
            get_top_products,
            get_category_sales,
            get_hourly_sales,
            get_stock_report,
            get_expiry_report,
            get_category_stock_value,
            get_suppliers,
            add_supplier,
            update_supplier,
            delete_supplier,
            create_purchase_invoice,
            get_purchase_invoices,
            get_purchase_invoice_details,
            update_purchase_invoice_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
