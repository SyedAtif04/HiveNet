"""
Data utilities for PRISMA - Loading, validation, and preprocessing
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, List, Dict, Optional
import warnings


# Define column categories based on user specifications
CATEGORICAL_FEATURES = [
    'project_id', 'region', 'material', 'supplier',
    'supplier_region', 'project_phase', 'project_type', 'season'
]

CONTINUOUS_FEATURES = [
    'unit_price', 'total_cost', 'lead_time_days',
    'temperature', 'rainfall_mm', 'is_weekend', 'is_holiday',
    'year', 'month', 'quarter', 'week',
    'market_price_index', 'economic_indicator',
    'quantity_lag_1', 'quantity_lag_2', 'quantity_lag_4',
    'quantity_rolling_mean_4', 'quantity_rolling_std_4', 'quantity_ewma_4',
    'price_lag_1', 'price_rolling_mean_4'
]

TARGET_COLUMN = 'quantity_used'
TIME_COLUMN = 'date'

# Column name mappings for canonicalization
COLUMN_MAPPINGS = {
    # Date columns
    'date': ['date', 'order_date', 'transaction_date', 'timestamp', 'datetime', 'dt', 'time'],

    # Quantity/demand columns
    'quantity_used': ['quantity_used', 'quantity', 'qty', 'demand', 'order_demand',
                      'sales', 'volume', 'amount', 'units', 'order_quantity'],

    # Product/material columns
    'material': ['material', 'product', 'item', 'product_id', 'item_id', 'sku',
                 'product_name', 'item_name', 'material_name'],

    # Location columns
    'region': ['region', 'location', 'area', 'zone', 'territory', 'district', 'city'],

    # Supplier columns
    'supplier': ['supplier', 'vendor', 'supplier_name', 'vendor_name', 'supplier_id'],

    # Project columns
    'project_id': ['project_id', 'project', 'project_name', 'job_id', 'contract_id'],

    # Price columns
    'unit_price': ['unit_price', 'price', 'cost', 'unit_cost', 'price_per_unit'],
}


def load_dataset(file_path: str, date_col: Optional[str] = None,
                 qty_col: Optional[str] = None) -> pd.DataFrame:
    """
    Load dataset from CSV or XLSX file

    Args:
        file_path: Path to data file
        date_col: Optional explicit date column name
        qty_col: Optional explicit quantity column name

    Returns:
        DataFrame with loaded data
    """
    print(f"   Loading file: {file_path}")

    file_path = Path(file_path)

    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    # Load based on file extension
    try:
        if file_path.suffix.lower() == '.csv':
            # Try multiple encodings
            try:
                df = pd.read_csv(file_path)
            except UnicodeDecodeError:
                try:
                    df = pd.read_csv(file_path, encoding='latin1')
                except UnicodeDecodeError:
                    df = pd.read_csv(file_path, encoding='iso-8859-1')
        elif file_path.suffix.lower() in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_path.suffix}. Use CSV or XLSX.")
    except Exception as e:
        raise ValueError(f"Error loading file: {str(e)}")

    print(f"   ✓ Loaded {len(df):,} rows and {len(df.columns)} columns")

    # Store original column names for reference
    original_columns = df.columns.tolist()
    print(f"   ✓ Original columns: {', '.join(original_columns[:5])}{'...' if len(original_columns) > 5 else ''}")

    return df


def canonicalize_columns(df: pd.DataFrame, date_col: Optional[str] = None,
                        qty_col: Optional[str] = None) -> pd.DataFrame:
    """
    Canonicalize column names to standard PRISMA format
    Maps common variations to expected column names

    Args:
        df: Input DataFrame
        date_col: Optional explicit date column name
        qty_col: Optional explicit quantity column name

    Returns:
        DataFrame with canonicalized column names
    """
    df = df.copy()

    print("   Canonicalizing column names...")

    # Convert all column names to lowercase for matching
    df.columns = df.columns.str.lower().str.strip()

    renamed_cols = {}

    # If explicit columns provided, use them
    if date_col:
        if date_col.lower() in df.columns:
            renamed_cols[date_col.lower()] = TIME_COLUMN

    if qty_col:
        if qty_col.lower() in df.columns:
            renamed_cols[qty_col.lower()] = TARGET_COLUMN

    # Auto-detect and map columns based on COLUMN_MAPPINGS
    for target_col, variations in COLUMN_MAPPINGS.items():
        # Skip if already explicitly mapped
        if target_col in [TIME_COLUMN, TARGET_COLUMN]:
            if date_col and target_col == TIME_COLUMN:
                continue
            if qty_col and target_col == TARGET_COLUMN:
                continue

        # Find matching column
        for col in df.columns:
            if col in [v.lower() for v in variations]:
                if col not in renamed_cols:  # Don't overwrite existing mappings
                    renamed_cols[col] = target_col
                    break

    # Apply renaming
    if renamed_cols:
        df = df.rename(columns=renamed_cols)
        print(f"   ✓ Renamed {len(renamed_cols)} columns:")
        for old, new in renamed_cols.items():
            print(f"      - '{old}' → '{new}'")
    else:
        print(f"   ✓ No column renaming needed")

    return df


def validate_dataset(df: pd.DataFrame, min_rows: int = 30) -> Dict[str, any]:
    """
    Validate dataset quality and completeness

    Args:
        df: DataFrame to validate
        min_rows: Minimum required rows

    Returns:
        Dictionary with validation results
    """
    print("\n   Validating dataset...")

    validation_results = {
        'is_valid': True,
        'warnings': [],
        'errors': []
    }

    # Check 1: Minimum data length
    if len(df) < min_rows:
        validation_results['errors'].append(
            f"Dataset too short: {len(df)} rows (minimum: {min_rows})"
        )
        validation_results['is_valid'] = False
    else:
        print(f"   ✓ Data length: {len(df)} rows (sufficient)")

    # Check 2: Required columns
    if TIME_COLUMN not in df.columns:
        validation_results['errors'].append(f"Missing required column: '{TIME_COLUMN}'")
        validation_results['is_valid'] = False

    if TARGET_COLUMN not in df.columns:
        validation_results['errors'].append(f"Missing required column: '{TARGET_COLUMN}'")
        validation_results['is_valid'] = False

    if validation_results['is_valid']:
        print(f"   ✓ Required columns present: '{TIME_COLUMN}', '{TARGET_COLUMN}'")

    # Check 3: Missing value rates
    if validation_results['is_valid']:
        missing_rates = df.isnull().sum() / len(df) * 100
        high_missing = missing_rates[missing_rates > 50]

        if len(high_missing) > 0:
            for col, rate in high_missing.items():
                validation_results['warnings'].append(
                    f"Column '{col}' has {rate:.1f}% missing values"
                )

        # Check target column missing rate
        if TARGET_COLUMN in df.columns:
            target_missing = missing_rates[TARGET_COLUMN]
            if target_missing > 30:
                validation_results['warnings'].append(
                    f"Target column '{TARGET_COLUMN}' has {target_missing:.1f}% missing values"
                )
            print(f"   ✓ Target missing rate: {target_missing:.1f}%")

    # Check 4: Date range and frequency
    if TIME_COLUMN in df.columns:
        try:
            df[TIME_COLUMN] = pd.to_datetime(df[TIME_COLUMN], format='mixed', dayfirst=False)
            date_range = df[TIME_COLUMN].max() - df[TIME_COLUMN].min()

            print(f"   ✓ Date range: {df[TIME_COLUMN].min()} to {df[TIME_COLUMN].max()}")
            print(f"   ✓ Time span: {date_range.days} days")

            # Check frequency
            if len(df) > 1:
                date_diff = df[TIME_COLUMN].diff().mode()
                if len(date_diff) > 0:
                    freq_days = date_diff[0].days
                    print(f"   ✓ Detected frequency: {freq_days} day(s)")

                    if freq_days > 7:
                        validation_results['warnings'].append(
                            f"Data frequency is {freq_days} days (expected daily data)"
                        )

            # Warn if date range is too short
            if date_range.days < 90:
                validation_results['warnings'].append(
                    f"Date range is only {date_range.days} days (recommend 90+ days for better forecasts)"
                )

        except Exception as e:
            validation_results['errors'].append(f"Error parsing date column: {str(e)}")
            validation_results['is_valid'] = False

    # Print warnings and errors
    if validation_results['warnings']:
        print(f"\n   ⚠ Warnings ({len(validation_results['warnings'])}):")
        for warning in validation_results['warnings']:
            print(f"      - {warning}")

    if validation_results['errors']:
        print(f"\n   ❌ Errors ({len(validation_results['errors'])}):")
        for error in validation_results['errors']:
            print(f"      - {error}")

    if validation_results['is_valid'] and not validation_results['warnings']:
        print(f"\n   ✅ Dataset validation passed!")

    return validation_results


def summarize_data(df: pd.DataFrame) -> None:
    """
    Print comprehensive data summary

    Args:
        df: DataFrame to summarize
    """
    print("\n" + "="*70)
    print("📊 DATA SUMMARY")
    print("="*70)

    # Basic info
    print(f"\n📈 Dataset Overview:")
    print(f"   Total rows: {len(df):,}")
    print(f"   Total columns: {len(df.columns)}")
    print(f"   Memory usage: {df.memory_usage(deep=True).sum() / 1024**2:.2f} MB")

    # Date range
    if TIME_COLUMN in df.columns:
        print(f"\n📅 Time Period:")
        print(f"   Start date: {df[TIME_COLUMN].min()}")
        print(f"   End date: {df[TIME_COLUMN].max()}")
        date_range = df[TIME_COLUMN].max() - df[TIME_COLUMN].min()
        print(f"   Duration: {date_range.days} days ({date_range.days/30:.1f} months)")
        print(f"   Data points: {len(df):,}")

    # Target variable statistics
    if TARGET_COLUMN in df.columns:
        print(f"\n🎯 Target Variable ('{TARGET_COLUMN}'):")
        print(f"   Mean: {df[TARGET_COLUMN].mean():.2f}")
        print(f"   Median: {df[TARGET_COLUMN].median():.2f}")
        print(f"   Std Dev: {df[TARGET_COLUMN].std():.2f}")
        print(f"   Min: {df[TARGET_COLUMN].min():.2f}")
        print(f"   Max: {df[TARGET_COLUMN].max():.2f}")
        print(f"   Total demand: {df[TARGET_COLUMN].sum():.2f}")

        # Zero values
        zero_count = (df[TARGET_COLUMN] == 0).sum()
        zero_pct = (zero_count / len(df)) * 100
        print(f"   Zero values: {zero_count} ({zero_pct:.1f}%)")

    # Series count (if material/product column exists)
    series_cols = ['material', 'product', 'item', 'sku']
    series_col = None
    for col in series_cols:
        if col in df.columns:
            series_col = col
            break

    if series_col:
        unique_series = df[series_col].nunique()
        print(f"\n📦 Product/Material Analysis:")
        print(f"   Unique {series_col}s: {unique_series}")

        # Top products by total quantity
        if TARGET_COLUMN in df.columns:
            top_products = df.groupby(series_col)[TARGET_COLUMN].sum().sort_values(ascending=False).head(10)
            print(f"\n   Top 10 {series_col}s by total demand:")
            for idx, (product, qty) in enumerate(top_products.items(), 1):
                print(f"      {idx}. {product}: {qty:.2f}")

    # Regional analysis (if region column exists)
    if 'region' in df.columns:
        unique_regions = df['region'].nunique()
        print(f"\n🌍 Regional Analysis:")
        print(f"   Unique regions: {unique_regions}")

        if TARGET_COLUMN in df.columns:
            top_regions = df.groupby('region')[TARGET_COLUMN].sum().sort_values(ascending=False).head(5)
            print(f"\n   Top 5 regions by total demand:")
            for idx, (region, qty) in enumerate(top_regions.items(), 1):
                print(f"      {idx}. {region}: {qty:.2f}")

    # Supplier analysis (if supplier column exists)
    if 'supplier' in df.columns:
        unique_suppliers = df['supplier'].nunique()
        print(f"\n🏭 Supplier Analysis:")
        print(f"   Unique suppliers: {unique_suppliers}")

    # Feature availability
    available_cat = [col for col in CATEGORICAL_FEATURES if col in df.columns]
    available_cont = [col for col in CONTINUOUS_FEATURES if col in df.columns]

    print(f"\n⚙️  Feature Availability:")
    print(f"   Categorical features: {len(available_cat)}/{len(CATEGORICAL_FEATURES)}")
    if available_cat:
        print(f"      Available: {', '.join(available_cat)}")

    print(f"   Continuous features: {len(available_cont)}/{len(CONTINUOUS_FEATURES)}")
    if len(available_cont) > 0:
        print(f"      Available: {', '.join(available_cont[:10])}{'...' if len(available_cont) > 10 else ''}")

    # Missing values summary
    missing_summary = df.isnull().sum()
    missing_summary = missing_summary[missing_summary > 0].sort_values(ascending=False)

    if len(missing_summary) > 0:
        print(f"\n⚠️  Missing Values:")
        print(f"   Columns with missing data: {len(missing_summary)}")
        for col, count in missing_summary.head(10).items():
            pct = (count / len(df)) * 100
            print(f"      - {col}: {count} ({pct:.1f}%)")
        if len(missing_summary) > 10:
            print(f"      ... and {len(missing_summary) - 10} more columns")
    else:
        print(f"\n✅ No missing values detected")

    print("\n" + "="*70 + "\n")


def load_and_validate_data(file_path: str, date_col: Optional[str] = None,
                           qty_col: Optional[str] = None) -> pd.DataFrame:
    """
    Load, canonicalize, and validate dataset (wrapper function)

    Args:
        file_path: Path to data file
        date_col: Optional explicit date column name
        qty_col: Optional explicit quantity column name

    Returns:
        Validated DataFrame
    """
    # Load dataset
    df = load_dataset(file_path, date_col, qty_col)

    # Canonicalize column names
    df = canonicalize_columns(df, date_col, qty_col)

    # Validate dataset
    validation_results = validate_dataset(df)

    if not validation_results['is_valid']:
        raise ValueError("Dataset validation failed. Please fix errors and try again.")

    return df


def preprocess_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Preprocess data: sort by date, handle missing values, detect frequency
    
    Args:
        df: Raw DataFrame
        
    Returns:
        Preprocessed DataFrame
    """
    df = df.copy()

    # Convert date column to datetime
    print(f"   Converting '{TIME_COLUMN}' to datetime...")
    df[TIME_COLUMN] = pd.to_datetime(df[TIME_COLUMN], format='mixed', dayfirst=False)
    print(f"   ✓ Date range: {df[TIME_COLUMN].min()} to {df[TIME_COLUMN].max()}")
    
    # Sort by date
    print(f"   Sorting by date...")
    df = df.sort_values(TIME_COLUMN).reset_index(drop=True)
    print(f"   ✓ Data sorted chronologically")
    
    # Detect frequency
    date_diff = df[TIME_COLUMN].diff().mode()[0]
    print(f"   Detecting frequency...")
    print(f"   ✓ Detected frequency: {date_diff.days} day(s) - assuming DAILY data")
    
    # Handle missing target values - fill with 0
    missing_target = df[TARGET_COLUMN].isna().sum()
    if missing_target > 0:
        print(f"   Filling {missing_target} missing values in '{TARGET_COLUMN}' with 0...")
        df[TARGET_COLUMN] = df[TARGET_COLUMN].fillna(0)
        print(f"   ✓ Missing target values filled")
    else:
        print(f"   ✓ No missing values in target column")
    
    # Report on other missing values
    missing_summary = df.isnull().sum()
    missing_summary = missing_summary[missing_summary > 0]
    
    if len(missing_summary) > 0:
        print(f"   ⚠ Missing values in other columns:")
        for col, count in missing_summary.items():
            pct = (count / len(df)) * 100
            print(f"      - {col}: {count} ({pct:.1f}%)")
        
        # Fill missing values
        print(f"   Filling missing values...")
        
        # Categorical: fill with 'UNKNOWN'
        for col in CATEGORICAL_FEATURES:
            if col in df.columns and df[col].isna().any():
                df[col] = df[col].fillna('UNKNOWN')
        
        # Continuous: fill with median
        for col in CONTINUOUS_FEATURES:
            if col in df.columns and df[col].isna().any():
                df[col] = df[col].fillna(df[col].median())
        
        print(f"   ✓ Missing values handled")
    
    print(f"   ✓ Final dataset: {len(df):,} rows")
    
    return df


def get_feature_columns(df: pd.DataFrame) -> Tuple[List[str], List[str]]:
    """
    Get available categorical and continuous feature columns
    
    Args:
        df: DataFrame
        
    Returns:
        Tuple of (categorical_features, continuous_features)
    """
    available_cat = [col for col in CATEGORICAL_FEATURES if col in df.columns]
    available_cont = [col for col in CONTINUOUS_FEATURES if col in df.columns]
    
    return available_cat, available_cont

