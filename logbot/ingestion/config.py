"""Ingestion pipeline constants: column mappings, PII list, optimization defaults."""

from pathlib import Path

LOGBOT_ROOT = Path(__file__).parent.parent

# ─── Column mapping (raw CSV → internal names) ────────────────────────────────

COLUMN_RENAMES = {
    'order date (DateOrders)': 'date',
    'Order Item Quantity': 'quantity_used',
    'Product Name': 'sku_name',
    'Category Name': 'category',
    'Department Name': 'department',
    'Order Region': 'region',
    'Shipping Mode': 'shipping_mode',
    'Order Item Product Price': 'unit_price',
    'Days for shipping (real)': 'lead_time_days',
    'Days for shipment (scheduled)': 'lead_time_scheduled',
    'Delivery Status': 'delivery_status',
    'Order Status': 'order_status',
    'Late_delivery_risk': 'late_delivery_risk',
    'Order Item Profit Ratio': 'profit_ratio',
}

PII_COLUMNS = [
    'Customer Email', 'Customer Password',
    'Customer Fname', 'Customer Lname',
    'Customer Street',
]

NOISE_COLUMNS = [
    'Product Description', 'Product Image',
    'Order Zipcode', 'Customer Zipcode',
    'Order Customer Id',
    'Product Status',
    'Latitude', 'Longitude',
]

EXCLUDE_ORDER_STATUSES = {'CANCELED', 'SUSPECTED_FRAUD', 'ON_HOLD'}

# Delivery statuses that count as "on-time" for supplier reliability scoring
RELIABLE_DELIVERY_STATUSES = {'Advance shipping', 'Shipping on time'}

# ─── Inventory optimization defaults ─────────────────────────────────────────

ORDERING_COST = 50.0          # Fixed cost per purchase order (USD)
HOLDING_COST_RATE = 0.25      # Annual holding cost as fraction of unit price
DEFAULT_SERVICE_LEVEL = 0.95
DEFAULT_LEAD_TIME_STD = 1.0   # Days — conservative default when std unavailable
DEFAULT_LEAD_TIME_DAYS = 7    # Fallback when no supplier is linked

# ─── Output paths ─────────────────────────────────────────────────────────────

ML_DATA_DIR = LOGBOT_ROOT / 'prisma_forecast' / 'data'
STOCKOUT_TRAINING_DATA_PATH = LOGBOT_ROOT / 'data' / 'stockout_training_data.json'
