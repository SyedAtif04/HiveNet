const BASE = '/logbot';

const CAT_COLORS = ['#f5c518','#3ecf8e','#4c9eff','#9966ff','#e05555','#6b6b88'];

export function computeStatus(item) {
  const qty = item.quantity || 0;
  const ss  = item.safety_stock || 0;
  const rp  = item.reorder_point || 0;
  if (qty <= 0) return 'Critical';
  if (ss > 0 && qty <= ss) return 'Critical';
  if (rp > 0 && qty <= rp) return 'Low';
  return 'OK';
}

export function timeAgo(isoStr) {
  if (!isoStr) return '—';
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function alertLevel(severity) {
  return severity === 'critical' ? 'error' : severity === 'high' ? 'warning' : 'info';
}

async function get(path) {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
}

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || `POST ${path} → ${r.status}`);
  }
  return r.json();
}

export async function fetchSKUs() {
  return get('/inventory/skus');
}

export async function fetchStock() {
  return get('/inventory/stock');
}

export async function fetchSuppliers() {
  return get('/inventory/suppliers');
}

export async function fetchDecisions() {
  return get('/optimization/decisions');
}

export async function fetchAlerts(includeResolved = false) {
  return get(`/alerts${includeResolved ? '?resolved=true' : ''}`);
}

export async function runAlertCheck() {
  return post('/alerts/check', {});
}

export async function resolveAlert(alertId) {
  return post(`/alerts/${alertId}/resolve`, {});
}

export async function createSKU(data) {
  return post('/inventory/skus', {
    name:             data.name,
    category:         data.category || null,
    description:      data.description || null,
    unit_of_measure:  data.unit_of_measure || 'units',
  });
}

export async function updateStock(data) {
  return post('/inventory/stock', data);
}

export async function createSupplier(data) {
  return post('/inventory/suppliers', data);
}

export async function fetchForecastResults(duration) {
  const r = await fetch(`${BASE}/forecast/results/${duration}`);
  if (!r.ok) return null;
  return r.json();
}

export async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(`${BASE}/upload`, { method: 'POST', body: fd });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed: ${r.status}`);
  }
  return r.json();
}

export async function runForecast(dataPath, duration = '3_months') {
  return post('/forecast', {
    data_path: dataPath,
    duration,
    feature_select: false,
    history_days: 90,
    n_bootstrap: 50,
  });
}

export function buildInventoryRows(stockItems, skus) {
  const skuMap = Object.fromEntries(skus.map(s => [s.name, s]));
  return stockItems.map(item => {
    const sku = skuMap[item.product_name];
    return {
      id:       String(item.id),
      skuCode:  sku ? sku.id.substring(0, 7).toUpperCase() : '—',
      name:     item.product_name,
      category: sku?.category || 'Uncategorized',
      qty:      item.quantity || 0,
      rp:       item.reorder_point || 0,
      ss:       item.safety_stock || 0,
      eoq:      item.eoq || 0,
      price:    item.unit_price || 0,
      status:   computeStatus(item),
      location: item.warehouse_location || '—',
    };
  });
}

export function buildCategories(stockItems, skus) {
  const skuMap = Object.fromEntries(skus.map(s => [s.name, s]));
  const catVal = {};
  for (const item of stockItems) {
    const cat = skuMap[item.product_name]?.category || 'Uncategorized';
    catVal[cat] = (catVal[cat] || 0) + (item.quantity || 0) * (item.unit_price || 0);
  }
  const total = Object.values(catVal).reduce((s, v) => s + v, 0) || 1;
  return Object.entries(catVal)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount], i) => ({
      name,
      amount: Math.round(amount),
      pct:    Math.round((amount / total) * 100),
      color:  CAT_COLORS[i % CAT_COLORS.length],
    }));
}

export function buildSummary(stockItems, suppliers, alerts) {
  const totalSKUs       = stockItems.length;
  const criticalCount   = stockItems.filter(i => computeStatus(i) === 'Critical').length;
  const lowStockCount   = stockItems.filter(i => computeStatus(i) === 'Low').length;
  const activeAlerts    = alerts.length;
  const inventoryValue  = stockItems.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
  const supplierCount   = suppliers.length;
  const avgLeadTime     = suppliers.length
    ? (suppliers.reduce((s, sup) => s + (sup.lead_time_days || 0), 0) / suppliers.length).toFixed(1)
    : 0;
  return { totalSKUs, criticalCount, lowStockCount, activeAlerts, inventoryValue, supplierCount, avgLeadTime };
}
