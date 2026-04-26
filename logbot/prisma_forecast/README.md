# PRISMA - Predictive Resource Intelligence & Supply Chain Management using AI

**AI-Powered Demand Forecasting System with LLM-Driven Data Adaptation**

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![LightGBM](https://img.shields.io/badge/ML-LightGBM-green.svg)](https://lightgbm.readthedocs.io/)
[![Ollama](https://img.shields.io/badge/LLM-Ollama%20%2B%20Mistral%207B-orange.svg)](https://ollama.ai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [How PRISMA Works](#-how-prisma-works)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Detailed Usage](#-detailed-usage)
- [Understanding the Pipeline](#-understanding-the-pipeline)
- [Project Structure](#-project-structure)
- [Configuration & Tuning](#-configuration--tuning)
- [Troubleshooting](#-troubleshooting)
- [Known Limitations](#-known-limitations)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**PRISMA** is an intelligent demand forecasting system that combines the power of **Large Language Models (LLMs)** with **Machine Learning** to predict material demand in supply chain environments.

### What Makes PRISMA Different?

Traditional forecasting systems require manual data preprocessing, column mapping, and feature engineering. **PRISMA eliminates this friction** by using an LLM to automatically understand your dataset structure, identify relevant columns and features, and prepare data for forecasting.

### 🆕 Latest Innovation: Fully LLM-Driven Feature Discovery

PRISMA now uses **100% LLM-driven feature identification** with zero hardcoded mappings:
- **Samples 100 random rows** from your dataset for intelligent analysis
- **LLM analyzes actual data** (not just column names) to identify relevant features
- **Classifies features intelligently**: categorical, numeric, boolean
- **Hybrid approach**: Combines LLM intelligence with auto-detection for robustness
- **No dictionary mappings**: Adapts to any dataset structure automatically

### The Problem PRISMA Solves

Supply chain datasets come in countless formats:
- Different column names (`Order_Date` vs `transaction_date` vs `timestamp`)
- Various quantity fields (`qty`, `demand`, `units_sold`, `quantity_used`)
- Inconsistent data types and formats
- Manual preprocessing takes hours or days

**PRISMA's Solution:** Feed any CSV dataset → LLM identifies columns → ML model forecasts demand. **No manual preprocessing required.**

---

## 🧠 How PRISMA Works

PRISMA uses a **two-stage intelligent pipeline**:

### Stage 1: LLM-Powered Feature Discovery (Smart Part) 🆕
1. **Sample 100 random rows** from your dataset
2. **LLM (Mistral 7B)** analyzes column names, data types, and sample values
3. **Automatically identifies**:
   - Which column represents **date/time**
   - Which column represents **quantity/demand** (target variable)
   - **Categorical features** (region, material, supplier, project type, etc.)
   - **Numeric features** (prices, costs, distances, lead times, etc.)
   - **Boolean features** (is_weekend, is_holiday, flags, etc.)
4. **Renames columns** to standardized names (`date`, `quantity_used`)
5. **Validates and converts** data types
6. **Guides feature engineering** with intelligent feature classification

### Stage 2: ML-Powered Forecasting (Prediction Part)
1. **Feature Engineering**: Creates temporal features using LLM-identified features
2. **Dimensionality Reduction**: Selects optimal features using Mutual Information + LightGBM importance
3. **Data Splitting**: Train → Test → Validate → Predict
4. **Model Training**: LightGBM gradient boosting on selected features
5. **Iterative Forecasting**: Generates multi-day predictions

---

## ✨ Key Features

### 🤖 LLM Integration (🆕 Fully LLM-Driven)
- **Intelligent Feature Discovery**: LLM identifies ALL relevant features (not just date/quantity)
- **No Dictionary Mappings**: Zero hardcoded feature mappings - 100% LLM-driven
- **Automatic Feature Classification**: Categorizes features as categorical/numeric/boolean
- **Hybrid Approach**: Combines LLM intelligence with auto-detection for robustness
- **Format Agnostic**: Works with any CSV structure
- **Intelligent Reasoning**: LLM provides confidence scores and reasoning
- **Local Inference**: Uses Ollama (runs offline, no API costs)

### 📊 Machine Learning
- **LightGBM**: Fast gradient boosting for accurate predictions
- **Per-Group Forecasting**: Train separate models for each material/region/category
- **Enhanced Temporal Features**: Cyclic seasonality encoding (sin/cos transformations)
- **Change-Based Indicators**: Diff features for capturing trends
- **Feature Selection**: Mutual Information + Gain-based importance scoring
- **Dimensionality Reduction**: Automatically selects top N features
- **Prophet-Free**: Lightweight forecasting without Prophet dependency
- **Robust Validation**: Train/test/validation splits with early stopping

### 🔧 Data Processing
- **Multi-Format Support**: CSV, XLSX, XLS
- **Robust Date Parsing**: Handles multiple date formats automatically
- **Missing Value Handling**: Intelligent imputation strategies
- **Categorical Encoding**: Automatic encoding for non-numeric features

### 📈 Forecasting
- **Iterative Prediction**: Multi-step forecasting with dynamic feature updates
- **Bootstrap Ensemble**: Confidence intervals (y_lower, y_upper) via bootstrap sampling
- **Per-Group Forecasting**: Separate forecasts per material/region with automatic aggregation
- **Flexible Horizons**: Forecast 7, 14, 30, 60+ days ahead
- **Multiple Output Formats**: JSON and CSV exports
- **Comprehensive Metrics**: MAE, RMSE, MAPE, R² scores

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INPUT (CSV/XLSX)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              STAGE 1: LLM DATA ADAPTATION                   │
├─────────────────────────────────────────────────────────────┤
│  1. Sample 100 random rows                                  │
│  2. Ollama + Mistral 7B analyzes structure                  │
│  3. Identifies date & quantity columns                      │
│  4. Renames to standardized names                           │
│  5. Validates & converts data types                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           STAGE 2: FEATURE SELECTION (OPTIONAL)             │
├─────────────────────────────────────────────────────────────┤
│  1. Mutual Information scoring                              │
│  2. LightGBM importance (gain)                              │
│  3. Select top N features                                   │
│  4. Reduce dimensionality                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              STAGE 3: ML MODEL TRAINING                     │
├─────────────────────────────────────────────────────────────┤
│  1. Split: Train / Test / Validate                          │
│  2. Train LightGBM on selected features                     │
│  3. Early stopping on validation set                        │
│  4. Save model + encoders + metadata                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              STAGE 4: FORECASTING                           │
├─────────────────────────────────────────────────────────────┤
│  1. Load trained model                                      │
│  2. Generate iterative predictions                          │
│  3. Export JSON + CSV forecasts                             │
│  4. Display metrics & forecast table                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Installation

### Prerequisites

- **Python 3.12+** (recommended: 3.12 or 3.13)
- **Ollama** (for LLM inference)
- **Windows/Linux/macOS** (tested on Windows 11)

### Step 1: Install Ollama

Ollama is required for LLM-based column identification.

**Windows/Mac/Linux:**
```bash
# Download from https://ollama.ai/
# Or use package manager:

# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
```

**Pull Mistral 7B model:**
```bash
ollama pull mistral:7b-instruct
```

**Verify installation:**
```bash
ollama list
# Should show: mistral:7b-instruct
```

### Step 2: Clone Repository

```bash
git clone <repository-url>
cd prisma_forecast
```

### Step 3: Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv312

# Activate virtual environment
# Windows:
.\venv312\Scripts\activate

# Linux/Mac:
source venv312/bin/activate
```

### Step 4: Install Python Dependencies

```bash
pip install -r requirements.txt
```

**Dependencies installed:**
- `pandas>=2.0.0` - Data manipulation
- `numpy>=1.24.0` - Numerical computing
- `scikit-learn>=1.3.0` - ML utilities
- `lightgbm>=4.0.0` - Gradient boosting (primary forecasting model)
- `openpyxl>=3.1.0` - Excel file support
- `joblib>=1.3.0` - Model serialization
- `ollama>=0.1.0` - LLM inference
- `requests>=2.31.0` - HTTP client

**Note:** Prophet is **not required**. PRISMA uses lightweight cyclic encoding for seasonality instead.

### Step 5: Verify Installation

```bash
python src/cli_new.py --help
```

You should see the PRISMA CLI help message.

---

## 🎯 Quick Start

### Training a Model

Train PRISMA on your dataset with automatic column detection:

```bash
python src/cli_new.py train --data data/your_dataset.csv --feature-select
```

**What happens:**
1. 🤖 LLM samples 100 rows and identifies date/quantity columns + ALL relevant features
2. 🧠 LLM classifies features as categorical/numeric/boolean
3. ✅ Validates data types and converts them
4. 🔧 Creates temporal features using LLM-identified features
5. 🎯 Selects optimal features using dimensionality reduction
6. 🤖 Trains LightGBM model
7. 💾 Saves model to `saved_models/`
8. 📊 Displays performance metrics

**Example output:**
```
================================================================

   PRISMA - Predictive Resource Intelligence & Supply Chain
            Management using AI

   LLM-Driven ML Pipeline for Demand Forecasting

================================================================

======================================================================
 STARTING LLM-DRIVEN TRAINING PIPELINE
======================================================================

 Step 1/6: Loading data from data/supply_chain.csv
----------------------------------------------------------------------
 ✓ Data loaded: 8523 rows, 24 columns

 Step 2/6: LLM column identification
----------------------------------------------------------------------
🤖 LLM FEATURE IDENTIFICATION (Ollama + Mistral 7B)
======================================================================

🔬 Sampled 100 random rows for LLM analysis

📦 Available models: mistral:7b-instruct, llama2:latest

📊 Analyzing 100 rows with 24 columns...
🧠 Calling Mistral 7B Instruct...
📝 Parsing LLM response...

✅ LLM Identification Complete:
   Date column: 'Order Date'
   Quantity column: 'Order Quantity'
   Categorical features: 5 features (region, material, supplier, project_type, material_unit)
   Numeric features: 15 features (unit_price, total_cost, lead_time_days, etc.)
   Boolean features: 2 features (is_urgent, is_local_supplier)
   Confidence: high
   Reasoning: Order Date contains datetime values, Order Quantity is numeric demand

🔄 Renaming columns...
   'Order Date' → 'date'
   'Order Quantity' → 'quantity_used'

 ✓ Columns identified and renamed

 Step 3/6: Validating datatypes
----------------------------------------------------------------------
 ✓ Data validated: 8523 rows, 24 columns

...

✅ TRAINING COMPLETED SUCCESSFULLY!
```

### Generating Forecasts

Generate a 30-day forecast using the trained model:

```bash
python src/cli_new.py predict --input data/recent_data.csv --horizon 30
```

**Output:**
- `forecasts/forecast_30d.json` - JSON format with metadata
- `forecasts/forecast_30d.csv` - CSV format for Excel

---

## 📚 Detailed Usage

### Training Command

```bash
python src/cli_new.py train --data <path> [OPTIONS]
```

**Required Arguments:**
- `--data PATH` - Path to training dataset (CSV or XLSX)

**Optional Arguments:**
- `--feature-select` - Enable dimensionality reduction (recommended)
- `--top-n N` - Number of top features to select (default: 30)
- `--group-by COLUMNS` - Train separate models per group (e.g., "material" or "material,region")

**Examples:**

```bash
# Basic training (uses all features)
python src/cli_new.py train --data data/supply_chain.csv

# Training with feature selection (recommended)
python src/cli_new.py train --data data/supply_chain.csv --feature-select

# Training with custom feature count
python src/cli_new.py train --data data/supply_chain.csv --feature-select --top-n 20

# 🆕 Per-group training (train separate model for each material)
python src/cli_new.py train --data data/supply_chain.csv --group-by material --feature-select

# 🆕 Multi-level grouping (train separate model for each material-region combination)
python src/cli_new.py train --data data/supply_chain.csv --group-by material,region --feature-select
```

### Prediction Command

```bash
python src/cli_new.py predict --input <path> [OPTIONS]
```

**Required Arguments:**
- `--input PATH` - Path to recent history data (CSV or XLSX)

**Optional Arguments:**
- `--horizon N` - Forecast horizon in days (default: 30)
- `--output PATH` - Custom output path (without extension)
- `--history-days N` - Number of recent days to use per group (default: 90)
- `--n-bootstrap N` - Number of bootstrap iterations for confidence intervals (default: 100)

**Examples:**

```bash
# Generate 7-day forecast
python src/cli_new.py predict --input data/recent.csv --horizon 7

# Generate 60-day forecast
python src/cli_new.py predict --input data/recent.csv --horizon 60

# Custom output location
python src/cli_new.py predict --input data/recent.csv --horizon 30 --output results/my_forecast

# 🆕 Bootstrap ensemble with custom parameters
python src/cli_new.py predict --input data/recent.csv --horizon 30 --history-days 120 --n-bootstrap 200
```

---

## 🔍 Understanding the Pipeline

### 1. LLM Column Identification

**How it works (🆕 Enhanced with Full Feature Discovery):**
1. **Samples 100 random rows** from your dataset for intelligent analysis
2. **Extracts metadata** for each column:
   - Data type (int, float, string, datetime)
   - Sample values (first 5 rows)
   - Null count
   - Unique value count
3. **Sends metadata to Mistral 7B** with a structured prompt asking for:
   - Date/time column identification
   - Quantity/demand column identification
   - **Categorical feature classification** (region, material, supplier, etc.)
   - **Numeric feature classification** (prices, costs, lead times, etc.)
   - **Boolean feature classification** (flags, indicators, etc.)
4. **LLM returns comprehensive JSON** with all identified features:
   ```json
   {
     "date_column": "Order Date",
     "quantity_column": "Order Quantity",
     "categorical_features": ["region", "material", "supplier", "project_type"],
     "numeric_features": ["unit_price", "total_cost", "lead_time_days"],
     "boolean_features": ["is_urgent", "is_local_supplier"],
     "confidence": "high",
     "reasoning": "Order Date contains datetime values..."
   }
   ```
5. **Renames columns** to standardized names
6. **Guides feature engineering** using LLM-identified feature classifications
7. **Hybrid validation**: Combines LLM intelligence with auto-detection for robustness

**Why this matters:**
- **100% LLM-driven** - Zero hardcoded feature mappings
- Works with **any dataset format**
- **Intelligent feature classification** - LLM understands feature semantics
- No manual column mapping or feature engineering
- Handles ambiguous column names intelligently
- **Adapts to new datasets automatically**

### 2. Feature Selection (Dimensionality Reduction)

**Why feature selection?**
- Reduces overfitting
- Improves model generalization
- Faster training and prediction
- Removes noisy/irrelevant features

**How PRISMA selects features:**

1. **Mutual Information (MI)** - Measures statistical dependency between features and target
2. **LightGBM Gain** - Measures feature importance during tree splits
3. **Combined Score** - Weighted average: `0.5 × Gain + 0.3 × MI + 0.2 × Permutation`
4. **Top-K Selection** - Selects top N features by combined score

**Example output:**
```
[*] Selecting top 30 features...
   [OK] Selected 30 features
   [*] Top 10 features:
        1. month                          (combined: 0.9823, gain: 0.9654)
        2. quarter                        (combined: 0.8912, gain: 0.8734)
        3. day_of_week                    (combined: 0.7654, gain: 0.7123)
        4. supplier                       (combined: 0.6543, gain: 0.6234)
        5. material_unit                  (combined: 0.5432, gain: 0.5123)
        ...
```

### 3. Model Training

**LightGBM Configuration:**
```python
{
  'objective': 'regression',
  'metric': 'rmse',
  'boosting_type': 'gbdt',
  'num_leaves': 31,
  'learning_rate': 0.05,
  'feature_fraction': 0.9,
  'bagging_fraction': 0.8,
  'bagging_freq': 5
}
```

**Training process:**
1. Split data: 80% train, 20% validation
2. Train for max 500 rounds
3. Early stopping if validation RMSE doesn't improve for 50 rounds
4. Save best model

**Performance metrics:**
- **MAE** (Mean Absolute Error) - Average prediction error
- **RMSE** (Root Mean Squared Error) - Penalizes large errors
- **MAPE** (Mean Absolute Percentage Error) - Error as percentage
- **R²** (R-squared) - Proportion of variance explained (0-1, higher is better)

### 4. Per-Group Forecasting (🆕 New Feature)

**What is per-group forecasting?**

Instead of training a single model on aggregated data, PRISMA can train **separate models for each group** (e.g., each material, each region, or each material-region combination). This provides:

- **Better accuracy** - Each group has unique demand patterns
- **Realistic variance** - Forecasts vary across time and groups
- **Granular insights** - Understand demand per material/region
- **Unified output** - All group forecasts aggregated into one file

**How it works:**

1. **Training**: `--group-by material` trains 10 separate models (one per material)
2. **Prediction**: Generates forecasts for each group independently
3. **Aggregation**: Combines all group forecasts using sum/mean/median
4. **Output**: Both unified forecast and individual group forecasts

**Example:**

```bash
# Train separate model for each material
python src/cli_new.py train --data data/prisma_dataset.csv --group-by material --feature-select

# Output:
# ✓ Trained 10 per-group models:
#   - material=cement_opc_53 (R²=0.9897, RMSE=2.58)
#   - material=steel_rods_tmt (R²=0.9924, RMSE=0.71)
#   - material=aggregate_20mm (R²=0.9893, RMSE=2.88)
#   ...

# Generate forecasts
python src/cli_new.py predict --input data/prisma_dataset.csv --horizon 30

# Output files:
# - forecasts/forecast_unified_30d.json (aggregated forecast)
# - forecasts/forecast_unified_30d.csv (aggregated CSV)
# - forecasts/forecast_material=cement_opc_53_30d.json (individual)
# - forecasts/forecast_material=steel_rods_tmt_30d.json (individual)
# - ... (one file per group)
```

**When to use per-group forecasting:**

✅ **Use when:**
- Dataset has multiple categories (materials, regions, products)
- Each category has distinct demand patterns
- You need granular forecasts per category
- Aggregated forecasts are too flat/constant

❌ **Don't use when:**
- Dataset is already filtered to single category
- Very few samples per group (<50 rows)
- Groups have identical patterns

### 5. Bootstrap Ensemble for Confidence Intervals (🆕 New Feature)

**What is bootstrap ensemble?**

PRISMA uses **bootstrap sampling** to generate confidence intervals for forecasts. Instead of a single prediction, you get:

- **y_hat** - Mean prediction across bootstrap iterations
- **y_lower** - 5th percentile (lower confidence bound)
- **y_upper** - 95th percentile (upper confidence bound)

**How it works:**

1. **Sample with replacement**: For each bootstrap iteration, randomly sample from the last N days of history
2. **Generate forecast**: Run iterative forecasting for each bootstrap sample
3. **Aggregate**: Compute mean (y_hat) and percentiles (y_lower, y_upper) across all iterations
4. **Update features**: Lag and rolling features are updated iteratively per group

**Example output:**

```json
{
  "date": "2024-02-19",
  "y_hat": 14.695,
  "y_lower": 14.519,
  "y_upper": 14.759,
  "lgb_prediction": 14.695
}
```

**Configuration:**

```bash
# Default: 90 days history, 100 bootstrap iterations
python src/cli_new.py predict --input data.csv --horizon 30

# Custom: 120 days history, 200 bootstrap iterations (more accurate but slower)
python src/cli_new.py predict --input data.csv --horizon 30 --history-days 120 --n-bootstrap 200

# Fast: 60 days history, 50 bootstrap iterations (faster but less accurate)
python src/cli_new.py predict --input data.csv --horizon 30 --history-days 60 --n-bootstrap 50
```

**When to use:**

✅ **Use when:**
- You need uncertainty quantification
- Risk assessment is important
- Planning requires confidence intervals
- Forecasts are used for decision-making

**Trade-offs:**

- **More bootstrap iterations** = More accurate confidence intervals but slower
- **More history days** = Better context but may include outdated patterns
- **Fewer iterations** = Faster but wider/less reliable confidence intervals

### 6. Enhanced Temporal Features (🆕 New Feature)

**Cyclic Seasonality Encoding:**

PRISMA uses **sin/cos transformations** to capture periodic patterns without Prophet:

```python
# Month cyclic features (12-month cycle)
month_sin = sin(2π × month / 12)
month_cos = cos(2π × month / 12)

# Week cyclic features (52-week cycle)
week_sin = sin(2π × week / 52)
week_cos = cos(2π × week / 52)

# Day of week cyclic features (7-day cycle)
day_of_week_sin = sin(2π × day_of_week / 7)
day_of_week_cos = cos(2π × day_of_week / 7)
```

**Why cyclic encoding?**
- Captures seasonality without Prophet dependency
- Lightweight and fast
- Works on Windows (no cmdstanpy issues)
- Preserves circular nature of time (December → January)

**Change-Based Indicators:**

PRISMA creates diff features to capture trends:

```python
quantity_used_diff = quantity_used[t] - quantity_used[t-1]
economic_indicator_diff = economic_indicator[t] - economic_indicator[t-1]
market_price_index_diff = market_price_index[t] - market_price_index[t-1]
```

**Enhanced Lag Features:**

Extended lag periods for better temporal context:
- `lag_1, lag_3, lag_5, lag_7, lag_14, lag_30` (previously: lag_1, lag_7, lag_14, lag_30)

**Rolling Statistics:**

- `rolling_mean_7, rolling_mean_14, rolling_mean_30`
- `rolling_std_7, rolling_std_14, rolling_std_30`

### 6. Iterative Forecasting

**Iterative prediction:**
1. Start with last known date in dataset
2. For each future day:
   - Extract features from recent history
   - Predict quantity using LightGBM
   - Append prediction to history
   - Move to next day
3. Repeat for N days (horizon)

**Output formats:**

**JSON** (`forecast_30d.json`):
```json
{
  "metadata": {
    "forecast_horizon": 30,
    "generated_at": "2025-11-08T14:30:00",
    "model": "LightGBM",
    "last_known_date": "2024-12-31",
    "first_forecast_date": "2025-01-01"
  },
  "statistics": {
    "mean_forecast": 245.67,
    "min_forecast": 198.23,
    "max_forecast": 312.45,
    "std_forecast": 28.91
  },
  "predictions": [
    {"date": "2025-01-01", "predicted_quantity": 245.67},
    {"date": "2025-01-02", "predicted_quantity": 251.23},
    ...
  ]
}
```

**CSV** (`forecast_30d.csv`):
```csv
date,predicted_quantity
2025-01-01,245.67
2025-01-02,251.23
2025-01-03,248.91
...
```

---

## 📁 Project Structure

```
prisma_forecast/
├── README.md                 # This file
├── requirements.txt          # Python dependencies
├── data/                     # Training datasets
│   ├── DataCoSupplyChainDataset.csv
│   ├── dummy_different_format.csv
│   └── dummy_similar_prisma.csv
├── src/                      # Source code
│   ├── cli_new.py           # Main CLI entry point
│   ├── llm_ollama.py        # LLM column identification
│   ├── data_utils.py        # Data loading & validation
│   ├── feature_select.py    # Feature selection logic
│   ├── features.py          # Feature engineering (if used)
│   ├── models.py            # LightGBM training
│   ├── predictor.py         # Forecasting logic
│   ├── evaluate.py          # Metrics & evaluation
│   ├── save_load.py         # Model serialization
│   └── ensemble.py          # Ensemble methods (future)
├── saved_models/            # Trained models (generated)
│   ├── lightgbm_model.txt
│   ├── encoders.pkl
│   ├── feature_names.json
│   └── metadata.json
├── forecasts/               # Forecast outputs (generated)
│   ├── forecast_7d.json
│   ├── forecast_7d.csv
│   ├── forecast_30d.json
│   └── forecast_30d.csv
└── tests/                   # Unit tests (future)
```

**Key Files Explained:**

- **`cli_new.py`** - Main entry point, orchestrates the entire pipeline
- **`llm_ollama.py`** - Handles LLM communication with Ollama for column identification
- **`data_utils.py`** - Data loading, validation, preprocessing, and aggregation
- **`feature_select.py`** - Mutual Information + LightGBM importance scoring
- **`models.py`** - LightGBM model training with early stopping
- **`predictor.py`** - Iterative forecasting logic
- **`save_load.py`** - Model serialization and deserialization

---

## ⚙️ Configuration & Tuning

### LLM Configuration

**Change LLM model:**

Edit `src/llm_ollama.py`:
```python
# Line 45
def call_ollama(prompt: str, model: str = "mistral:7b-instruct"):
    # Change to:
    model: str = "llama2:latest"  # or any Ollama model
```

**Adjust LLM temperature:**
```python
# Line 63
"temperature": 0.1,  # Lower = more deterministic, Higher = more creative
```

### Feature Selection Tuning

**Change number of features:**
```bash
python src/cli_new.py train --data data.csv --feature-select --top-n 20
```

**Adjust feature scoring weights:**

Edit `src/feature_select.py`:
```python
# Line 224
combined_scores = 0.5 * gain_scores + 0.3 * mi_scores + 0.2 * perm_scores
# Adjust weights to prioritize different metrics
```

### Model Hyperparameters

Edit `src/models.py`:
```python
# Lines 73-84
params = {
    'objective': 'regression',
    'metric': 'rmse',
    'num_leaves': 31,        # Increase for more complex models
    'learning_rate': 0.05,   # Decrease for better accuracy (slower)
    'feature_fraction': 0.9, # Feature sampling per tree
    'bagging_fraction': 0.8, # Row sampling per iteration
    'bagging_freq': 5,       # Bagging frequency
}
```

**Early stopping:**
```python
# Line 98
lgb.early_stopping(stopping_rounds=50)  # Increase for more patience
```

---

## 🐛 Troubleshooting

### Issue: Ollama not running

**Error:**
```
RuntimeError: Ollama is not running. Please start Ollama service.
```

**Solution:**
```bash
# Start Ollama service
ollama serve

# In another terminal, verify:
ollama list
```

### Issue: Mistral model not found

**Error:**
```
RuntimeError: Mistral model not found. Please pull it first.
```

**Solution:**
```bash
ollama pull mistral:7b-instruct
```

### Issue: Flat predictions (all values similar)

**Symptoms:**
- Predictions vary only slightly (e.g., 245.2, 245.3, 245.4)
- Low variance in forecast

**Causes:**
1. **Static features dominate** - Categorical features (supplier, material) have more importance than temporal features
2. **Aggregated data** - Daily totals flatten temporal patterns
3. **Weak autocorrelation** - Past demand doesn't predict future demand well

**Solutions (🆕 Updated):**
1. **✅ Use per-group forecasting** - Train separate models per material/region:
   ```bash
   python src/cli_new.py train --data data.csv --group-by material --feature-select
   ```
2. **✅ Enhanced temporal features** - PRISMA now includes:
   - Cyclic seasonality encoding (sin/cos transformations)
   - Extended lag features (lag_1, lag_3, lag_5, lag_7, lag_14, lag_30)
   - Change-based indicators (diff features)
   - Rolling statistics (mean, std for windows 7, 14, 30)
3. **Check feature importance** - Ensure temporal features rank high
4. **Increase forecast horizon** - Longer horizons may show more variance

### Issue: Poor model performance (low R²)

**Symptoms:**
- R² < 0.5
- High MAPE (>50%)

**Solutions:**
1. **Enable feature selection**: `--feature-select`
2. **Increase training data** - More historical data improves accuracy
3. **Check data quality** - Remove outliers, handle missing values
4. **Tune hyperparameters** - Adjust `num_leaves`, `learning_rate`

### Issue: Out of memory

**Error:**
```
MemoryError: Unable to allocate array
```

**Solutions:**
1. **Reduce feature count**: `--top-n 15`
2. **Sample data** - Use subset of training data
3. **Reduce `num_leaves`** in LightGBM config

---

## ⚠️ Known Limitations

### Current Limitations

1. **✅ RESOLVED: Automated Feature Engineering**
   - ~~PRISMA does **not** automatically create lag features, rolling averages, or time-based features~~
   - **Now includes**: Automatic lag features, rolling statistics, cyclic seasonality, and change-based indicators
   - No manual feature engineering required

2. **✅ RESOLVED: Single Target Variable**
   - ~~Forecasts only one quantity column at a time~~
   - ~~Cannot forecast multiple materials simultaneously~~
   - **Now supports**: Per-group forecasting with `--group-by` flag
   - Train separate models for each material/region and aggregate forecasts

3. **✅ RESOLVED: Flat Predictions Issue**
   - ~~When categorical features dominate, predictions may be too constant~~
   - **Now fixed**: Per-group forecasting + enhanced temporal features provide realistic variance

4. **✅ RESOLVED: No Seasonality Detection**
   - ~~Does not automatically detect seasonal patterns (weekly, monthly, yearly)~~
   - **Now includes**: Cyclic seasonality encoding (sin/cos transformations for month, week, day_of_week)
   - Captures periodic patterns without Prophet dependency

5. **Local LLM Required**
   - Requires Ollama running locally
   - No cloud LLM support (OpenAI, Anthropic, etc.)
   - Requires ~4GB RAM for Mistral 7B model

6. **Limited to Tabular Data**
   - Only works with CSV/XLSX files
   - No support for time series databases, APIs, or streaming data

### Future Enhancements

- [x] ✅ Automated feature engineering (lag, rolling, seasonal decomposition)
- [x] ✅ Multi-material forecasting (per-group predictions)
- [x] ✅ Seasonality detection and decomposition (cyclic encoding)
- [x] ✅ Bootstrap ensemble for confidence intervals (y_lower, y_upper)
- [ ] Cloud LLM support (OpenAI GPT-4, Anthropic Claude)
- [ ] Web UI for easier interaction
- [ ] Real-time forecasting API (REST/GraphQL)
- [ ] Model explainability (SHAP values, feature importance plots)
- [ ] Support for ARIMA, Neural Networks (Prophet removed - not needed)
- [ ] Automated hyperparameter tuning (Optuna, Hyperopt)
- [ ] Advanced ensemble methods (stacking, blending)

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test your changes**
   ```bash
   python src/cli_new.py train --data data/test.csv --feature-select
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Areas for Contribution

**High Priority:**
- Automated feature engineering (lag, rolling, seasonal)
- Multi-material forecasting support
- Model explainability (SHAP, LIME)
- Web UI development (Streamlit, Gradio)

**Medium Priority:**
- Additional ML models (Prophet, ARIMA, LSTM)
- Cloud LLM support (OpenAI, Anthropic)
- Automated hyperparameter tuning
- Performance optimization

**Low Priority:**
- Documentation improvements
- Unit tests and integration tests
- Code refactoring
- Bug fixes

### Code Style

- Follow PEP 8 style guide
- Use type hints where possible
- Add docstrings to all functions
- Keep functions small and focused

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 PRISMA Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 📞 Support & Contact

### Getting Help

**For questions, issues, or feature requests:**
- 🐛 **Bug Reports**: [Open an issue on GitHub](https://github.com/your-repo/issues)
- 💡 **Feature Requests**: [Open a feature request](https://github.com/your-repo/issues/new?template=feature_request.md)
- 📖 **Documentation**: Check the [Troubleshooting](#-troubleshooting) section
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

### Frequently Asked Questions

**Q: Can PRISMA work without Ollama?**
A: No, Ollama is required for LLM-based column identification. However, you could modify the code to use cloud LLMs (OpenAI, Anthropic) if needed.

**Q: Why are my predictions flat?**
A: ✅ **RESOLVED!** Use per-group forecasting with `--group-by material` to train separate models per material/region. This provides realistic variance. See [Troubleshooting: Flat predictions](#issue-flat-predictions-all-values-similar) for details.

**Q: Can I forecast multiple materials at once?**
A: ✅ **YES!** Use per-group forecasting:
```bash
python src/cli_new.py train --data data.csv --group-by material --feature-select
python src/cli_new.py predict --input data.csv --horizon 30
```
This trains separate models for each material and aggregates forecasts into one unified output.

**Q: How much data do I need?**
A: Minimum 100 rows, but 1000+ rows recommended for good accuracy. More data = better predictions.

**Q: Can I use this for non-supply chain forecasting?**
A: Yes! PRISMA works for any time series forecasting task (sales, demand, traffic, etc.) as long as you have date and quantity columns.

---

## 🎓 Learn More

### Recommended Reading

**Machine Learning:**
- [LightGBM Documentation](https://lightgbm.readthedocs.io/)
- [Gradient Boosting Explained](https://explained.ai/gradient-boosting/)
- [Feature Selection Techniques](https://scikit-learn.org/stable/modules/feature_selection.html)

**Time Series Forecasting:**
- [Forecasting: Principles and Practice](https://otexts.com/fpp3/)
- [Time Series Analysis with Python](https://www.machinelearningplus.com/time-series/time-series-analysis-python/)

**LLMs:**
- [Ollama Documentation](https://ollama.ai/docs)
- [Mistral AI](https://mistral.ai/)

---

## 🏆 Acknowledgments

**PRISMA** was built using these amazing open-source projects:

- **[LightGBM](https://github.com/microsoft/LightGBM)** - Fast gradient boosting framework
- **[Ollama](https://ollama.ai/)** - Local LLM inference
- **[Mistral AI](https://mistral.ai/)** - Open-source LLM
- **[scikit-learn](https://scikit-learn.org/)** - Machine learning utilities
- **[pandas](https://pandas.pydata.org/)** - Data manipulation
- **[NumPy](https://numpy.org/)** - Numerical computing

Special thanks to the open-source community for making this project possible.

---

## 📊 Project Status

**Current Version:** 1.0.0 (Beta)

**Status:** Active Development

**Last Updated:** November 2025

---

**Built with ❤️ by the PRISMA Team**

*Empowering supply chains with AI-driven forecasting*

---

### Quick Links

- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)


