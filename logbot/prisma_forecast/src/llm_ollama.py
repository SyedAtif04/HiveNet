"""
LLM-based column identification using Ollama with Mistral 7B Instruct

This module uses Ollama (running locally) to identify date and quantity columns
in a dataset by analyzing a sample of the data.
"""

import json
import pandas as pd
from typing import Dict, Tuple
import requests


def check_ollama_running() -> bool:
    """
    Check if Ollama service is running.
    
    Returns:
        True if Ollama is running, False otherwise
    """
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        return response.status_code == 200
    except:
        return False


def get_ollama_models() -> list:
    """
    Get list of available Ollama models.
    
    Returns:
        List of model names
    """
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            data = response.json()
            return [model['name'] for model in data.get('models', [])]
        return []
    except:
        return []


def call_ollama(prompt: str, model: str = "mistral:7b-instruct") -> str:
    """
    Call Ollama API to generate a response.
    
    Args:
        prompt: The prompt to send to the model
        model: Model name (default: mistral:7b-instruct)
        
    Returns:
        Generated response text
    """
    url = "http://localhost:11434/api/generate"
    
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.1,  # Low temperature for deterministic output
            "num_predict": 512   # Max tokens to generate
        }
    }
    
    try:
        response = requests.post(url, json=payload, timeout=120)
        response.raise_for_status()
        result = response.json()
        return result.get('response', '')
    except Exception as e:
        raise RuntimeError(f"Ollama API call failed: {str(e)}")


def create_identification_prompt(df_sample: pd.DataFrame) -> str:
    """
    Create a prompt for the LLM to identify date and quantity columns.
    
    Args:
        df_sample: Sample DataFrame (100 rows)
        
    Returns:
        Formatted prompt string
    """
    # Get column information
    columns_info = {}
    for col in df_sample.columns:
        col_info = {
            'dtype': str(df_sample[col].dtype),
            'sample_values': df_sample[col].head(5).tolist(),
            'null_count': int(df_sample[col].isnull().sum()),
            'unique_count': int(df_sample[col].nunique())
        }
        columns_info[col] = col_info
    
    prompt = f"""You are a data analysis expert. Analyze this dataset and identify the date/time column and the quantity/demand column.

Dataset has {len(df_sample)} rows and {len(df_sample.columns)} columns.

Column Information:
{json.dumps(columns_info, indent=2, default=str)}

Task:
1. Identify which column represents DATE or TIME (timestamps, dates, weeks, months, etc.)
2. Identify which column represents QUANTITY, DEMAND, or SALES (the target variable to predict)

IMPORTANT: Return ONLY a valid JSON object with this exact format (no markdown, no code blocks, no extra text):
{{
  "date_column": "exact_column_name_here",
  "quantity_column": "exact_column_name_here",
  "confidence": "high/medium/low",
  "reasoning": "brief explanation"
}}
"""
    
    return prompt


def parse_llm_response(response: str) -> Dict:
    """
    Parse LLM response and extract JSON.
    
    Args:
        response: Raw LLM response
        
    Returns:
        Parsed dictionary with date_column and quantity_column
    """
    # Try to find JSON in the response
    response = response.strip()
    
    # Remove markdown code blocks if present
    if response.startswith('```'):
        lines = response.split('\n')
        response = '\n'.join(lines[1:-1]) if len(lines) > 2 else response
        response = response.replace('```json', '').replace('```', '').strip()
    
    # Try to parse JSON
    try:
        result = json.loads(response)
        
        # Validate required fields
        if 'date_column' not in result or 'quantity_column' not in result:
            raise ValueError("Missing required fields in LLM response")
        
        return result
    except json.JSONDecodeError as e:
        # Try to extract JSON from text
        import re
        json_match = re.search(r'\{[^}]+\}', response, re.DOTALL)
        if json_match:
            try:
                result = json.loads(json_match.group(0))
                if 'date_column' in result and 'quantity_column' in result:
                    return result
            except:
                pass
        
        raise ValueError(f"Failed to parse LLM response as JSON: {str(e)}\nResponse: {response[:200]}")


def identify_columns_with_llm(df_sample: pd.DataFrame) -> Dict:
    """
    Use Ollama + Mistral 7B to identify date and quantity columns.
    
    Args:
        df_sample: Sample DataFrame (100 rows)
        
    Returns:
        Dict with date_column, quantity_column, confidence, reasoning
    """
    print("\n" + "="*70)
    print("🤖 LLM COLUMN IDENTIFICATION (Ollama + Mistral 7B)")
    print("="*70)
    
    # Check if Ollama is running
    if not check_ollama_running():
        raise RuntimeError(
            "Ollama is not running. Please start Ollama service.\n"
            "Run: ollama serve"
        )
    
    # Check if Mistral model is available
    models = get_ollama_models()
    print(f"\n📦 Available models: {', '.join(models)}")
    
    if not any('mistral' in model.lower() for model in models):
        raise RuntimeError(
            "Mistral model not found. Please pull it first:\n"
            "Run: ollama pull mistral:7b-instruct"
        )
    
    # Create prompt
    print(f"\n📊 Analyzing {len(df_sample)} rows with {len(df_sample.columns)} columns...")
    prompt = create_identification_prompt(df_sample)
    
    # Call LLM
    print(f"🧠 Calling Mistral 7B Instruct...")
    response = call_ollama(prompt, model="mistral:7b-instruct")
    
    # Parse response
    print(f"📝 Parsing LLM response...")
    result = parse_llm_response(response)
    
    print(f"\n✅ LLM Identification Complete:")
    print(f"   Date column: '{result['date_column']}'")
    print(f"   Quantity column: '{result['quantity_column']}'")
    print(f"   Confidence: {result.get('confidence', 'unknown')}")
    print(f"   Reasoning: {result.get('reasoning', 'N/A')}")
    
    return result


def identify_and_rename_columns(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
    """
    Main function: Sample data, identify columns with LLM, and rename.
    
    Args:
        df: Input DataFrame
        
    Returns:
        (renamed_df, mapping_info)
    """
    # Sample 100 random rows
    sample_size = min(100, len(df))
    df_sample = df.sample(n=sample_size, random_state=42)
    print(f"\n🔬 Sampled {sample_size} random rows for LLM analysis")
    
    # Identify columns with LLM
    result = identify_columns_with_llm(df_sample)
    
    date_col = result['date_column']
    qty_col = result['quantity_column']
    
    # Validate columns exist
    if date_col not in df.columns:
        raise ValueError(f"LLM identified date column '{date_col}' not found in dataset")
    if qty_col not in df.columns:
        raise ValueError(f"LLM identified quantity column '{qty_col}' not found in dataset")
    
    # Rename columns
    print(f"\n🔄 Renaming columns...")
    df_renamed = df.copy()
    
    rename_map = {}
    if date_col != 'date':
        rename_map[date_col] = 'date'
        print(f"   '{date_col}' → 'date'")
    if qty_col != 'quantity_used':
        rename_map[qty_col] = 'quantity_used'
        print(f"   '{qty_col}' → 'quantity_used'")
    
    if rename_map:
        df_renamed = df_renamed.rename(columns=rename_map)
    else:
        print("   No renaming needed (columns already named correctly)")
    
    # Create mapping info
    mapping_info = {
        'date_column': date_col,
        'quantity_column': qty_col,
        'confidence': result.get('confidence', 'unknown'),
        'reasoning': result.get('reasoning', ''),
        'renamed': rename_map,
        'method': 'LLM (Ollama + Mistral 7B Instruct)'
    }
    
    print("\n" + "="*70)
    print("✅ COLUMN IDENTIFICATION COMPLETE")
    print("="*70 + "\n")
    
    return df_renamed, mapping_info

