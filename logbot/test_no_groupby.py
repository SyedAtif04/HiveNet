"""
Test script to verify backend works without group_by parameter
"""

import requests

API_BASE_URL = "http://localhost:8000"
TEST_FILE = "prisma_forecast/data/prisma_dataset.csv"

print("🧪 Testing backend without group_by parameter...")

# Test 1: Upload file
print("\n1️⃣ Uploading file...")
with open(TEST_FILE, 'rb') as f:
    files = {'file': ('prisma_dataset.csv', f, 'text/csv')}
    response = requests.post(f"{API_BASE_URL}/upload", files=files)

if response.status_code == 200:
    data = response.json()
    print(f"   ✅ Upload successful: {data['filename']}")
    data_path = data['path']
else:
    print(f"   ❌ Upload failed: {response.text}")
    exit(1)

# Test 2: Generate forecast WITHOUT group_by
print("\n2️⃣ Generating forecast WITHOUT group_by...")
payload = {
    "duration": "3_months",
    "data_path": data_path,
    "feature_select": True,
    "history_days": 90,
    "n_bootstrap": 100
    # NOTE: No group_by parameter!
}

print(f"   Payload: {payload}")
response = requests.post(f"{API_BASE_URL}/forecast", json=payload, timeout=300)

if response.status_code == 200:
    print(f"   ✅ Forecast generated successfully!")
    data = response.json()
    print(f"   Training: {data['training']['duration_seconds']:.2f}s")
    print(f"   Prediction: {data['prediction']['duration_seconds']:.2f}s")
else:
    print(f"   ❌ Forecast failed (Status {response.status_code})")
    print(f"   Response: {response.text}")

