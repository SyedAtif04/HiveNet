#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PRISMA CLI - Command Line Interface for PRISMA Forecasting Pipeline
"""

import argparse
import sys
import json
import os
from pathlib import Path
from datetime import datetime

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Import PRISMA modules
from data_utils import load_and_validate_data, preprocess_data, summarize_data
from features import prepare_features
from models import train_lightgbm, train_prophet
from ensemble import create_ensemble_forecast
from evaluate import print_metrics
from save_load import save_models, load_models
from predictor import (
    generate_iterative_forecast,
    format_forecast_json,
    save_forecast_csv,
    print_forecast_table
)


def print_banner():
    """Print PRISMA banner"""
    banner = """
    ================================================================

       PRISMA - Predictive Resource Intelligence & Supply Chain
                Management using AI

       Terminal-Only ML Pipeline for Demand Forecasting

    ================================================================
    """
    print(banner)


def train_command(args):
    """Execute training pipeline"""
    print_banner()
    print(f"\n{'='*70}")
    print(f" STARTING TRAINING PIPELINE")
    print(f"{'='*70}\n")

    # Step 1: Load and validate data
    print(f" Step 1/7: Loading and validating data from {args.data}")
    print("-" * 70)
    try:
        date_col = getattr(args, 'date_col', None)
        qty_col = getattr(args, 'qty_col', None)
        df = load_and_validate_data(args.data, date_col=date_col, qty_col=qty_col)
        print(f" Data loaded successfully: {df.shape[0]} rows, {df.shape[1]} columns\n")
    except Exception as e:
        print(f" Error loading data: {str(e)}")
        print("\nPlease check:")
        print("  - File path is correct")
        print("  - File contains 'date' and 'quantity_used' columns (or similar)")
        print("  - File format is CSV or XLSX")
        print("\nTip: Use --date-col and --qty-col to specify custom column names")
        return

    # Step 2: Summarize data
    print(f" Step 2/7: Data summary and exploration")
    print("-" * 70)
    summarize_data(df)

    # Step 3: Preprocess data
    print(f" Step 3/7: Preprocessing data")
    print("-" * 70)
    df_clean = preprocess_data(df)
    print(f" Data preprocessed: {df_clean.shape[0]} rows after cleaning\n")

    # Step 4: Prepare features
    print(f"  Step 4/7: Preparing features")
    print("-" * 70)
    X_train, y_train, feature_names, encoders = prepare_features(df_clean)
    print(f" Features prepared: {X_train.shape[1]} features\n")

    # Step 5: Train models
    print(f" Step 5/7: Training models")
    print("-" * 70)

    print("\n Training LightGBM model...")
    lgb_model, lgb_metrics = train_lightgbm(X_train, y_train, feature_names)
    print(f" LightGBM trained successfully\n")

    print(" Training Prophet model...")
    # Check for series column (material, product, etc.)
    series_col = None
    for col in ['material', 'product', 'item', 'sku']:
        if col in df_clean.columns:
            series_col = col
            break

    try:
        prophet_model, prophet_metrics = train_prophet(df_clean, series_col=series_col)
        print(f" Prophet trained successfully\n")
    except Exception as e:
        print(f"  Prophet training failed: {str(e)}")
        print(f"   Continuing with LightGBM-only model...")
        prophet_model = None
        prophet_metrics = {
            'train': {'mae': 0, 'rmse': 0, 'mape': 0, 'r2': 0},
            'validation': {'mae': 0, 'rmse': 0, 'mape': 0, 'r2': 0},
            'skipped': True
        }
        print(f" Skipped Prophet (using LightGBM only)\n")

    # Step 6: Evaluate models
    print(f" Step 6/7: Evaluating models")
    print("-" * 70)
    print_metrics(lgb_metrics, prophet_metrics, lgb_model, feature_names)

    # Step 7: Save models
    print(f"\n Step 7/7: Saving models")
    print("-" * 70)
    output_dir = Path(args.output) if args.output else Path("saved_models")
    save_models(lgb_model, prophet_model, encoders, feature_names, output_dir)
    print(f" Models saved to {output_dir}/\n")

    print(f"{'='*70}")
    print(f" TRAINING COMPLETED SUCCESSFULLY!")
    print(f"{'='*70}\n")


def predict_command(args):
    """Execute prediction pipeline"""
    print_banner()
    print(f"\n{'='*70}")
    print(f" STARTING PREDICTION PIPELINE")
    print(f"{'='*70}\n")

    # Step 1: Load models
    print(f" Step 1/5: Loading trained models")
    print("-" * 70)
    model_dir = Path(args.model) if hasattr(args, 'model') and args.model else Path("saved_models")

    try:
        lgb_model, prophet_model, encoders, feature_names = load_models(model_dir)
        print(f" Models loaded from {model_dir}/\n")
    except Exception as e:
        print(f" Error loading models: {str(e)}")
        print("\nPlease ensure:")
        print("  - Models have been trained (run 'train' command first)")
        print(f"  - Model directory exists: {model_dir}")
        return

    # Step 2: Load input data (recent history)
    print(f" Step 2/5: Loading input data from {args.input}")
    print("-" * 70)

    try:
        date_col = getattr(args, 'date_col', None)
        qty_col = getattr(args, 'qty_col', None)
        df = load_and_validate_data(args.input, date_col=date_col, qty_col=qty_col)
        df_clean = preprocess_data(df)

        # Encode categorical features using loaded encoders
        print(f"   Encoding categorical features...")
        for col, encoder in encoders.items():
            if col in df_clean.columns:
                # Handle unseen categories
                df_clean[col] = df_clean[col].astype(str)
                # Map unseen categories to a default value (0)
                known_classes = set(encoder.classes_)
                df_clean[col] = df_clean[col].apply(
                    lambda x: x if x in known_classes else encoder.classes_[0]
                )
                df_clean[col] = encoder.transform(df_clean[col])
        print(f"   ✓ Categorical features encoded")

        print(f" Input data loaded: {df_clean.shape[0]} rows")
        print(f"   Date range: {df_clean['date'].min()} to {df_clean['date'].max()}\n")
    except Exception as e:
        print(f" Error loading input data: {str(e)}")
        return

    # Detect series column
    series_col = None
    series_value = None
    for col in ['material', 'product', 'item', 'sku']:
        if col in df_clean.columns:
            series_col = col
            series_value = df_clean[col].iloc[-1] if len(df_clean) > 0 else None
            break

    if series_col:
        print(f"   Detected series column: '{series_col}' = '{series_value}'")

    # Step 3: Generate iterative predictions
    print(f"\n Step 3/5: Generating {args.horizon}-day iterative forecast")
    print("-" * 70)

    try:
        predictions = generate_iterative_forecast(
            df_clean,
            lgb_model,
            prophet_model,
            encoders,
            feature_names,
            horizon=args.horizon,
            series_col=series_col,
            series_value=series_value
        )
        print(f"\n Predictions generated for {len(predictions)} days\n")
    except Exception as e:
        print(f" Error generating predictions: {str(e)}")
        import traceback
        traceback.print_exc()
        return

    # Step 4: Format and display results
    print(f" Step 4/5: Formatting forecast output")
    print("-" * 70)

    # Format as JSON
    forecast_json_dict = format_forecast_json(
        predictions,
        df_clean,
        args.horizon,
        series_col=series_col,
        series_value=series_value
    )

    # Print forecast table
    print_forecast_table(predictions, max_rows=10)

    # Print JSON to terminal
    print("\n" + "="*70)
    print(" FORECAST JSON OUTPUT")
    print("="*70 + "\n")

    forecast_json = json.dumps(forecast_json_dict, indent=2)
    print(forecast_json)
    print("\n" + "="*70 + "\n")

    # Step 5: Save outputs
    print(f" Step 5/5: Saving forecast outputs")
    print("-" * 70)

    # Save JSON file
    output_dir = Path(args.output) if hasattr(args, 'output') and args.output else Path(".")

    # Determine output filenames
    if series_value:
        json_filename = f"forecast_{series_value}_{args.horizon}d.json"
        csv_filename = f"forecast_{series_value}_{args.horizon}d.csv"
    else:
        json_filename = f"forecast_{args.horizon}d.json"
        csv_filename = f"forecast_{args.horizon}d.csv"

    json_path = output_dir / json_filename
    csv_path = output_dir / csv_filename

    # Save JSON
    with open(json_path, 'w') as f:
        json.dump(forecast_json_dict, f, indent=2)
    print(f"    JSON forecast saved to: {json_path}")

    # Save CSV
    save_forecast_csv(predictions, str(csv_path), include_components=True)

    print(f"\n{'='*70}")
    print(f" PREDICTION COMPLETED SUCCESSFULLY!")
    print(f"{'='*70}")
    print(f"\nOutput files:")
    print(f"  - JSON: {json_path}")
    print(f"  - CSV:  {csv_path}")
    print(f"\n{'='*70}\n")


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="PRISMA - Predictive Resource Intelligence & Supply Chain Management",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Train command
    train_parser = subparsers.add_parser('train', help='Train forecasting models')
    train_parser.add_argument(
        '--data',
        required=True,
        help='Path to training data (CSV or XLSX)'
    )
    train_parser.add_argument(
        '--output',
        default='saved_models',
        help='Directory to save trained models (default: saved_models/)'
    )
    train_parser.add_argument(
        '--date-col',
        dest='date_col',
        help='Name of the date column (auto-detected if not specified)'
    )
    train_parser.add_argument(
        '--qty-col',
        dest='qty_col',
        help='Name of the quantity/demand column (auto-detected if not specified)'
    )
    train_parser.add_argument("--horizon", type=int, default=30, help="Forecast horizon in days")
    train_parser.add_argument("--verbose", action="store_true", help="Enable detailed training logs")


    # Predict command
    predict_parser = subparsers.add_parser('predict', help='Generate forecasts')
    predict_parser.add_argument(
        '--input',
        required=True,
        help='Path to recent history data (CSV or XLSX)'
    )
    predict_parser.add_argument(
        '--horizon',
        type=int,
        default=30,
        help='Number of days to forecast (default: 30)'
    )
    predict_parser.add_argument(
        '--model',
        default='saved_models',
        help='Directory containing trained models (default: saved_models/)'
    )
    predict_parser.add_argument(
        '--output',
        default='.',
        help='Directory to save forecast outputs (default: current directory)'
    )
    predict_parser.add_argument(
        '--date-col',
        dest='date_col',
        help='Name of the date column (auto-detected if not specified)'
    )
    predict_parser.add_argument(
        '--qty-col',
        dest='qty_col',
        help='Name of the quantity/demand column (auto-detected if not specified)'
    )

    args = parser.parse_args()
    
    if args.command == 'train':
        train_command(args)
    elif args.command == 'predict':
        predict_command(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()


