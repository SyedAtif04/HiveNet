#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PRISMA CLI - LLM-Driven Forecasting Pipeline
"""

import argparse
import sys
import json
from pathlib import Path
from datetime import datetime
import pandas as pd

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Import PRISMA modules
from data_utils import (
    load_dataset,
    validate_data_only,
    validate_datatypes,
    preprocess_data,
    summarize_data,
    TIME_COLUMN,
    TARGET_COLUMN
)
# Import Ollama-based LLM module
from llm_ollama import identify_and_rename_columns
from features import prepare_features
from feature_select import score_features, select_features
from models import train_lightgbm, train_per_group
from evaluate import print_metrics
from save_load import save_models, load_models
from predictor import (
    generate_iterative_forecast,
    generate_per_group_forecasts,
    aggregate_group_forecasts,
    save_all_forecasts,
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

       LLM-Driven ML Pipeline for Demand Forecasting

    ================================================================
    """
    print(banner)


def train_command(args):
    """Execute LLM-driven training pipeline"""
    print_banner()
    print(f"\n{'='*70}")
    print(f" STARTING LLM-DRIVEN TRAINING PIPELINE")
    print(f"{'='*70}\n")

    # Step 1: Load data
    print(f" Step 1/6: Loading data from {args.data}")
    print("-" * 70)
    try:
        df = load_dataset(args.data)
        print(f" ✓ Data loaded: {df.shape[0]} rows, {df.shape[1]} columns\n")
    except Exception as e:
        print(f" ❌ Error loading data: {str(e)}")
        sys.exit(1)

    # Step 2: LLM identifies and renames date + quantity columns (skip if already named)
    print(f" Step 2/6: LLM column identification")
    print("-" * 70)
    if 'date' in df.columns and 'quantity_used' in df.columns:
        print(f" ✓ Columns already correctly named — skipping LLM identification\n")
        mapping_info = {}
    else:
        try:
            df, mapping_info = identify_and_rename_columns(df)
            print(f" ✓ Columns identified and renamed\n")
        except Exception as e:
            print(f" ❌ Error in LLM identification: {str(e)}")
            sys.exit(1)

    # Step 3: Validate datatypes
    print(f" Step 3/6: Validating datatypes")
    print("-" * 70)
    try:
        df = validate_datatypes(df)
        df = validate_data_only(df)
        print(f" ✓ Data validated: {df.shape[0]} rows, {df.shape[1]} columns\n")
    except Exception as e:
        print(f" ❌ Error validating data: {str(e)}")
        sys.exit(1)

    # Step 4: Data summary
    print(f" Step 4/6: Data summary")
    print("-" * 70)
    summarize_data(df)

    # Step 5: Preprocess data
    print(f" Step 5/6: Preprocessing data")
    print("-" * 70)
    try:
        df_clean = preprocess_data(df)
        print(f" ✓ Data preprocessed: {len(df_clean)} rows after cleaning\n")
    except Exception as e:
        print(f" ❌ Error preprocessing data: {str(e)}")
        sys.exit(1)

    # Step 6: Prepare features
    print(f" Step 6/6: Preparing features")
    print("-" * 70)
    try:
        X_train, y_train, feature_names, encoders = prepare_features(df_clean)
        print(f" ✓ Features prepared: {len(feature_names)} features\n")
    except Exception as e:
        print(f" ❌ Error preparing features: {str(e)}")
        sys.exit(1)

    # Step 7: Dimensionality reduction (if enabled)
    selected_features = feature_names
    if args.feature_select:
        print(f" Step 7/8: Dimensionality reduction")
        print("-" * 70)
        try:
            # Convert X_train back to DataFrame for feature selection
            import pandas as pd
            from data_utils import TARGET_COLUMN

            X_train_df = pd.DataFrame(X_train, columns=feature_names)
            X_train_df[TARGET_COLUMN] = y_train

            # Score features
            feature_scores, lgb_temp = score_features(
                X_train_df,
                TARGET_COLUMN,
                feature_names
            )

            # Select top features
            top_n = args.top_n if hasattr(args, 'top_n') else 30
            selected_features = select_features(
                feature_scores,
                top_k=top_n,
                min_gain=0.0
            )

            print(f" ✓ Selected {len(selected_features)}/{len(feature_names)} features\n")

            # Filter X_train to selected features
            selected_indices = [i for i, f in enumerate(feature_names) if f in selected_features]
            X_train = X_train[:, selected_indices]
        except Exception as e:
            print(f" ⚠️  Feature selection failed: {str(e)}")
            print(f" Continuing with all features...\n")
            import traceback
            traceback.print_exc()

    # Step 8: Train models (per-group or single model)
    print(f" Step 8/8: Training models")
    print("-" * 70)

    # Check if per-group training is requested
    group_cols = []
    if hasattr(args, 'group_by') and args.group_by:
        group_cols = [col.strip() for col in args.group_by.split(',')]
        print(f"\n   Per-group training enabled for: {group_cols}")

    try:
        if group_cols:
            # Per-group training
            print(f"\n   Training per-group models...")
            models_dict = train_per_group(
                df=df_clean,
                group_cols=group_cols,
                feature_names=selected_features,
                encoders=encoders,
                test_size=0.2,
                random_state=42,
                min_samples=50
            )
            print(f" ✓ Per-group models trained successfully\n")

            # Save per-group models
            print(f"\n Step 9/8: Saving per-group models")
            print("-" * 70)
            from pathlib import Path
            # Use parent directory's saved_models folder (not src/saved_models)
            output_dir = Path(__file__).parent.parent / "saved_models"
            output_dir.mkdir(parents=True, exist_ok=True)

            # Save metadata
            metadata = {
                'type': 'per_group',
                'group_cols': group_cols,
                'num_groups': len(models_dict),
                'feature_names': selected_features,
                'timestamp': datetime.now().isoformat()
            }

            with open(output_dir / 'metadata.json', 'w') as f:
                json.dump(metadata, f, indent=2)

            # Save each group model
            for group_name, (model, metrics) in models_dict.items():
                group_dir = output_dir / group_name
                group_dir.mkdir(parents=True, exist_ok=True)

                # Save LightGBM model
                model.save_model(str(group_dir / 'lgb_model.txt'))

                # Save metrics
                with open(group_dir / 'metrics.json', 'w') as f:
                    json.dump(metrics, f, indent=2)

            # Save encoders (shared across all groups)
            import pickle
            with open(output_dir / 'encoders.pkl', 'wb') as f:
                pickle.dump(encoders, f)

            print(f" ✓ Per-group models saved to {output_dir}/\n")

        else:
            # Single model training (original behavior)
            print("\n   Training single LightGBM model...")
            lgb_model, lgb_metrics = train_lightgbm(X_train, y_train, selected_features)
            print(f" ✓ LightGBM trained successfully\n")

            # Step 9: Evaluate models
            print(f" Step 9/8: Evaluating models")
            print("-" * 70)
            print_metrics(lgb_metrics, lgb_model, selected_features)

            # Step 10: Save models
            print(f"\n Step 10/8: Saving models")
            print("-" * 70)
            from pathlib import Path
            # Use parent directory's saved_models folder (not src/saved_models)
            output_dir = Path(__file__).parent.parent / "saved_models"

            save_models(
                lgb_model=lgb_model,
                prophet_model=None,
                encoders=encoders,
                feature_names=selected_features,
                output_dir=output_dir
            )
            print(f" ✓ Models saved to {output_dir}/\n")

    except Exception as e:
        print(f" ❌ Error training models: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    print(f"\n{'='*70}")
    print(f" ✅ TRAINING COMPLETED SUCCESSFULLY!")
    print(f"{'='*70}\n")


def predict_command(args):
    """Execute prediction pipeline"""
    print_banner()
    print(f"\n{'='*70}")
    print(f" STARTING PREDICTION PIPELINE")
    print(f"{'='*70}\n")

    # Load models
    print(f" Step 1/3: Loading trained models")
    print("-" * 70)
    try:
        from pathlib import Path
        import pickle
        import lightgbm as lgb

        # Use parent directory's saved_models folder (not src/saved_models)
        model_dir = Path(__file__).parent.parent / "saved_models"
        print(f"   Loading models from {model_dir}/")

        # Check if per-group models exist
        metadata_path = model_dir / 'metadata.json'
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)

            if metadata.get('type') == 'per_group':
                # Load per-group models
                print(f"   Loading per-group models...")
                group_cols = metadata['group_cols']
                feature_names = metadata['feature_names']

                # Load encoders
                with open(model_dir / 'encoders.pkl', 'rb') as f:
                    encoders = pickle.load(f)

                # Load all group models
                models_dict = {}
                for group_dir in model_dir.iterdir():
                    if group_dir.is_dir() and (group_dir / 'lgb_model.txt').exists():
                        group_name = group_dir.name
                        model = lgb.Booster(model_file=str(group_dir / 'lgb_model.txt'))

                        with open(group_dir / 'metrics.json', 'r') as f:
                            metrics = json.load(f)

                        models_dict[group_name] = (model, metrics)

                print(f" ✓ Loaded {len(models_dict)} per-group models\n")

                # Set flags for per-group prediction
                is_per_group = True
                lgb_model = None
                prophet_model = None
                feature_schema = None
                pca_model = None
            else:
                # Load single model
                lgb_model, prophet_model, encoders, feature_names, feature_schema, pca_model = load_models(model_dir)
                is_per_group = False
                models_dict = None
                group_cols = None
                print(f" ✓ Single model loaded successfully\n")
        else:
            # Load single model (old format)
            lgb_model, prophet_model, encoders, feature_names, feature_schema, pca_model = load_models(model_dir)
            is_per_group = False
            models_dict = None
            group_cols = None
            print(f" ✓ Single model loaded successfully\n")

    except Exception as e:
        print(f" ❌ Error loading models: {str(e)}")
        print("\nPlease train models first using: python src/cli_new.py train --data <file>")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # Load recent history
    print(f" Step 2/3: Loading recent history from {args.input}")
    print("-" * 70)
    try:
        df_recent = load_dataset(args.input)

        # Identify and rename columns if needed
        if 'date' not in df_recent.columns or 'quantity_used' not in df_recent.columns:
            print(" Identifying columns with LLM...")
            df_recent, _ = identify_and_rename_columns(df_recent)

        df_recent = validate_datatypes(df_recent)
        df_recent = preprocess_data(df_recent)
        print(f" ✓ Recent history loaded: {len(df_recent)} rows\n")
    except Exception as e:
        print(f" ❌ Error loading recent history: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # Generate forecast
    print(f" Step 3/3: Generating {args.horizon}-day forecast")
    print("-" * 70)
    try:
        if is_per_group:
            # Per-group forecasting with bootstrap ensemble
            history_days = getattr(args, 'history_days', 90)
            n_bootstrap = getattr(args, 'n_bootstrap', 100)

            group_forecasts = generate_per_group_forecasts(
                df=df_recent,
                models_dict=models_dict,
                group_cols=group_cols,
                encoders=encoders,
                feature_names=feature_names,
                horizon=args.horizon,
                feature_schema=feature_schema,
                pca_model=pca_model,
                history_days=history_days,
                n_bootstrap=n_bootstrap
            )

            # Aggregate forecasts
            forecast_df = aggregate_group_forecasts(
                group_forecasts=group_forecasts,
                aggregation='sum'
            )

            # Save all forecasts with new comprehensive format
            # Use parent directory's forecasts folder (not src/forecasts)
            from pathlib import Path
            forecasts_dir = Path(__file__).parent.parent / "forecasts"
            save_all_forecasts(
                group_forecasts=group_forecasts,
                unified_forecast=forecast_df,
                output_dir=str(forecasts_dir),
                horizon=args.horizon,
                df=df_recent,
                group_cols=group_cols,
                use_new_format=True
            )

            print(f" ✓ Per-group forecasts generated and saved in comprehensive format\n")

        else:
            # Single model forecasting with bootstrap ensemble
            history_days = getattr(args, 'history_days', 90)
            n_bootstrap = getattr(args, 'n_bootstrap', 100)

            forecast_df = generate_iterative_forecast(
                df=df_recent,
                lgb_model=lgb_model,
                prophet_model=prophet_model,
                encoders=encoders,
                feature_names=feature_names,
                horizon=args.horizon,
                feature_schema=feature_schema,
                pca_model=pca_model,
                history_days=history_days,
                n_bootstrap=n_bootstrap
            )
            print(f" ✓ Forecast generated: {len(forecast_df)} days\n")

            # Save forecast
            # Use parent directory's forecasts folder (not src/forecasts)
            from pathlib import Path
            if args.output:
                output_path = args.output
            else:
                forecasts_dir = Path(__file__).parent.parent / "forecasts"
                output_path = str(forecasts_dir / f"forecast_{args.horizon}d")

            # Save JSON
            forecast_json = format_forecast_json(
                predictions=forecast_df,
                df=df_recent,
                horizon=args.horizon
            )
            json_path = f"{output_path}.json"
            Path(json_path).parent.mkdir(parents=True, exist_ok=True)
            with open(json_path, 'w') as f:
                json.dump(forecast_json, f, indent=2)
            print(f" ✓ Forecast saved to {json_path}")

            # Save CSV
            csv_path = save_forecast_csv(forecast_df, output_path)
            print(f" ✓ Forecast saved to {csv_path}\n")

    except Exception as e:
        print(f" ⚠️  Error saving forecast: {str(e)}\n")
        import traceback
        traceback.print_exc()

    # Print forecast table
    if not is_per_group:
        print_forecast_table(forecast_df)
    else:
        if len(forecast_df) > 0:
            print(f"\n   📊 Unified Forecast Summary:")
            print(f"   Total forecasted demand: {sum(p['y_hat'] for p in forecast_df):.2f}")
            print(f"   Average daily demand: {sum(p['y_hat'] for p in forecast_df) / len(forecast_df):.2f}")
            print(f"   Forecast files saved in: forecasts/\n")
        else:
            print(f"\n   ⚠️  No forecasts generated (no matching groups found)\n")

    print(f"\n{'='*70}")
    print(f" ✅ PREDICTION COMPLETED SUCCESSFULLY!")
    print(f"{'='*70}\n")


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="PRISMA - LLM-Driven Demand Forecasting Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    subparsers = parser.add_subparsers(dest='command', help='Command to execute')

    # Train command
    train_parser = subparsers.add_parser('train', help='Train forecasting models')
    train_parser.add_argument('--data', required=True, help='Path to training data (CSV/XLSX)')
    train_parser.add_argument('--feature-select', action='store_true', help='Enable dimensionality reduction')
    train_parser.add_argument('--top-n', type=int, default=30, help='Number of top features to select (default: 30)')
    train_parser.add_argument('--group-by', help='Comma-separated columns for per-group training (e.g., "material,region")')

    # Predict command
    predict_parser = subparsers.add_parser('predict', help='Generate forecasts')
    predict_parser.add_argument('--input', required=True, help='Path to recent history data')
    predict_parser.add_argument('--horizon', type=int, default=30, help='Forecast horizon in days (default: 30)')
    predict_parser.add_argument('--output', help='Output path for forecast (without extension)')
    predict_parser.add_argument('--history-days', type=int, default=90, help='Number of recent days to use per group (default: 90)')
    predict_parser.add_argument('--n-bootstrap', type=int, default=100, help='Number of bootstrap iterations for confidence intervals (default: 100)')

    args = parser.parse_args()

    if args.command == 'train':
        train_command(args)
    elif args.command == 'predict':
        predict_command(args)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()

