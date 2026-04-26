"""
Data utilities for PRISMA - Loading, validation, and preprocessing
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, List, Dict, Optional
import warnings


# Required columns (only these are standardized)
TARGET_COLUMN = 'quantity_used'
TIME_COLUMN = 'date'


def load_dataset(file_path: str) -> pd.DataFrame:
    """
    Load dataset from CSV or XLSX file

    Args:
        file_path: Path to data file

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


def validate_datatypes(df: pd.DataFrame) -> pd.DataFrame:
    """
    Validate and convert datatypes with robust date parsing (handles multiple formats).
    """
    df = df.copy()
    print("   Validating and converting datatypes...")

    # --- Robust date parsing ---
    if TIME_COLUMN in df.columns:
        try:
            # Try normal parsing first
            df[TIME_COLUMN] = pd.to_datetime(df[TIME_COLUMN])
            print(f"   ✓ Converted '{TIME_COLUMN}' to datetime (default parser)")
        except Exception as e:
            print(f"   ⚠ Default parsing failed for '{TIME_COLUMN}': {e}")
            print("   ↪ Attempting flexible date parsing with multiple formats...")

            # Attempt flexible parsing
            try:
                df[TIME_COLUMN] = pd.to_datetime(
                    df[TIME_COLUMN],
                    format='mixed',  # allows multiple styles
                    dayfirst=True,   # supports DD-MM-YYYY cases
                    errors='coerce'  # prevents crashes
                )
                # Verify conversion success
                null_dates = df[TIME_COLUMN].isna().sum()
                if null_dates == 0:
                    print(f"   ✓ Converted '{TIME_COLUMN}' to datetime (day-first mixed format)")
                else:
                    print(f"   ⚠ {null_dates} rows could not be parsed and were set to NaT")
            except Exception as e2:
                raise ValueError(
                    f"Failed to parse '{TIME_COLUMN}' as datetime even with fallback: {e2}"
                )

    # --- Convert quantity_used to numeric ---
    if TARGET_COLUMN in df.columns:
        try:
            df[TARGET_COLUMN] = pd.to_numeric(df[TARGET_COLUMN], errors='coerce')
            print(f"   ✓ Converted '{TARGET_COLUMN}' to numeric")
        except Exception as e:
            raise ValueError(f"Failed to convert '{TARGET_COLUMN}' to numeric: {str(e)}")

    # --- Infer and convert other column types ---
    for col in df.columns:
        if col in [TIME_COLUMN, TARGET_COLUMN]:
            continue
        if df[col].dtype == 'object':
            try:
                df[col] = pd.to_numeric(df[col], errors='ignore')
            except Exception:
                pass

    print("   ✓ Datatype validation complete\n")
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

    # Feature availability - show ACTUAL features in dataset
    # Get all non-system columns
    system_cols = [TIME_COLUMN, TARGET_COLUMN, 'record_id', 'id', 'index']
    actual_features = [col for col in df.columns if col not in system_cols]

    # Detect categorical vs numerical
    actual_cat = [col for col in actual_features if df[col].dtype == 'object' or df[col].nunique() < 20]
    actual_num = [col for col in actual_features if col not in actual_cat]

    print(f"\n⚙️  Feature Availability:")
    print(f"   Total features in dataset: {len(actual_features)}")
    print(f"   Categorical features detected: {len(actual_cat)}")
    if actual_cat:
        print(f"      {', '.join(actual_cat[:10])}{'...' if len(actual_cat) > 10 else ''}")

    print(f"   Numerical features detected: {len(actual_num)}")
    if actual_num:
        print(f"      {', '.join(actual_num[:10])}{'...' if len(actual_num) > 10 else ''}")

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


def load_data_only(file_path: str) -> pd.DataFrame:
    """
    Load dataset without validation (for use with auto-mapping)

    Args:
        file_path: Path to data file

    Returns:
        DataFrame with loaded data (no validation)
    """
    return load_dataset(file_path)


def validate_data_only(df: pd.DataFrame) -> pd.DataFrame:
    """
    Validate dataset only (assumes columns are already mapped)

    Args:
        df: DataFrame to validate

    Returns:
        Validated DataFrame

    Raises:
        ValueError: If validation fails
    """
    validation_results = validate_dataset(df)

    if not validation_results['is_valid']:
        raise ValueError("Dataset validation failed. Please fix errors and try again.")

    return df





def detect_and_aggregate_transactional_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Detect if data is transactional (multiple rows per day) and aggregate to daily level

    Args:
        df: Raw DataFrame

    Returns:
        Aggregated DataFrame (if transactional) or original DataFrame
    """
    df = df.copy()

    # Convert date to datetime if not already
    if df[TIME_COLUMN].dtype != 'datetime64[ns]':
        df[TIME_COLUMN] = pd.to_datetime(df[TIME_COLUMN], format='mixed', dayfirst=False)

    # Check if data is transactional (multiple rows per day)
    date_range_days = (df[TIME_COLUMN].max() - df[TIME_COLUMN].min()).days + 1
    rows_per_day = len(df) / date_range_days

    print(f"   Checking data structure...")
    print(f"   Date range: {date_range_days} days")
    print(f"   Total rows: {len(df)}")
    print(f"   Rows per day: {rows_per_day:.1f}")

    if rows_per_day > 1.5:  # More than 1.5 rows per day = transactional
        print(f"\n   ⚠️  TRANSACTIONAL DATA DETECTED!")
        print(f"   This dataset has multiple transactions per day.")
        print(f"   Aggregating to daily level for time series forecasting...\n")

        # Identify grouping columns (categorical features that define series)
        group_cols = [TIME_COLUMN]
        potential_group_cols = ['store_id', 'sku_id', 'material', 'product', 'region', 'project_id']

        for col in potential_group_cols:
            if col in df.columns:
                group_cols.append(col)
                print(f"   [*] Grouping by: {col}")

        # Define aggregation rules
        agg_rules = {TARGET_COLUMN: 'sum'}  # Sum quantity

        # Add other columns
        for col in df.columns:
            if col not in group_cols and col != TARGET_COLUMN:
                if df[col].dtype == 'object':
                    agg_rules[col] = 'first'  # Take first value for categorical
                elif col.endswith('_price') or col.endswith('_cost'):
                    agg_rules[col] = 'mean'  # Average prices
                elif col.startswith('is_'):
                    agg_rules[col] = 'max'  # Max for boolean flags
                else:
                    agg_rules[col] = 'mean'  # Mean for other numerical

        # Aggregate
        print(f"\n   [*] Aggregating {len(df)} rows...")
        df_agg = df.groupby(group_cols, as_index=False).agg(agg_rules)

        print(f"   ✓ Aggregated to {len(df_agg)} rows (daily level)")
        print(f"   ✓ Aggregation: {TARGET_COLUMN} = sum, prices = mean, flags = max\n")

        return df_agg
    else:
        print(f"   ✓ Data is already at daily level (no aggregation needed)\n")
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

    # Detect and aggregate transactional data
    df = detect_and_aggregate_transactional_data(df)

    # Sort by date
    print(f"   Sorting by date...")
    df = df.sort_values(TIME_COLUMN).reset_index(drop=True)
    print(f"   ✓ Data sorted chronologically")

    # Detect frequency
    if len(df) > 1:
        date_diff = df[TIME_COLUMN].diff().mode()
        if len(date_diff) > 0:
            freq_days = date_diff[0].days
            print(f"   Detecting frequency...")
            print(f"   ✓ Detected frequency: {freq_days} day(s)")
        else:
            print(f"   ⚠️  Could not detect frequency - assuming DAILY data")
    else:
        print(f"   ⚠️  Only 1 row - cannot detect frequency")
    
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

        # Get feature columns dynamically
        categorical_features, continuous_features = get_feature_columns(df)

        # Categorical: fill with 'UNKNOWN'
        for col in categorical_features:
            if col in df.columns and df[col].isna().any():
                df[col] = df[col].fillna('UNKNOWN')

        # Continuous: fill with median
        for col in continuous_features:
            if col in df.columns and df[col].isna().any():
                df[col] = df[col].fillna(df[col].median())

        print(f"   ✓ Missing values handled")
    
    print(f"   ✓ Final dataset: {len(df):,} rows")
    
    return df


def get_feature_columns(df: pd.DataFrame) -> Tuple[List[str], List[str]]:
    """
    Get available categorical and continuous feature columns dynamically.

    Args:
        df: DataFrame

    Returns:
        Tuple of (categorical_features, continuous_features)
    """
    # Exclude date and target columns
    feature_cols = [col for col in df.columns if col not in [TIME_COLUMN, TARGET_COLUMN]]

    # Separate categorical and continuous features based on dtype
    categorical_features = []
    continuous_features = []

    for col in feature_cols:
        if df[col].dtype in ['object', 'category', 'bool']:
            categorical_features.append(col)
        elif pd.api.types.is_numeric_dtype(df[col]):
            continuous_features.append(col)

    return categorical_features, continuous_features

