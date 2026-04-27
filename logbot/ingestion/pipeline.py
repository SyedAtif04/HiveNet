"""Top-level orchestrator for the CSV ingestion pipeline."""

import sys
from pathlib import Path

LOGBOT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(LOGBOT_ROOT))

from .preprocessor import load_and_clean, aggregate_daily
from .dataset_generator import write_ml_datasets
from .db_seeder import seed_database, generate_stockout_training_data, save_stockout_training_data
from .optimization_seeder import seed_optimization_params


def run_ingestion_pipeline(csv_path: str, db) -> dict:
    """
    Full ingestion pipeline:
      1. Load & clean raw CSV
      2. Aggregate to daily demand per SKU
      3. Write ML-ready CSVs (train / test / forecast_input)
      4. Seed all logbot DB tables
      5. Compute and store optimization params (ROP, SS, EOQ)
      6. Generate and save stockout classifier training data

    Returns a summary dict suitable for the API response.
    """
    df_clean = load_and_clean(csv_path)
    df_daily = aggregate_daily(df_clean)

    ml_paths = write_ml_datasets(df_daily)
    db_counts = seed_database(df_daily, df_clean, db)
    opt_results = seed_optimization_params(db)
    training_data = generate_stockout_training_data(db)
    training_data_path = save_stockout_training_data(training_data)

    return {
        'status': 'success',
        'rows_processed': len(df_clean),
        'skus_created': db_counts['skus_created'],
        'suppliers_created': db_counts['suppliers_created'],
        'demand_records_inserted': db_counts['demand_records_inserted'],
        'inventory_rows_updated': db_counts['inventory_rows_updated'],
        'optimization_params_written': len(opt_results),
        'ml_datasets': ml_paths,
        'stockout_training_data': training_data_path,
        'stockout_training_records': len(training_data),
    }
