export const MOCK_SUMMARY = {
  totalSKUs: 124, lowStockCount: 18, criticalCount: 7, activeAlerts: 12,
  forecastAccuracy: 94.2, inventoryValue: 482500, supplierCount: 8,
  fulfillmentRate: 97.3, avgLeadTime: 7.4, monthlyDemand: 435,
};

export const MOCK_MONTHLY = [
  { month: 'Nov', demand: 380, fulfilled: 375, stockLevel: 520 },
  { month: 'Dec', demand: 450, fulfilled: 440, stockLevel: 480 },
  { month: 'Jan', demand: 320, fulfilled: 320, stockLevel: 510 },
  { month: 'Feb', demand: 390, fulfilled: 388, stockLevel: 490 },
  { month: 'Mar', demand: 410, fulfilled: 405, stockLevel: 460 },
  { month: 'Apr', demand: 435, fulfilled: 430, stockLevel: 440 },
];

export const MOCK_CATEGORIES = [
  { name: 'Electronics',     amount: 185000, pct: 38, color: '#f5c518' },
  { name: 'Furniture',       amount:  97000, pct: 20, color: '#3ecf8e' },
  { name: 'Office Supplies', amount:  72800, pct: 15, color: '#4c9eff' },
  { name: 'Chemicals',       amount:  58500, pct: 12, color: '#9966ff' },
  { name: 'Tools',           amount:  34700, pct:  7, color: '#e05555' },
  { name: 'Other',           amount:  34500, pct:  8, color: '#6b6b88' },
];

export const MOCK_INVENTORY = [
  { id:  1, sku: 'SKU-001', name: 'Laptop Pro 15"',      category: 'Electronics',     qty:  45, rp: 20, ss: 10, eoq:  50, price: 1200, status: 'OK',       location: 'W-A1', supplier: 'TechCorp',    lastUpdated: '2026-04-20' },
  { id:  2, sku: 'SKU-002', name: 'Wireless Mouse',       category: 'Electronics',     qty:   3, rp: 25, ss: 15, eoq: 100, price:   35, status: 'Critical',  location: 'W-A2', supplier: 'TechCorp',    lastUpdated: '2026-04-22' },
  { id:  3, sku: 'SKU-003', name: 'Office Chair',         category: 'Furniture',       qty:  12, rp:  8, ss:  5, eoq:  20, price:  380, status: 'Low',       location: 'W-B1', supplier: 'FurniPro',    lastUpdated: '2026-04-18' },
  { id:  4, sku: 'SKU-004', name: 'Nitrile Gloves (Box)', category: 'Chemicals',       qty: 280, rp:100, ss: 60, eoq: 500, price:   12, status: 'OK',        location: 'W-C1', supplier: 'ChemSafe',    lastUpdated: '2026-04-15' },
  { id:  5, sku: 'SKU-005', name: 'Desk Lamp LED',        category: 'Office Supplies', qty:  28, rp: 20, ss: 10, eoq:  30, price:   45, status: 'Low',       location: 'W-A3', supplier: 'OfficeWorld',  lastUpdated: '2026-04-21' },
  { id:  6, sku: 'SKU-006', name: 'USB-C Hub 7-Port',     category: 'Electronics',     qty:  67, rp: 30, ss: 15, eoq:  80, price:   55, status: 'OK',        location: 'W-A4', supplier: 'TechCorp',    lastUpdated: '2026-04-19' },
  { id:  7, sku: 'SKU-007', name: 'Power Drill 20V',      category: 'Tools',           qty:   8, rp: 10, ss:  5, eoq:  25, price:  125, status: 'Critical',  location: 'W-D1', supplier: 'ToolMaster',  lastUpdated: '2026-04-23' },
  { id:  8, sku: 'SKU-008', name: 'Safety Gloves L',      category: 'Chemicals',       qty:   0, rp: 50, ss: 25, eoq: 200, price:    8, status: 'Critical',  location: 'W-C2', supplier: 'ChemSafe',    lastUpdated: '2026-04-24' },
  { id:  9, sku: 'SKU-009', name: 'Filing Cabinet 3D',    category: 'Furniture',       qty:  22, rp:  5, ss:  3, eoq:  10, price:  220, status: 'OK',        location: 'W-B2', supplier: 'FurniPro',    lastUpdated: '2026-04-17' },
  { id: 10, sku: 'SKU-010', name: 'Whiteboard 120x90',    category: 'Office Supplies', qty:  14, rp:  6, ss:  4, eoq:  12, price:   95, status: 'OK',        location: 'W-A5', supplier: 'OfficeWorld',  lastUpdated: '2026-04-16' },
  { id: 11, sku: 'SKU-011', name: 'Isopropyl Alcohol 5L', category: 'Chemicals',       qty:  38, rp: 20, ss: 12, eoq:  60, price:   18, status: 'OK',        location: 'W-C3', supplier: 'ChemSafe',    lastUpdated: '2026-04-14' },
  { id: 12, sku: 'SKU-012', name: 'Angle Grinder 4.5"',   category: 'Tools',           qty:   5, rp:  8, ss:  4, eoq:  20, price:   89, status: 'Critical',  location: 'W-D2', supplier: 'ToolMaster',  lastUpdated: '2026-04-22' },
];

export const MOCK_ALERTS = [
  { id: 1, level: 'error',   sku: 'SKU-002', product: 'Wireless Mouse',  message: 'Stockout risk: 94% probability — qty 3, below safety stock 15',    time: '1h ago',  resolved: false },
  { id: 2, level: 'error',   sku: 'SKU-008', product: 'Safety Gloves L', message: 'Out of stock — quantity reached 0, demand continues',               time: '3h ago',  resolved: false },
  { id: 3, level: 'error',   sku: 'SKU-007', product: 'Power Drill 20V', message: 'Critically low: qty 8 below safety stock 5, ROP 10',                time: '5h ago',  resolved: false },
  { id: 4, level: 'warning', sku: 'SKU-003', product: 'Office Chair',    message: 'Below reorder point — qty 12, ROP 8, 20% buffer breached',          time: '8h ago',  resolved: false },
  { id: 5, level: 'warning', sku: 'SKU-005', product: 'Desk Lamp LED',   message: 'Approaching ROP — qty 28, ROP 20, monitor closely',                 time: '12h ago', resolved: false },
  { id: 6, level: 'info',    sku: null,       product: null,              message: 'Forecast accuracy improved to 94.2% — model retrained on Apr data',  time: '1d ago',  resolved: false },
  { id: 7, level: 'info',    sku: null,       product: null,              message: 'Ingestion pipeline completed: 2,340 records processed successfully', time: '2d ago',  resolved: false },
];

export const MOCK_DECISIONS = [
  { id: 1, sku: 'SKU-008', name: 'Safety Gloves L',    action: 'URGENT_REORDER', priority: 'critical', qty: 200, currentStock:  0, rp: 50, reason: 'Out of stock — zero units remaining'     },
  { id: 2, sku: 'SKU-002', name: 'Wireless Mouse',     action: 'URGENT_REORDER', priority: 'critical', qty: 100, currentStock:  3, rp: 25, reason: 'Below safety stock — high stockout risk' },
  { id: 3, sku: 'SKU-007', name: 'Power Drill 20V',    action: 'URGENT_REORDER', priority: 'critical', qty:  25, currentStock:  8, rp: 10, reason: 'Critically depleted — below safety stock' },
  { id: 4, sku: 'SKU-012', name: 'Angle Grinder 4.5"', action: 'REORDER',        priority: 'high',     qty:  20, currentStock:  5, rp:  8, reason: 'At reorder point — order recommended'     },
  { id: 5, sku: 'SKU-003', name: 'Office Chair',       action: 'REORDER',        priority: 'high',     qty:  20, currentStock: 12, rp:  8, reason: 'Within 20% of reorder point'             },
  { id: 6, sku: 'SKU-005', name: 'Desk Lamp LED',      action: 'MONITOR',        priority: 'medium',   qty:  30, currentStock: 28, rp: 20, reason: 'Approaching ROP — monitor closely'       },
  { id: 7, sku: 'SKU-001', name: 'Laptop Pro 15"',     action: 'NO_ACTION',      priority: 'low',      qty:   0, currentStock: 45, rp: 20, reason: 'Adequate stock levels'                   },
];

export const MOCK_SUPPLIERS = [
  { id: 1, name: 'TechCorp',    leadTime:  7, reliability: 96, minOrder:  10, skuCount: 28, status: 'Active'   },
  { id: 2, name: 'FurniPro',    leadTime: 14, reliability: 88, minOrder:   5, skuCount: 15, status: 'Active'   },
  { id: 3, name: 'ChemSafe',    leadTime:  5, reliability: 99, minOrder:  50, skuCount: 22, status: 'Active'   },
  { id: 4, name: 'OfficeWorld', leadTime:  3, reliability: 92, minOrder:  20, skuCount: 35, status: 'Active'   },
  { id: 5, name: 'ToolMaster',  leadTime: 10, reliability: 84, minOrder:  15, skuCount: 24, status: 'Inactive' },
];

export const MOCK_FORECASTS = {
  threeMonth:  { totalDemand: 1380, avgMonthly: 460, trend: '+8.2%',  confidence: 94.2, topSKU: 'Wireless Mouse',  topQty:  380 },
  sixMonth:    { totalDemand: 2780, avgMonthly: 463, trend: '+11.6%', confidence: 91.8, topSKU: 'Wireless Mouse',  topQty:  760 },
  twelveMonth: { totalDemand: 5880, avgMonthly: 490, trend: '+18.4%', confidence: 87.3, topSKU: 'Laptop Pro 15"', topQty:  980 },
};

export const MOCK_FORECAST_MONTHLY = [
  { month: 'May', demand: 445, lower: 410, upper: 480 },
  { month: 'Jun', demand: 460, lower: 422, upper: 498 },
  { month: 'Jul', demand: 474, lower: 432, upper: 516 },
  { month: 'Aug', demand: 491, lower: 445, upper: 537 },
  { month: 'Sep', demand: 505, lower: 455, upper: 555 },
  { month: 'Oct', demand: 520, lower: 466, upper: 574 },
  { month: 'Nov', demand: 538, lower: 478, upper: 598 },
  { month: 'Dec', demand: 555, lower: 490, upper: 620 },
  { month: 'Jan', demand: 572, lower: 502, upper: 642 },
  { month: 'Feb', demand: 588, lower: 514, upper: 662 },
  { month: 'Mar', demand: 605, lower: 526, upper: 684 },
  { month: 'Apr', demand: 625, lower: 540, upper: 710 },
];

export const MOCK_KNOWLEDGE = [
  { id: 1, title: 'Q1 2026 Inventory Report',       score: 0.96, tags: ['report', 'Q1'],         preview: 'Total inventory value Q1: $482,500 across 124 active SKUs. Critical alerts: 7 unresolved...' },
  { id: 2, title: 'Supplier Performance FY2026',    score: 0.89, tags: ['suppliers', 'KPI'],      preview: 'TechCorp leads at 96% reliability. ChemSafe highest at 99% on-time delivery rate...' },
  { id: 3, title: 'Reorder Policy Guidelines',      score: 0.83, tags: ['policy', 'reorder'],     preview: 'All reorders above $5,000 require manager approval. Safety stock = Z × σ(LT) × √demand...' },
  { id: 4, title: 'Demand Forecast Model v2.1',     score: 0.81, tags: ['forecast', 'ML'],        preview: 'Ensemble: LightGBM + ETS + TFT. 94.2% accuracy on Apr 2026 validation set, 24mo training...' },
  { id: 5, title: 'Stockout Incident Log Mar 2026', score: 0.74, tags: ['stockout', 'incident'],  preview: 'March 2026: 3 stockout events — Safety Gloves, Cable Ties, Drill Bits. Root cause: lead...' },
];

export const MOCK_CHAT = [
  { role: 'bot',  text: "Hello! I'm LogBot AI. Ask me anything about your supply chain — inventory levels, reorder decisions, demand forecasts, or stockout risks." },
  { role: 'user', text: 'Which SKUs are at risk of stockout this week?' },
  { role: 'bot',  text: 'Based on current stock levels and demand forecasts, **3 SKUs** are at critical risk:\n\n1. **Safety Gloves L (SKU-008)** — already out of stock (qty: 0)\n2. **Wireless Mouse (SKU-002)** — 94% stockout probability, only 3 units remain (safety stock: 15)\n3. **Power Drill 20V (SKU-007)** — critically low at 8 units, below reorder point of 10\n\nI recommend immediate reorder for all three.' },
];
