# LogBot — Testing Guide

A complete walkthrough for testing every feature of the logistics bot.
All examples use `curl`. You can also use the interactive Swagger UI at `http://localhost:8000/docs`.

---

## 0. Start the Server

```bash
cd logbot/prisma_backend
uvicorn main:app --reload --port 8000
```

Confirm it is running:

```bash
curl http://localhost:8000/
```

Expected response:
```json
{
  "service": "LogBot API",
  "status": "operational",
  "endpoints": { "inventory": "/inventory", "optimization": "/optimization", ... }
}
```

Health check:
```bash
curl http://localhost:8000/status/health
```

---

## 1. Inventory — SKUs, Suppliers, Stock, Demand History

### 1.1 Create a SKU

```bash
curl -X POST http://localhost:8000/inventory/skus \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Steel Rod 10mm",
    "category": "Raw Materials",
    "description": "10mm diameter mild steel rod",
    "unit_of_measure": "kg"
  }'
```

Save the returned `id` — you will need it as `<SKU_ID>` below.

### 1.2 List all SKUs

```bash
curl http://localhost:8000/inventory/skus
```

### 1.3 Get a single SKU

```bash
curl http://localhost:8000/inventory/skus/<SKU_ID>
```

---

### 1.4 Create a Supplier

```bash
curl -X POST http://localhost:8000/inventory/suppliers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mumbai Steel Works",
    "lead_time_days": 5,
    "min_order_qty": 100,
    "unit_cost": 85.50,
    "reliability_score": 0.92,
    "contact_info": "orders@mumbaisteelworks.com"
  }'
```

Save the returned `id` as `<SUPPLIER_ID>`.

Create a second, more expensive but faster supplier for comparison:

```bash
curl -X POST http://localhost:8000/inventory/suppliers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Express Metals Ltd",
    "lead_time_days": 2,
    "min_order_qty": 50,
    "unit_cost": 98.00,
    "reliability_score": 0.98
  }'
```

### 1.5 List all Suppliers

```bash
curl http://localhost:8000/inventory/suppliers
```

### 1.6 Link a Supplier to a SKU

```bash
curl -X POST http://localhost:8000/inventory/suppliers/link \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "<SKU_ID>",
    "supplier_id": "<SUPPLIER_ID>",
    "preferred": true
  }'
```

---

### 1.7 Set Stock Level

```bash
curl -X POST http://localhost:8000/inventory/stock \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "<SKU_ID>",
    "quantity": 150,
    "warehouse_location": "Bay A-12"
  }'
```

To set a critically low level (triggers alerts later):

```bash
curl -X POST http://localhost:8000/inventory/stock \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "<SKU_ID>",
    "quantity": 8,
    "reorder_point": 50,
    "safety_stock": 20
  }'
```

### 1.8 Get All Stock Levels

```bash
curl http://localhost:8000/inventory/stock
```

### 1.9 Get Stock for a Specific SKU

```bash
curl http://localhost:8000/inventory/stock/<SKU_ID>
```

---

### 1.10 Record Demand History

Record daily sales/usage (repeat for multiple days to build a history):

```bash
curl -X POST http://localhost:8000/inventory/demand \
  -H "Content-Type: application/json" \
  -d '{"sku_id": "<SKU_ID>", "date": "2024-01-01", "quantity": 12, "source": "manual"}'

curl -X POST http://localhost:8000/inventory/demand \
  -H "Content-Type: application/json" \
  -d '{"sku_id": "<SKU_ID>", "date": "2024-01-02", "quantity": 9, "source": "manual"}'

curl -X POST http://localhost:8000/inventory/demand \
  -H "Content-Type: application/json" \
  -d '{"sku_id": "<SKU_ID>", "date": "2024-01-03", "quantity": 14, "source": "manual"}'
```

### 1.11 Get Demand History for a SKU

```bash
curl http://localhost:8000/inventory/demand/<SKU_ID>
```

---

## 2. Optimization — Safety Stock, ROP, EOQ

### 2.1 Full Analysis (recommended starting point)

Calculates Safety Stock, ROP, and EOQ in one call.

```bash
curl -X POST http://localhost:8000/optimization/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "avg_daily_demand": 12,
    "demand_std": 3,
    "lead_time_days": 5,
    "lead_time_std": 1.5,
    "ordering_cost": 500,
    "holding_cost_per_unit": 8,
    "service_level": 0.95
  }'
```

Expected response:
```json
{
  "service_level": 0.95,
  "z_score": 1.6449,
  "safety_stock": 5.85,
  "reorder_point": 65.85,
  "eoq": 658.31,
  "avg_daily_demand": 12,
  "lead_time_days": 5,
  "annual_demand": 4380
}
```

**What the fields mean:**
- `safety_stock` — minimum buffer stock to maintain
- `reorder_point` — trigger a reorder when stock falls to this level
- `eoq` — optimal order quantity to minimise cost

---

### 2.2 Safety Stock only

```bash
curl -X POST http://localhost:8000/optimization/safety-stock \
  -H "Content-Type: application/json" \
  -d '{
    "z_score": 1.645,
    "sigma_lead_time": 1.5,
    "avg_demand": 12
  }'
```

**Z-score reference:**

| Service Level | Z-score |
|---|---|
| 90% | 1.28 |
| 95% | 1.645 |
| 99% | 2.326 |

---

### 2.3 Reorder Point (ROP) only

```bash
curl -X POST http://localhost:8000/optimization/rop \
  -H "Content-Type: application/json" \
  -d '{
    "avg_demand": 12,
    "lead_time": 5,
    "safety_stock": 5.85
  }'
```

---

### 2.4 EOQ only

```bash
curl -X POST http://localhost:8000/optimization/eoq \
  -H "Content-Type: application/json" \
  -d '{
    "annual_demand": 4380,
    "ordering_cost": 500,
    "holding_cost_per_unit": 8
  }'
```

---

### 2.5 Reorder Decisions (rule-based engine)

Evaluates all inventory items in the database and classifies each as:
`URGENT_REORDER` → `REORDER` → `MONITOR` → `NO_ACTION`

```bash
curl http://localhost:8000/optimization/decisions
```

Expected (when stock=8, ROP=50):
```json
[
  {
    "sku_name": "Steel Rod 10mm",
    "current_qty": 8,
    "reorder_point": 50,
    "action": "REORDER",
    "priority": "high",
    "recommended_order_qty": 658.31,
    "rationale": "Quantity (8.0) has reached or dropped below ROP (50.0)."
  }
]
```

---

### 2.6 Supplier Selection

Picks the optimal supplier using constraint-based optimization.

For a specific SKU (uses linked suppliers only):

```bash
curl -X POST http://localhost:8000/optimization/select-supplier \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "<SKU_ID>",
    "required_qty": 200
  }'
```

With custom weights (sum must equal 1.0):

```bash
curl -X POST http://localhost:8000/optimization/select-supplier \
  -H "Content-Type: application/json" \
  -d '{
    "required_qty": 200,
    "weights": {"cost": 0.6, "lead_time": 0.2, "reliability": 0.2}
  }'
```

---

## 3. Alerts — Threshold Monitoring & Stockout Prediction

### 3.1 Run Threshold Checks

Scans all inventory records and creates alerts for any SKU that is:
- Out of stock (`qty <= 0`) → severity: **critical**
- Below safety stock → severity: **high**
- At or below ROP → severity: **medium**

```bash
curl -X POST http://localhost:8000/alerts/check
```

Expected (when stock=8, SS=20, ROP=50):
```json
{
  "checked": 1,
  "alerts_created": 1,
  "alerts": [
    {
      "alert_type": "below_safety_stock",
      "severity": "high",
      "message": "[BELOW SAFETY STOCK] Steel Rod 10mm — qty 8.0 < safety stock 20.0"
    }
  ]
}
```

### 3.2 List Active Alerts

```bash
curl http://localhost:8000/alerts
```

Include resolved alerts:

```bash
curl "http://localhost:8000/alerts?resolved=true"
```

### 3.3 Resolve an Alert

```bash
curl -X POST http://localhost:8000/alerts/<ALERT_ID>/resolve
```

---

### 3.4 Train the Stockout Prediction Model

The model learns from historical records of whether stockout occurred.
Provide at least a few examples of both outcomes (0 and 1):

```bash
curl -X POST http://localhost:8000/alerts/train \
  -H "Content-Type: application/json" \
  -d '[
    {"current_qty": 200, "avg_daily_demand": 10, "lead_time_days": 5, "safety_stock": 30, "reorder_point": 80, "days_since_last_reorder": 5,  "demand_std": 2, "stockout_occurred": 0},
    {"current_qty": 15,  "avg_daily_demand": 12, "lead_time_days": 7, "safety_stock": 30, "reorder_point": 80, "days_since_last_reorder": 40, "demand_std": 5, "stockout_occurred": 1},
    {"current_qty": 5,   "avg_daily_demand": 15, "lead_time_days": 10,"safety_stock": 30, "reorder_point": 80, "days_since_last_reorder": 60, "demand_std": 6, "stockout_occurred": 1},
    {"current_qty": 300, "avg_daily_demand": 8,  "lead_time_days": 3, "safety_stock": 20, "reorder_point": 50, "days_since_last_reorder": 2,  "demand_std": 1, "stockout_occurred": 0},
    {"current_qty": 40,  "avg_daily_demand": 11, "lead_time_days": 6, "safety_stock": 25, "reorder_point": 70, "days_since_last_reorder": 20, "demand_std": 3, "stockout_occurred": 0},
    {"current_qty": 2,   "avg_daily_demand": 14, "lead_time_days": 8, "safety_stock": 25, "reorder_point": 70, "days_since_last_reorder": 55, "demand_std": 7, "stockout_occurred": 1}
  ]'
```

Expected:
```json
{
  "status": "trained",
  "n_samples": 6,
  "cv_roc_auc_mean": 0.91,
  "model_path": "..."
}
```

### 3.5 Predict Stockout Risk for a SKU

After training, predict the probability of running out of stock:

```bash
curl -X POST http://localhost:8000/alerts/stockout-risk \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "<SKU_ID>",
    "current_qty": 8,
    "avg_daily_demand": 12,
    "lead_time_days": 5,
    "safety_stock": 20,
    "reorder_point": 50,
    "days_since_last_reorder": 35,
    "demand_std": 3
  }'
```

Expected:
```json
{
  "sku_id": "...",
  "stockout_probability": 0.87,
  "risk_level": "high",
  "message": "87.0% estimated stockout probability."
}
```

---

## 4. Demand Forecasting — LightGBM & ETS

### 4.1 Upload a CSV Dataset

Your CSV must have at least a date column and a numeric demand column.

```bash
curl -X POST http://localhost:8000/upload \
  -F "file=@/path/to/your/demand_data.csv"
```

Save the returned `file_path` from the response as `<DATA_PATH>`.

### 4.2 Run Full Forecast (Train + Predict)

```bash
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "data_path": "<DATA_PATH>",
    "duration": "3_months",
    "feature_select": true,
    "history_days": 90,
    "n_bootstrap": 100
  }'
```

Duration options: `"3_months"`, `"6_months"`, `"12_months"`

### 4.3 Train Only

```bash
curl -X POST http://localhost:8000/forecast/train \
  -H "Content-Type: application/json" \
  -d '{
    "data_path": "<DATA_PATH>",
    "feature_select": true
  }'
```

### 4.4 Predict Only (requires prior training)

```bash
curl -X POST http://localhost:8000/forecast/predict \
  -H "Content-Type: application/json" \
  -d '{
    "data_path": "<DATA_PATH>",
    "horizon": 90,
    "history_days": 90,
    "n_bootstrap": 100
  }'
```

### 4.5 Retrieve Forecast Results

```bash
curl http://localhost:8000/forecast/results/3_months
# or
curl http://localhost:8000/forecast/results/3m
```

---

## 5. Swagger UI (Easiest Way to Test)

Open `http://localhost:8000/docs` in your browser.

Every endpoint is listed with:
- Request schema with field descriptions
- A **"Try it out"** button that lets you fill in values and run the request directly
- Live response display

This is the fastest way to explore and test without writing curl commands.

---

## Recommended Test Order

```
1. POST /inventory/skus          → create a product
2. POST /inventory/suppliers     × 2 → create two suppliers
3. POST /inventory/suppliers/link → link both to the SKU
4. POST /inventory/stock         → set a LOW quantity (below ROP)
5. POST /optimization/analyze    → calculate SS, ROP, EOQ
6. GET  /optimization/decisions  → see REORDER decision triggered
7. POST /optimization/select-supplier → pick best supplier
8. POST /alerts/check            → generate threshold alerts
9. GET  /alerts                  → view alerts
10. POST /alerts/train           → train stockout model
11. POST /alerts/stockout-risk   → predict risk for the low-stock SKU
12. POST /alerts/{id}/resolve    → resolve the alert after reordering
```
