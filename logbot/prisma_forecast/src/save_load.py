"""
Model persistence for PRISMA - Save and load trained models
"""

import joblib
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import lightgbm as lgb
from sklearn.preprocessing import LabelEncoder


def save_models(
    lgb_model: lgb.Booster,
    encoders: Dict[str, LabelEncoder],
    feature_names: List[str],
    output_dir: Path,
    feature_schema: Optional[Dict] = None,
    pca_model: Optional[Any] = None
):
    """
    Save trained models and artifacts

    Args:
        lgb_model: Trained LightGBM model
        encoders: Dictionary of label encoders
        feature_names: List of feature names
        output_dir: Directory to save models
        feature_schema: Optional feature selection schema
        pca_model: Optional PCA model for dimensionality reduction
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"   Saving models to {output_dir}/")

    # Save LightGBM model
    lgb_path = output_dir / 'lightgbm_model.txt'
    lgb_model.save_model(str(lgb_path))
    print(f"   ✓ LightGBM model saved: {lgb_path.name}")

    # Save encoders
    encoders_path = output_dir / 'encoders.pkl'
    joblib.dump(encoders, encoders_path)
    print(f"   ✓ Encoders saved: {encoders_path.name}")

    # Save feature names
    features_path = output_dir / 'feature_names.json'
    with open(features_path, 'w') as f:
        json.dump(feature_names, f, indent=2)
    print(f"   ✓ Feature names saved: {features_path.name}")

    # Save feature schema (if feature selection was used)
    if feature_schema is not None:
        schema_path = output_dir / 'feature_schema.json'
        with open(schema_path, 'w') as f:
            json.dump(feature_schema, f, indent=2)
        print(f"   ✓ Feature schema saved: {schema_path.name}")

    # Save PCA model (if dimensionality reduction was used)
    if pca_model is not None:
        pca_path = output_dir / 'pca_model.pkl'
        joblib.dump(pca_model, pca_path)
        print(f"   ✓ PCA model saved: {pca_path.name}")

    # Save metadata
    metadata = {
        'n_features': len(feature_names),
        'model_type': 'LightGBM',
        'saved_at': str(Path.cwd()),
        'has_feature_schema': feature_schema is not None,
        'has_pca_model': pca_model is not None
    }
    metadata_path = output_dir / 'metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"   ✓ Metadata saved: {metadata_path.name}")


def load_models(
    model_dir: Path
) -> Tuple[lgb.Booster, Dict[str, LabelEncoder], List[str], Optional[Dict], Optional[Any]]:
    """
    Load trained models and artifacts

    Args:
        model_dir: Directory containing saved models

    Returns:
        Tuple of (lgb_model, encoders, feature_names, feature_schema, pca_model)
    """
    model_dir = Path(model_dir)

    if not model_dir.exists():
        raise FileNotFoundError(f"Model directory not found: {model_dir}")

    print(f"   Loading models from {model_dir}/")

    # Load LightGBM model
    lgb_path = model_dir / 'lightgbm_model.txt'
    if not lgb_path.exists():
        raise FileNotFoundError(f"LightGBM model not found: {lgb_path}")
    lgb_model = lgb.Booster(model_file=str(lgb_path))
    print(f"   ✓ LightGBM model loaded")

    # Load encoders
    encoders_path = model_dir / 'encoders.pkl'
    if not encoders_path.exists():
        raise FileNotFoundError(f"Encoders not found: {encoders_path}")
    encoders = joblib.load(encoders_path)
    print(f"   ✓ Encoders loaded")

    # Load feature names
    features_path = model_dir / 'feature_names.json'
    if not features_path.exists():
        raise FileNotFoundError(f"Feature names not found: {features_path}")
    with open(features_path, 'r') as f:
        feature_names = json.load(f)
    print(f"   ✓ Feature names loaded ({len(feature_names)} features)")

    # Load feature schema (optional)
    feature_schema = None
    schema_path = model_dir / 'feature_schema.json'
    if schema_path.exists():
        with open(schema_path, 'r') as f:
            feature_schema = json.load(f)
        print(f"   ✓ Feature schema loaded ({len(feature_schema.get('selected_features', []))} selected features)")

    # Load PCA model (optional)
    pca_model = None
    pca_path = model_dir / 'pca_model.pkl'
    if pca_path.exists():
        pca_model = joblib.load(pca_path)
        print(f"   ✓ PCA model loaded")

    return lgb_model, encoders, feature_names, feature_schema, pca_model

