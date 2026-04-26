# PRISMA System - Quick Start Guide

## ✅ System Status: READY

All components have been verified and are ready to run!

## 🚀 Starting the System

You need **3 terminals** to run the complete system:

### Terminal 1: Backend API

```bash
cd prisma_backend
python -m uvicorn main:app --reload --port 8000
```

**Alternative (from project root):**
```bash
python -m uvicorn prisma_backend.main:app --reload --port 8000
```

**Expected Output:**
```
INFO:     Starting PRISMA Backend API...
INFO:     Directories initialized: uploads, results
INFO:     ML Pipeline available: True
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Test it:** Open http://localhost:8000/docs in your browser

---

### Terminal 2: Frontend Application

```bash
cd PRISM/prism-FE
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Test it:** Open http://localhost:5173 in your browser

---

### Terminal 3: Ollama (if not already running)

```bash
ollama serve
```

Or just make sure Ollama is running in the background.

**Test it:**
```bash
ollama list
```

---

## 📊 Complete User Flow

### 1. **Access Frontend**
- Open browser: http://localhost:5173
- You'll see the PRISMA home page

### 2. **Sign In**
- Click "Sign In" or navigate to login
- Enter any credentials (authentication not implemented yet)
- You'll be redirected to the dashboard

### 3. **Upload Data**
- Navigate to "Data Upload" page
- Choose **"New Schema Upload"** (recommended for first time)
- Click the upload zone and select a CSV file
  - Sample file available: `prisma_backend/uploads/prisma_dataset.csv`
- Select **Forecast Duration**: 3 Months, 6 Months, or 12 Months
- Click **"Upload & Generate Forecast"**

### 4. **Processing Flow** (Automatic)

The system will:

1. **Upload** (20%) - File uploaded to backend
   - Saved to: `prisma_backend/uploads/`
   - Copied to: `prisma_forecast/data/`

2. **Validate** (40%) - Data validation
   - Checks file format
   - Validates columns

3. **Process** (60-100%) - ML Pipeline
   - **Training Phase:**
     - Ollama LLM identifies columns
     - Features generated
     - LightGBM models trained per material
     - Models saved to `prisma_forecast/saved_models/`
   
   - **Prediction Phase:**
     - Generates forecasts for selected horizon
     - Creates comprehensive JSON
     - Saved to `prisma_forecast/forecasts/`
     - Copied to `prisma_backend/results/`

4. **Complete** - Redirect to Forecast page

### 5. **View Forecast**
- Automatically redirected to `/forecast` page
- You'll see:
  - **KPI Metrics**: Total value, confidence, priorities
  - **Trend Chart**: Interactive forecast visualization
  - **Material Selector**: Choose specific materials or view all
  - **Data Table**: Detailed breakdown by material
  - **Export Options**: CSV, Excel, PDF

---

## 🔍 What Happens Behind the Scenes

### Backend Flow:
```
POST /upload
  ↓
Save to uploads/
  ↓
Copy to prisma_forecast/data/
  ↓
Clear results/
  ↓
POST /forecast
  ↓
Call ML CLI: train
  ↓
Call ML CLI: predict
  ↓
Copy forecast JSON to results/
  ↓
Return success
```

### ML Pipeline Flow:
```
cli_new.py train
  ↓
Load CSV data
  ↓
Ollama identifies date/quantity columns
  ↓
Validate & preprocess
  ↓
Generate features
  ↓
Train per-material models
  ↓
Save models

cli_new.py predict
  ↓
Load models
  ↓
Generate forecasts per material
  ↓
Aggregate forecasts
  ↓
Create comprehensive JSON
  ↓
Save to forecasts/
```

### Frontend Flow:
```
DataUpload.tsx
  ↓
uploadDataset(file)
  ↓
generateForecast(params)
  ↓
Navigate to /forecast
  ↓
Forecast.tsx
  ↓
getForecastResults('3_months')
  ↓
Display charts & tables
```

---

## 📁 File Locations

### Input Data:
- **User uploads to:** `prisma_backend/uploads/`
- **ML reads from:** `prisma_forecast/data/`

### ML Models:
- **Saved to:** `prisma_forecast/saved_models/`
- **Per-material:** `prisma_forecast/saved_models/material=<name>/`

### Forecast Output:
- **ML generates:** `prisma_forecast/forecasts/forecast_comprehensive_90d.json`
- **Backend serves from:** `prisma_backend/results/forecast_comprehensive_90d.json`
- **Frontend fetches:** `GET /forecast/results/3_months`

---

## 🎯 API Endpoints

### Upload
- `POST /upload` - Upload CSV file
- `GET /upload/info` - Get upload configuration

### Forecast
- `POST /forecast` - Generate complete forecast (train + predict)
- `POST /forecast/train` - Train models only
- `POST /forecast/predict` - Generate predictions only
- `GET /forecast/results/{duration}` - Get forecast data
  - Durations: `3_months`, `6_months`, `12_months`, `3m`, `6m`, `12m`

### Status
- `GET /` - API information
- `GET /status/health` - Health check
- `GET /status` - Service status
- `GET /docs` - Swagger UI documentation

---

## 🔧 Configuration

### Backend (prisma_backend/services/config.py)
- **Upload size limit:** 100 MB
- **Allowed extensions:** .csv
- **CORS origins:** localhost:3000, 5173, 8080
- **Duration mappings:**
  - 3_months → 90 days
  - 6_months → 180 days
  - 12_months → 365 days

### Frontend (PRISM/prism-FE/src/services/api.ts)
- **API Base URL:** http://localhost:8000
- **Override with:** `VITE_API_BASE_URL` environment variable

### ML Pipeline (prisma_forecast/src/cli_new.py)
- **Default history:** 90 days
- **Default bootstrap samples:** 100
- **Group by:** material (default)

---

## ✅ Verification Checklist

Before starting, ensure:

- [x] All directories exist (uploads, results, data, forecasts, saved_models)
- [x] Backend dependencies installed (fastapi, uvicorn, aiofiles)
- [x] ML dependencies installed (pandas, lightgbm, prophet)
- [x] Frontend dependencies installed (npm install completed)
- [x] Ollama installed and running
- [x] Sample data available in prisma_forecast/data/
- [x] CORS configured for Vite port (5173)

**Run verification:**
```bash
python verify_system.py
```

---

## 🐛 Troubleshooting

### Backend won't start
- Check if port 8000 is already in use
- Verify Python dependencies: `pip list`
- Check logs in `prisma_backend/logs/`

### Frontend won't connect
- Verify backend is running on port 8000
- Check CORS settings in config.py
- Open browser console for errors

### Forecast generation fails
- Check Ollama is running: `ollama list`
- Verify CSV file format (must have date and quantity columns)
- Check backend logs for ML pipeline errors
- Ensure models directory is writable

### No forecast data displayed
- Verify forecast JSON exists in `prisma_backend/results/`
- Check browser console for API errors
- Ensure forecast was generated for the selected duration

---

## 📞 Support

For detailed troubleshooting, see:
- `SYSTEM_VERIFICATION.md` - Complete verification guide
- Backend logs: `prisma_backend/logs/`
- Browser console: F12 → Console tab
- Backend API docs: http://localhost:8000/docs

---

## 🎉 Success Indicators

You know everything is working when:

1. ✅ Backend shows "ML Pipeline available: True"
2. ✅ Frontend loads without errors
3. ✅ File upload shows progress bar
4. ✅ Backend logs show training/prediction activity
5. ✅ Forecast page displays charts with data
6. ✅ Material dropdown shows all materials
7. ✅ Table shows forecast breakdown
8. ✅ Export buttons are functional

**Enjoy using PRISMA! 🚀**

