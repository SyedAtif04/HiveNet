"""ML Pipeline execution service"""

import asyncio
import sys
import subprocess
from pathlib import Path
from typing import Optional
from .config import Config


async def train_model(
    data_path: str,
    feature_select: bool = True,
    top_n: Optional[int] = None,
    group_by: Optional[str] = None
) -> tuple[str, float]:
    """Execute ML training via CLI"""
    import logging
    logger = logging.getLogger(__name__)

    # Build command - run from src directory
    cmd = [
        sys.executable,
        "cli_new.py",
        "train",
        "--data", data_path
    ]

    if group_by:
        cmd.extend(["--group-by", group_by])

    if feature_select:
        cmd.append("--feature-select")

    if top_n:
        cmd.extend(["--top-n", str(top_n)])

    logger.info(f"Executing train command: {' '.join(cmd)}")
    logger.info(f"Working directory: {Config.ML_BASE_DIR / 'src'}")

    # Execute command from src directory using subprocess (Windows-compatible)
    import time
    start_time = time.time()

    src_dir = Config.ML_BASE_DIR / "src"

    # Run in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: subprocess.run(
            cmd,
            cwd=str(src_dir),
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'  # Replace invalid characters instead of failing
        )
    )

    duration = time.time() - start_time

    if result.returncode != 0:
        error_msg = result.stderr if result.stderr else "Training failed"
        logger.error(f"Training failed with return code {result.returncode}")
        logger.error(f"STDERR: {error_msg}")
        logger.error(f"STDOUT: {result.stdout}")
        raise RuntimeError(f"Training failed: {error_msg}")

    output = result.stdout
    logger.info(f"Training completed successfully in {duration:.2f}s")
    logger.debug(f"Training output (last 500 chars): ...{output[-500:] if len(output) > 500 else output}")
    return output, duration


async def predict(
    data_path: str,
    horizon: int,
    history_days: int = 90,
    n_bootstrap: int = 100
) -> tuple[str, float]:
    """Execute ML prediction via CLI"""
    import logging
    logger = logging.getLogger(__name__)

    # Build command - run from src directory
    cmd = [
        sys.executable,
        "cli_new.py",
        "predict",
        "--input", data_path,
        "--horizon", str(horizon),
        "--history-days", str(history_days),
        "--n-bootstrap", str(n_bootstrap)
    ]

    logger.info(f"Executing predict command: {' '.join(cmd)}")
    logger.info(f"Working directory: {Config.ML_BASE_DIR / 'src'}")

    # Execute command from src directory using subprocess (Windows-compatible)
    import time
    start_time = time.time()

    src_dir = Config.ML_BASE_DIR / "src"

    # Run in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: subprocess.run(
            cmd,
            cwd=str(src_dir),
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'  # Replace invalid characters instead of failing
        )
    )

    duration = time.time() - start_time

    if result.returncode != 0:
        error_msg = result.stderr if result.stderr else "Prediction failed"
        logger.error(f"Prediction failed with return code {result.returncode}")
        logger.error(f"STDERR: {error_msg}")
        logger.error(f"STDOUT: {result.stdout}")
        raise RuntimeError(f"Prediction failed: {error_msg}")

    output = result.stdout
    logger.info(f"Prediction completed successfully in {duration:.2f}s")
    # Log last 500 chars of output for debugging
    logger.debug(f"Prediction output (last 500 chars): ...{output[-500:] if len(output) > 500 else output}")
    return output, duration


async def train_and_predict(
    data_path: str,
    horizon: int,
    feature_select: bool = True,
    top_n: Optional[int] = None,
    group_by: Optional[str] = None,
    history_days: int = 90,
    n_bootstrap: int = 100
) -> tuple[str, str, float, float]:
    """Execute complete ML pipeline (train + predict)"""
    
    # Train
    train_output, train_duration = await train_model(
        data_path=data_path,
        feature_select=feature_select,
        top_n=top_n,
        group_by=group_by
    )
    
    # Predict
    predict_output, predict_duration = await predict(
        data_path=data_path,
        horizon=horizon,
        history_days=history_days,
        n_bootstrap=n_bootstrap
    )
    
    return train_output, predict_output, train_duration, predict_duration

