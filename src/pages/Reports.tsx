import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Download, Calendar, BarChart3, Package, DollarSign,
  AlertTriangle, FileText, Printer, ChevronDown
} from 'lucide-react';
import {
  api, Sale,
  SalesByPeriod, PaymentMethodSummary, TopProduct, CategorySales, HourlySales,
  StockReport, ExpiryReport, CategoryStockValue,
  RevenueSummary, RevenueByPeriod, ProductProfit, CategoryProfit
} from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';

type TabKey = 'sales' | 'inventory' | 'financial' | 'revenue';

const COLORS = ['#2d5a3d', '#4a8f6a', '#7bc4a0', '#b8e0cc', '#c05050', '#e8a87c', '#d4a574', '#89b0ae', '#6a8d92', '#b5c7a3'];

const Reports: React.FC = () => {
  const { currency } = useSettings();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState('day');

  // Sales data
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesByPeriod, setSalesByPeriod] = useState<SalesByPeriod[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentMethodSummary[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [hourlySales, setHourlySales] = useState<HourlySales[]>([]);

  // Inventory data
  const [stockReport, setStockReport] = useState<StockReport[]>([]);
  const [expiryReport, setExpiryReport] = useState<ExpiryReport[]>([]);
  const [categoryStockValue, setCategoryStockValue] = useState<CategoryStockValue[]>([]);

  // Revenue data
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [revenueByPeriod, setRevenueByPeriod] = useState<RevenueByPeriod[]>([]);
  const [productProfit, setProductProfit] = useState<ProductProfit[]>([]);
  const [categoryProfit, setCategoryProfit] = useState<CategoryProfit[]>([]);

  const loadSalesData = useCallback(async () => {
    try {
      const sd = startDate || undefined;
      const ed = endDate || undefined;
      const [s, sbp, ps, tp, cs, hs] = await Promise.all([
        api.getSalesHistory(sd, ed),
        api.getSalesByPeriod(sd, ed, groupBy),
        api.getPaymentMethodSummary(sd, ed),
        api.getTopProducts(sd, ed, 10),
        api.getCategorySales(sd, ed),
        api.getHourlySales(sd, ed),
      ]);
      setSales(s);
      setSalesByPeriod(sbp);
      setPaymentSummary(ps);
      setTopProducts(tp);
      setCategorySales(cs);
      setHourlySales(hs);
    } catch (e) { console.error(e); }
  }, [startDate, endDate, groupBy]);

  const loadInventoryData = useCallback(async () => {
    try {
      const [sr, er, csv] = await Promise.all([
        api.getStockReport(),
        api.getExpiryReport(),
        api.getCategoryStockValue(),
      ]);
      setStockReport(sr);
      setExpiryReport(er);
      setCategoryStockValue(csv);
    } catch (e) { console.error(e); }
  }, []);

  const loadRevenueData = useCallback(async () => {
    try {
      const sd = startDate || undefined;
      const ed = endDate || undefined;
      const [rs, rbp, pp, cp] = await Promise.all([
        api.getRevenueSummary(sd, ed),
        api.getRevenueByPeriod(sd, ed, groupBy),
        api.getProductProfit(sd, ed),
        api.getCategoryProfit(sd, ed),
      ]);
      setRevenueSummary(rs);
      setRevenueByPeriod(rbp);
      setProductProfit(pp);
      setCategoryProfit(cp);
    } catch (e) { console.error(e); }
  }, [startDate, endDate, groupBy]);

  useEffect(() => {
    if (activeTab === 'sales' || activeTab === 'financial') loadSalesData();
    if (activeTab === 'inventory') loadInventoryData();
    if (activeTab === 'revenue') loadRevenueData();
  }, [activeTab, loadSalesData, loadInventoryData, loadRevenueData]);

  // Computed stats
  const totalRevenue = sales.reduce((a, s) => a + s.total, 0);
  const totalDiscount = sales.reduce((a, s) => a + s.bill_discount_value + s.total_product_discount, 0);
  const avgTransaction = sales.length ? totalRevenue / sales.length : 0;
  const totalStockValue = stockReport.reduce((a, s) => a + s.value, 0);
  const lowStockCount = stockReport.filter(s => s.status === 'low_stock').length;
  const outOfStockCount = stockReport.filter(s => s.status === 'out_of_stock').length;

  // Export helpers
  const exportCSV = async (headers: string[], rows: string[][], filename: string) => {
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const filePath = await save({ defaultPath: filename, filters: [{ name: 'CSV', extensions: ['csv'] }] });
    if (filePath) await writeTextFile(filePath, csvContent);
  };

  const exportPDF = async (title: string, headers: string[], rows: string[][]) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(9);
    doc.text(`${t('date_filter')}: ${startDate || t('all')} ${t('to')} ${endDate || t('all')}`, 14, 28);
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 34,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [45, 90, 61] },
    });
    const pdfBytes = doc.output('arraybuffer');
    const filePath = await save({ defaultPath: `${title.replace(/\s+/g, '_')}.pdf`, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (filePath) await writeFile(filePath, new Uint8Array(pdfBytes));
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    if (activeTab === 'sales') {
      const headers = [t('invoice'), t('date_filter'), t('total'), t('payment'), t('discount')];
      const rows = sales.map(s => [
        s.invoice_number, s.date, s.total.toFixed(2), s.payment_method,
        (s.bill_discount_value + s.total_product_discount).toFixed(2)
      ]);
      if (format === 'csv') exportCSV(headers, rows, `sales_report_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
      else exportPDF(t('rpt_sales_report'), headers, rows);
    } else if (activeTab === 'inventory') {
      const headers = [t('product_header'), t('category'), t('stock'), t('unit_price'), t('asset_value'), t('rpt_status')];
      const rows = stockReport.map(s => [
        s.product_name, s.category_name, s.stock.toString(), s.price.toFixed(2),
        s.value.toFixed(2), t(`rpt_${s.status}`)
      ]);
      if (format === 'csv') exportCSV(headers, rows, 'inventory_report.csv');
      else exportPDF(t('rpt_inventory_report'), headers, rows);
    } else if (activeTab === 'revenue') {
      const headers = [t('product_header'), t('category'), t('quantity'), t('rev_revenue'), t('rev_cogs'), t('rev_profit')];
      const rows = productProfit.map(p => [
        p.product_name, p.category_name, p.qty_sold.toString(), p.selling_revenue.toFixed(2),
        p.purchase_cost.toFixed(2), p.profit.toFixed(2)
      ]);
      if (format === 'csv') exportCSV(headers, rows, `revenue_report_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
      else exportPDF(t('rev_revenue_report'), headers, rows);
    } else {
      const headers = [t('rpt_period'), t('total_revenue'), t('total_discounts'), t('rpt_net_revenue'), t('transactions')];
      const rows = salesByPeriod.map(s => [
        s.period, s.total.toFixed(2), s.discounts.toFixed(2),
        (s.total - s.discounts).toFixed(2), s.count.toString()
      ]);
      if (format === 'csv') exportCSV(headers, rows, `financial_report_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
      else exportPDF(t('rpt_financial_report'), headers, rows);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatHour = (h: number) => {
    if (h === 0) return '12AM';
    if (h < 12) return `${h}AM`;
    if (h === 12) return '12PM';
    return `${h - 12}PM`;
  };

  const tabs: { key: TabKey; icon: React.ReactNode; label: string }[] = [
    { key: 'sales', icon: <BarChart3 size={16} />, label: t('rpt_sales') },
    { key: 'inventory', icon: <Package size={16} />, label: t('inventory') },
    { key: 'financial', icon: <DollarSign size={16} />, label: t('rpt_financial') },
    { key: 'revenue', icon: <TrendingUp size={16} />, label: t('rev_revenue') },
  ];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: '#f5f0e8', border: '1.5px solid #ddd8cc', borderRadius: 10,
        padding: '8px 14px', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{ fontWeight: 700, color: '#1a3528', marginBottom: 4 }}>{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ color: p.color, fontWeight: 600 }}>
            {p.name}: {typeof p.value === 'number' ? `${currency}${p.value.toFixed(2)}` : p.value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <style>{`
        .rp-root { font-family: 'Nunito', sans-serif; animation: fadeIn 0.25s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .rp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
        .rp-title { font-size: 1.85rem; font-weight: 800; color: #1a3528; letter-spacing: -0.02em; margin: 0 0 0.2rem; }
        .rp-subtitle { color: #7a9e8a; font-size: 0.875rem; font-weight: 500; margin: 0; }
        .rp-header-actions { display: flex; align-items: center; gap: 0.5rem; }
        .rp-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1rem; border: none; border-radius: 0.7rem;
          font-family: 'Nunito', sans-serif; font-size: 0.82rem; font-weight: 700; cursor: pointer;
          transition: background 0.12s, transform 0.1s; }
        .rp-btn:hover { transform: translateY(-1px); }
        .rp-btn-primary { background: #2d5a3d; color: #e8f4ec; box-shadow: 0 3px 10px rgba(45,90,61,0.25); }
        .rp-btn-primary:hover { background: #245033; }
        .rp-btn-secondary { background: #edeae0; color: #1a3528; border: 1.5px solid #ddd8cc; }
        .rp-btn-secondary:hover { background: #e4e0d4; }

        /* Tabs */
        .rp-tabs { display: flex; gap: 0.35rem; margin-bottom: 1.25rem; background: #edeae0; border-radius: 0.85rem; padding: 0.3rem; }
        .rp-tab { display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1.2rem; border: none; border-radius: 0.65rem;
          font-family: 'Nunito', sans-serif; font-size: 0.85rem; font-weight: 700; color: #7a9e8a;
          background: transparent; cursor: pointer; transition: all 0.15s; }
        .rp-tab:hover { color: #1a3528; background: rgba(45,90,61,0.06); }
        .rp-tab-active { background: #f5f0e8; color: #1a3528; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }

        /* Filters bar */
        .rp-filters { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .rp-filter-group { display: flex; align-items: center; gap: 0.4rem; }
        .rp-filter-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #7a9e8a; }
        .rp-input { padding: 0.55rem 0.7rem; background: #edeae0; border: 1.5px solid #ddd8cc; border-radius: 0.6rem;
          font-family: 'Nunito', sans-serif; font-size: 0.82rem; color: #1a3528; outline: none; transition: border-color 0.12s; cursor: pointer; }
        .rp-input:focus { border-color: #2d5a3d; }
        .rp-select { appearance: none; padding-right: 2rem; background-image: none; }

        /* Stats grid */
        .rp-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .rp-stat-card { background: #f5f0e8; border: 1.5px solid #ddd8cc; border-radius: 1rem; padding: 1.1rem 1.25rem; border-left-width: 4px; }
        .rp-stat-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #7a9e8a; margin-bottom: 0.35rem; }
        .rp-stat-value { font-size: 1.65rem; font-weight: 800; color: #1a3528; line-height: 1; }
        .rp-stat-green { color: #2d5a3d; }
        .rp-stat-red { color: #c05050; }
        .rp-stat-orange { color: #d4a030; }

        /* Chart cards */
        .rp-charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.5rem; }
        .rp-chart-card { background: #f5f0e8; border: 1.5px solid #ddd8cc; border-radius: 1rem; padding: 1.25rem; }
        .rp-chart-full { grid-column: 1 / -1; }
        .rp-chart-title { font-size: 0.88rem; font-weight: 800; color: #1a3528; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.45rem; }

        /* Table card */
        .rp-table-card { background: #f5f0e8; border: 1.5px solid #ddd8cc; border-radius: 1rem; overflow: hidden; margin-bottom: 1.5rem; }
        .rp-table-header { padding: 1rem 1.25rem; border-bottom: 1.5px solid #ddd8cc; background: #edeae0;
          display: flex; align-items: center; gap: 0.6rem; font-size: 0.92rem; font-weight: 800; color: #1a3528; }
        .rp-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        .rp-table thead tr { background: #edeae0; border-bottom: 1.5px solid #ddd8cc; }
        .rp-table th { padding: 0.65rem 1rem; text-align: left; font-size: 0.68rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.07em; color: #7a9e8a; }
        .rp-table tbody tr { border-bottom: 1px solid #e8e4d8; transition: background 0.1s; }
        .rp-table tbody tr:last-child { border-bottom: none; }
        .rp-table tbody tr:hover { background: #edeae0; }
        .rp-table td { padding: 0.7rem 1rem; vertical-align: middle; color: #1a3528; }
        .rp-product-name { font-weight: 700; }
        .rp-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 0.4rem; font-size: 0.7rem; font-weight: 700; }
        .rp-badge-green { background: #d4edda; color: #155724; }
        .rp-badge-yellow { background: #fff3cd; color: #856404; }
        .rp-badge-red { background: #f8d7da; color: #721c24; }
        .rp-badge-orange { background: #ffe0b2; color: #8a5a00; }
        .rp-empty { text-align: center; padding: 3rem 1rem; color: #7a9e8a; font-weight: 600; }

        @media print {
          .rp-header-actions, .rp-tabs, .rp-filters { display: none !important; }
        }
      `}</style>

      <div className="rp-root">
        {/* Header */}
        <div className="rp-header">
          <div>
            <h1 className="rp-title">{t('reports')}</h1>
            <p className="rp-subtitle">{t('rpt_subtitle')}</p>
          </div>
          <div className="rp-header-actions">
            <button className="rp-btn rp-btn-secondary" onClick={handlePrint}>
              <Printer size={15} /> {t('print')}
            </button>
            <button className="rp-btn rp-btn-secondary" onClick={() => handleExport('csv')}>
              <Download size={15} /> CSV
            </button>
            <button className="rp-btn rp-btn-primary" onClick={() => handleExport('pdf')}>
              <FileText size={15} /> PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="rp-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`rp-tab ${activeTab === tab.key ? 'rp-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="rp-filters">
          <div className="rp-filter-group">
            <Calendar size={14} color="#7a9e8a" />
            <span className="rp-filter-label">{t('date_filter')}:</span>
            <input type="date" className="rp-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span style={{ color: '#b0a898', fontWeight: 600, fontSize: '0.8rem' }}>{t('to')}</span>
            <input type="date" className="rp-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          {(activeTab === 'sales' || activeTab === 'financial' || activeTab === 'revenue') && (
            <div className="rp-filter-group">
              <span className="rp-filter-label">{t('rpt_group_by')}:</span>
              <select className="rp-input rp-select" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
                <option value="day">{t('rpt_daily')}</option>
                <option value="week">{t('rpt_weekly')}</option>
                <option value="month">{t('rpt_monthly')}</option>
              </select>
              <ChevronDown size={14} color="#7a9e8a" style={{ marginLeft: -28, pointerEvents: 'none' }} />
            </div>
          )}
        </div>

        {/* ═══════ SALES TAB ═══════ */}
        {activeTab === 'sales' && (
          <>
            {/* Stats */}
            <div className="rp-stats-grid">
              <div className="rp-stat-card" style={{ borderLeftColor: '#2d5a3d' }}>
                <div className="rp-stat-label">{t('total_revenue')}</div>
                <div className="rp-stat-value rp-stat-green">{currency}{totalRevenue.toFixed(2)}</div>
              </div>
              <div className="rp-stat-card" style={{ borderLeftColor: '#c05050' }}>
                <div className="rp-stat-label">{t('total_discounts')}</div>
                <div className="rp-stat-value rp-stat-red">{currency}{totalDiscount.toFixed(2)}</div>
              </div>
              <div className="rp-stat-card" style={{ borderLeftColor: '#4a8f6a' }}>
                <div className="rp-stat-label">{t('rpt_avg_transaction')}</div>
                <div className="rp-stat-value rp-stat-green">{currency}{avgTransaction.toFixed(2)}</div>
              </div>
              <div className="rp-stat-card" style={{ borderLeftColor: '#ddd8cc' }}>
                <div className="rp-stat-label">{t('transactions')}</div>
                <div className="rp-stat-value">{sales.length}</div>
              </div>
            </div>

            {/* Sales Over Time + Payment Breakdown */}
            <div className="rp-charts-grid">
              <div className="rp-chart-card rp-chart-full">
                <div className="rp-chart-title"><TrendingUp size={16} color="#2d5a3d" /> {t('rpt_sales_over_time')}</div>
                {salesByPeriod.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={salesByPeriod} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ddd8cc" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#7a9e8a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#7a9e8a' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" name={t('total_revenue')} fill="#2d5a3d" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="rp-empty">{t('rpt_no_data')}</div>}
              </div>

              <div className="rp-chart-card">
                <div className="rp-chart-title"><DollarSign size={16} color="#2d5a3d" /> {t('rpt_payment_breakdown')}</div>
                {paymentSummary.length ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={paymentSummary}
                        dataKey="total"
                        nameKey="payment_method"
                        cx="50%" cy="50%"
                        outerRadius={90}
                        label={(props: any) => `${props.payment_method} ${((props.percent || 0) * 100).toFixed(0)}%`}
                        labelLine={true}
                      >
                        {paymentSummary.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="rp-empty">{t('rpt_no_data')}</div>}
              </div>

              <div className="rp-chart-card">
                <div className="rp-chart-title"><BarChart3 size={16} color="#2d5a3d" /> {t('rpt_hourly_distribution')}</div>
                {hourlySales.length ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={hourlySales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ddd8cc" />
                      <XAxis dataKey="hour" tickFormatter={formatHour} tick={{ fontSize: 10, fill: '#7a9e8a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#7a9e8a' }} />
                      <Tooltip content={<CustomTooltip />} labelFormatter={(v: any) => formatHour(Number(v))} />
                      <Bar dataKey="total" name={t('total_revenue')} fill="#4a8f6a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="rp-empty">{t('rpt_no_data')}</div>}
              </div>
            </div>

            {/* Top Products + Category Sales tables */}
            <div className="rp-charts-grid">
              <div className="rp-table-card">
                <div className="rp-table-header">
                  <TrendingUp size={16} color="#2d5a3d" /> {t('rpt_top_products')}
                </div>
                <table className="rp-table">
                  <thead><tr>
                    <th>#</th>
                    <th>{t('product_header')}</th>
                    <th>{t('quantity')}</th>
                    <th style={{ textAlign: 'right' }}>{t('total_revenue')}</th>
                  </tr></thead>
                  <tbody>
                    {topProducts.length ? topProducts.map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: '#7a9e8a' }}>{i + 1}</td>
                        <td className="rp-product-name">{p.product_name}</td>
                        <td>{p.total_qty}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#2d5a3d' }}>
                          {currency}{p.total_revenue.toFixed(2)}
                        </td>
                      </tr>
                    )) : <tr><td colSpan={4} className="rp-empty">{t('rpt_no_data')}</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="rp-table-card">
                <div className="rp-table-header">
                  <Package size={16} color="#2d5a3d" /> {t('rpt_sales_by_category')}
                </div>
                <table className="rp-table">
                  <thead><tr>
                    <th>{t('category')}</th>
                    <th>{t('transactions')}</th>
                    <th style={{ textAlign: 'right' }}>{t('total_revenue')}</th>
                  </tr></thead>
                  <tbody>
                    {categorySales.length ? categorySales.map((c, i) => (
                      <tr key={i}>
                        <td className="rp-product-name">{c.category_name}</td>
                        <td>{c.count}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#2d5a3d' }}>
                          {currency}{c.total.toFixed(2)}
                        </td>
                      </tr>
                    )) : <tr><td colSpan={3} className="rp-empty">{t('rpt_no_data')}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ═══════ INVENTORY TAB ═══════ */}
        {activeTab === 'inventory' && (
          <>
            <div className="rp-stats-grid">
              <div className="rp-stat-card" style={{ borderLeftColor: '#2d5a3d' }}>
                <div className="rp-stat-label">{t('rpt_total_products')}</div>
                <div className="rp-stat-value">{stockReport.length}</div>
              </div>
              <div className="rp-stat-card" style={{ borderLeftColor: '#2d5a3d' }}>
                <div className="rp-stat-label">{t('rpt_total_stock_value')}</div>
                <div className="rp-stat-value rp-stat-green">{currency}{totalStockValue.toFixed(2)}</div>
              </div>
              <div className="rp-stat-card" style={{ borderLeftColor: '#d4a030' }}>
                <div className="rp-stat-label">{t('low_stock')}</div>
                <div className="rp-stat-value rp-stat-orange">{lowStockCount}</div>
              </div>
              <div className="rp-stat-card" style={{ borderLeftColor: '#c05050' }}>
                <div className="rp-stat-label">{t('rpt_out_of_stock')}</div>
                <div className="rp-stat-value rp-stat-red">{outOfStockCount}</div>
              </div>
            </div>

            <div className="rp-charts-grid">
              <div className="rp-chart-card">
                <div className="rp-chart-title"><Package size={16} color="#2d5a3d" /> {t('rpt_stock_by_category')}</div>
                {categoryStockValue.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={categoryStockValue}
                        dataKey="total_value"
                        nameKey="category_name"
                        cx="50%" cy="50%"
                        outerRadius={100}
                        label={(props: any) => `${props.category_name} ${((props.percent || 0) * 100).toFixed(0)}%`}
                        labelLine={true}
                      >
                        {categoryStockValue.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="rp-empty">{t('rpt_no_data')}</div>}
              </div>

              <div className="rp-table-card">
                <div className="rp-table-header">
                  <Package size={16} color="#2d5a3d" /> {t('rpt_category_breakdown')}
                </div>
                <table className="rp-table">
                  <thead><tr>
                    <th>{t('category')}</th>
                    <th>{t('products')}</th>
                    <th style={{ textAlign: 'right' }}>{t('asset_value')}</th>
                  </tr></thead>
                  <tbody>
                    {categoryStockValue.length ? categoryStockValue.map((c, i) => (
                      <tr key={i}>
                        <td className="rp-product-name">{c.category_name}</td>
                        <td>{c.product_count}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#2d5a3d' }}>
                          {currency}{c.total_value.toFixed(2)}
                        </td>
                      </tr>
                    )) : <tr><td colSpan={3} className="rp-empty">{t('rpt_no_data')}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stock Table */}
            <div className="rp-table-card">
              <div className="rp-table-header">
                <AlertTriangle size={16} color="#2d5a3d" /> {t('rpt_stock_levels')}
              </div>
              <table className="rp-table">
                <thead><tr>
                  <th>{t('product_header')}</th>
                  <th>{t('category')}</th>
                  <th>{t('unit')}</th>
                  <th>{t('stock')}</th>
                  <th>{t('unit_price')}</th>
                  <th style={{ textAlign: 'right' }}>{t('asset_value')}</th>
                  <th>{t('rpt_status')}</th>
                </tr></thead>
                <tbody>
                  {stockReport.length ? stockReport.map((s, i) => (
                    <tr key={i}>
                      <td className="rp-product-name">{s.product_name}</td>
                      <td>{s.category_name}</td>
                      <td>{s.base_unit}</td>
                      <td style={{ fontWeight: 700 }}>{s.stock}</td>
                      <td>{currency}{s.price.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#2d5a3d' }}>
                        {currency}{s.value.toFixed(2)}
                      </td>
                      <td>
                        <span className={`rp-badge ${
                          s.status === 'in_stock' ? 'rp-badge-green' :
                          s.status === 'low_stock' ? 'rp-badge-yellow' : 'rp-badge-red'
                        }`}>
                          {t(`rpt_${s.status}`)}
                        </span>
                      </td>
                    </tr>
                  )) : <tr><td colSpan={7} className="rp-empty">{t('rpt_no_data')}</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Expiry Report */}
            {expiryReport.length > 0 && (
              <div className="rp-table-card">
                <div className="rp-table-header">
                  <AlertTriangle size={16} color="#c05050" /> {t('rpt_expiry_report')}
                </div>
                <table className="rp-table">
                  <thead><tr>
                    <th>{t('product_header')}</th>
                    <th>{t('stock')}</th>
                    <th>{t('expiry_date')}</th>
                    <th>{t('rpt_days_left')}</th>
                    <th>{t('rpt_status')}</th>
                  </tr></thead>
                  <tbody>
                    {expiryReport.map((e, i) => (
                      <tr key={i}>
                        <td className="rp-product-name">{e.product_name}</td>
                        <td style={{ fontWeight: 700 }}>{e.stock}</td>
                        <td>{e.expiry_date}</td>
                        <td style={{ fontWeight: 700 }}>{e.days_left}</td>
                        <td>
                          <span className={`rp-badge ${
                            e.status === 'good' ? 'rp-badge-green' :
                            e.status === 'warning' ? 'rp-badge-yellow' :
                            e.status === 'critical' ? 'rp-badge-orange' : 'rp-badge-red'
                          }`}>
                            {t(`rpt_expiry_${e.status}`)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ═══════ FINANCIAL TAB ═══════ */}
        {activeTab === 'financial' && (
          <>
            <div className="rp-stats-grid">
              <div className="rp-stat-card" style={{ borderLeftColor: '#2d5a3d' }}>
                <div className="rp-stat-label">{t('rpt_gross_revenue')}</div>
                <div className="rp-stat-value rp-stat-green">{currency}{totalRevenue.toFixed(2)}</div>
              </div>
              <div className="rp-stat-card" style={{ borderLeftColor: '#c05050' }}>
                <div className="rp-stat-label">{t('total_discounts')}</div>
                <div className="rp-stat-value rp-stat-red">{currency}{totalDiscount.toFixed(2)}</div>
              </div>
              <div className="rp-stat-card" style={{ borderLeftColor: '#4a8f6a' }}>
                <div className="rp-stat-label">{t('rpt_net_revenue')}</div>
                <div className="rp-stat-value rp-stat-green">{currency}{(totalRevenue - totalDiscount).toFixed(2)}</div>
              </div>
              <div className="rp-stat-card" style={{ borderLeftColor: '#2d5a3d' }}>
                <div className="rp-stat-label">{t('rpt_total_stock_value')}</div>
                <div className="rp-stat-value rp-stat-green">{currency}{totalStockValue.toFixed(2)}</div>
              </div>
            </div>

            {/* Revenue vs Discounts over time */}
            <div className="rp-charts-grid">
              <div className="rp-chart-card rp-chart-full">
                <div className="rp-chart-title"><TrendingUp size={16} color="#2d5a3d" /> {t('rpt_revenue_vs_discounts')}</div>
                {salesByPeriod.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesByPeriod} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ddd8cc" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#7a9e8a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#7a9e8a' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="total" name={t('total_revenue')} stroke="#2d5a3d" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="discounts" name={t('total_discounts')} stroke="#c05050" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="rp-empty">{t('rpt_no_data')}</div>}
              </div>

              <div className="rp-chart-card">
                <div className="rp-chart-title"><DollarSign size={16} color="#2d5a3d" /> {t('rpt_payment_breakdown')}</div>
                {paymentSummary.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={paymentSummary}
                        dataKey="total"
                        nameKey="payment_method"
                        cx="50%" cy="50%"
                        outerRadius={95}
                        label={(props: any) => `${props.payment_method} ${((props.percent || 0) * 100).toFixed(0)}%`}
                        labelLine={true}
                      >
                        {paymentSummary.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="rp-empty">{t('rpt_no_data')}</div>}
              </div>

              <div className="rp-chart-card">
                <div className="rp-chart-title"><BarChart3 size={16} color="#2d5a3d" /> {t('rpt_sales_by_category')}</div>
                {categorySales.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={categorySales} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ddd8cc" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#7a9e8a' }} />
                      <YAxis type="category" dataKey="category_name" width={100} tick={{ fontSize: 11, fill: '#7a9e8a' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" name={t('total_revenue')} fill="#4a8f6a" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="rp-empty">{t('rpt_no_data')}</div>}
              </div>
            </div>

            {/* Period breakdown table */}
            <div className="rp-table-card">
              <div className="rp-table-header">
                <TrendingUp size={16} color="#2d5a3d" /> {t('rpt_period_breakdown')}
              </div>
              <table className="rp-table">
                <thead><tr>
                  <th>{t('rpt_period')}</th>
                  <th>{t('transactions')}</th>
                  <th>{t('rpt_gross_revenue')}</th>
                  <th>{t('total_discounts')}</th>
                  <th style={{ textAlign: 'right' }}>{t('rpt_net_revenue')}</th>
                </tr></thead>
                <tbody>
                  {salesByPeriod.length ? salesByPeriod.map((s, i) => (
                    <tr key={i}>
                      <td className="rp-product-name">{s.period}</td>
                      <td>{s.count}</td>
                      <td>{currency}{s.total.toFixed(2)}</td>
                      <td style={{ color: '#c05050' }}>{currency}{s.discounts.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#2d5a3d' }}>
                        {currency}{(s.total - s.discounts).toFixed(2)}
                      </td>
                    </tr>
                  )) : <tr><td colSpan={5} className="rp-empty">{t('rpt_no_data')}</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Asset Valuation */}
            <div className="rp-table-card">
              <div className="rp-table-header">
                <TrendingUp size={16} color="#2d5a3d" /> {t('asset_valuation')}
              </div>
              <table className="rp-table">
                <thead><tr>
                  <th>{t('product_header')}</th>
                  <th>{t('category')}</th>
                  <th>{t('unit_price')}</th>
                  <th>{t('current_stock')}</th>
                  <th style={{ textAlign: 'right' }}>{t('asset_value')}</th>
                </tr></thead>
                <tbody>
                  {stockReport.length ? stockReport.filter(s => s.value > 0).map((s, i) => (
                    <tr key={i}>
                      <td className="rp-product-name">{s.product_name}</td>
                      <td>{s.category_name}</td>
                      <td>{currency}{s.price.toFixed(2)}</td>
                      <td style={{ fontWeight: 700 }}>{s.stock}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#2d5a3d' }}>
                        {currency}{s.value.toFixed(2)}
                      </td>
                    </tr>
                  )) : <tr><td colSpan={5} className="rp-empty">{t('rpt_no_data')}</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ═══════ REVENUE TAB ═══════ */}
        {activeTab === 'revenue' && (
          <>
            {/* Summary Stats */}
            {revenueSummary && (
              <div className="rp-stats-grid">
                <div className="rp-stat-card" style={{ borderLeftColor: '#2d5a3d' }}>
                  <div className="rp-stat-label">{t('rev_total_sales')}</div>
                  <div className="rp-stat-value rp-stat-green">{currency}{revenueSummary.total_sales.toFixed(2)}</div>
                </div>
                <div className="rp-stat-card" style={{ borderLeftColor: '#c05050' }}>
                  <div className="rp-stat-label">{t('rev_cogs')}</div>
                  <div className="rp-stat-value rp-stat-red">{currency}{revenueSummary.total_cogs.toFixed(2)}</div>
                </div>
                <div className="rp-stat-card" style={{ borderLeftColor: '#d4a030' }}>
                  <div className="rp-stat-label">{t('total_discounts')}</div>
                  <div className="rp-stat-value rp-stat-orange">{currency}{revenueSummary.total_discounts.toFixed(2)}</div>
                </div>
                <div className="rp-stat-card" style={{ borderLeftColor: revenueSummary.net_profit >= 0 ? '#2d5a3d' : '#c05050' }}>
                  <div className="rp-stat-label">{t('rev_net_profit')}</div>
                  <div className="rp-stat-value" style={{ color: revenueSummary.net_profit >= 0 ? '#2d5a3d' : '#c05050' }}>
                    {currency}{revenueSummary.net_profit.toFixed(2)}
                  </div>
                </div>
                <div className="rp-stat-card" style={{ borderLeftColor: '#4a8f6a' }}>
                  <div className="rp-stat-label">{t('rev_gross_profit')}</div>
                  <div className="rp-stat-value rp-stat-green">{currency}{revenueSummary.gross_profit.toFixed(2)}</div>
                </div>
                <div className="rp-stat-card" style={{ borderLeftColor: '#ddd8cc' }}>
                  <div className="rp-stat-label">{t('rev_profit_margin')}</div>
                  <div className="rp-stat-value">{revenueSummary.profit_margin.toFixed(1)}%</div>
                </div>
                <div className="rp-stat-card" style={{ borderLeftColor: '#89b0ae' }}>
                  <div className="rp-stat-label">{t('rev_supplier_expenses')}</div>
                  <div className="rp-stat-value" style={{ color: '#c05050' }}>{currency}{revenueSummary.total_expenses.toFixed(2)}</div>
                </div>
                <div className="rp-stat-card" style={{ borderLeftColor: '#ddd8cc' }}>
                  <div className="rp-stat-label">{t('rev_orders')}</div>
                  <div className="rp-stat-value">{revenueSummary.sale_count} / {revenueSummary.purchase_count}</div>
                </div>
              </div>
            )}

            {/* Revenue vs Expenses Chart + Profit Trend */}
            <div className="rp-charts-grid">
              <div className="rp-chart-card rp-chart-full">
                <div className="rp-chart-title"><TrendingUp size={16} color="#2d5a3d" /> {t('rev_revenue_vs_expenses')}</div>
                {revenueByPeriod.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByPeriod} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ddd8cc" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#7a9e8a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#7a9e8a' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="total_sales" name={t('rev_total_sales')} fill="#2d5a3d" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="total_cogs" name={t('rev_cogs')} fill="#c05050" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="total_discounts" name={t('total_discounts')} fill="#d4a030" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="rp-empty">{t('rpt_no_data')}</div>}
              </div>

              <div className="rp-chart-card rp-chart-full">
                <div className="rp-chart-title"><DollarSign size={16} color="#2d5a3d" /> {t('rev_profit_trend')}</div>
                {revenueByPeriod.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={revenueByPeriod} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2d5a3d" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#2d5a3d" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ddd8cc" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#7a9e8a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#7a9e8a' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="net_profit" name={t('rev_net_profit')} stroke="#2d5a3d" fill="url(#profitGrad)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="rp-empty">{t('rpt_no_data')}</div>}
              </div>

              {/* Top Profitable Products Chart */}
              <div className="rp-chart-card">
                <div className="rp-chart-title"><BarChart3 size={16} color="#2d5a3d" /> {t('rev_top_profitable')}</div>
                {productProfit.filter(p => p.profit > 0).length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={productProfit.filter(p => p.profit > 0).slice(0, 10)} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ddd8cc" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#7a9e8a' }} />
                      <YAxis type="category" dataKey="product_name" width={120} tick={{ fontSize: 10, fill: '#7a9e8a' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="profit" name={t('rev_profit')} fill="#4a8f6a" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="rp-empty">{t('rpt_no_data')}</div>}
              </div>

              {/* Category Profit Pie */}
              <div className="rp-chart-card">
                <div className="rp-chart-title"><Package size={16} color="#2d5a3d" /> {t('rev_category_profit')}</div>
                {categoryProfit.filter(c => c.profit > 0).length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={categoryProfit.filter(c => c.profit > 0)}
                        dataKey="profit"
                        nameKey="category_name"
                        cx="50%" cy="50%"
                        outerRadius={95}
                        label={(props: any) => `${props.category_name} ${((props.percent || 0) * 100).toFixed(0)}%`}
                        labelLine={true}
                      >
                        {categoryProfit.filter(c => c.profit > 0).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="rp-empty">{t('rpt_no_data')}</div>}
              </div>
            </div>

            {/* Revenue by Period Table */}
            <div className="rp-table-card">
              <div className="rp-table-header">
                <TrendingUp size={16} color="#2d5a3d" /> {t('rev_period_breakdown')}
              </div>
              <table className="rp-table">
                <thead><tr>
                  <th>{t('rpt_period')}</th>
                  <th>{t('rev_total_sales')}</th>
                  <th>{t('rev_cogs')}</th>
                  <th>{t('total_discounts')}</th>
                  <th style={{ textAlign: 'right' }}>{t('rev_net_profit')}</th>
                </tr></thead>
                <tbody>
                  {revenueByPeriod.length ? revenueByPeriod.map((r, i) => (
                    <tr key={i}>
                      <td className="rp-product-name">{r.period}</td>
                      <td>{currency}{r.total_sales.toFixed(2)}</td>
                      <td style={{ color: '#c05050' }}>{currency}{r.total_cogs.toFixed(2)}</td>
                      <td style={{ color: '#d4a030' }}>{currency}{r.total_discounts.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: r.net_profit >= 0 ? '#2d5a3d' : '#c05050' }}>
                        {currency}{r.net_profit.toFixed(2)}
                      </td>
                    </tr>
                  )) : <tr><td colSpan={5} className="rp-empty">{t('rpt_no_data')}</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Product Profit Table */}
            <div className="rp-table-card">
              <div className="rp-table-header">
                <Package size={16} color="#2d5a3d" /> {t('rev_product_profit')}
              </div>
              <table className="rp-table">
                <thead><tr>
                  <th>{t('product_header')}</th>
                  <th>{t('category')}</th>
                  <th>{t('quantity')}</th>
                  <th>{t('rev_revenue')}</th>
                  <th>{t('rev_cost')}</th>
                  <th style={{ textAlign: 'right' }}>{t('rev_profit')}</th>
                </tr></thead>
                <tbody>
                  {productProfit.length ? productProfit.map((p, i) => (
                    <tr key={i}>
                      <td className="rp-product-name">{p.product_name}</td>
                      <td>{p.category_name}</td>
                      <td>{p.qty_sold % 1 === 0 ? p.qty_sold.toFixed(0) : p.qty_sold.toFixed(2)}</td>
                      <td>{currency}{p.selling_revenue.toFixed(2)}</td>
                      <td style={{ color: '#c05050' }}>{currency}{p.purchase_cost.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: p.profit >= 0 ? '#2d5a3d' : '#c05050' }}>
                        {currency}{p.profit.toFixed(2)}
                      </td>
                    </tr>
                  )) : <tr><td colSpan={6} className="rp-empty">{t('rpt_no_data')}</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Category Profit Table */}
            <div className="rp-table-card">
              <div className="rp-table-header">
                <BarChart3 size={16} color="#2d5a3d" /> {t('rev_category_profit')}
              </div>
              <table className="rp-table">
                <thead><tr>
                  <th>{t('category')}</th>
                  <th>{t('products')}</th>
                  <th>{t('rev_total_sales')}</th>
                  <th>{t('rev_cost')}</th>
                  <th style={{ textAlign: 'right' }}>{t('rev_profit')}</th>
                </tr></thead>
                <tbody>
                  {categoryProfit.length ? categoryProfit.map((c, i) => (
                    <tr key={i}>
                      <td className="rp-product-name">{c.category_name}</td>
                      <td>{c.product_count}</td>
                      <td>{currency}{c.total_sales.toFixed(2)}</td>
                      <td style={{ color: '#c05050' }}>{currency}{c.total_cost.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: c.profit >= 0 ? '#2d5a3d' : '#c05050' }}>
                        {currency}{c.profit.toFixed(2)}
                      </td>
                    </tr>
                  )) : <tr><td colSpan={5} className="rp-empty">{t('rpt_no_data')}</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Reports;