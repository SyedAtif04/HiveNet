# PRISMA Quick Start Guide

## Prerequisites

- Python 3.12+
- Node.js 18+
- Ollama running with Mistral 7B model
- Git

## Installation

### 1. Install Backend Dependencies

```bash
# Install FastAPI backend dependencies
pip install -r prisma_backend/requirements.txt

# Verify ML pipeline dependencies (should already be installed)
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies

```bash
cd PRISM/prism-FE
npm install
cd ../..
```

## Running the Application

### Option 1: Manual Start (Recommended for Testing)

#### Terminal 1: Start Backend
```bash
uvicorn prisma_backend.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

#### Terminal 2: Start Frontend
```bash
cd PRISM/prism-FE
npm run dev
```

You should see:
```
  VITE v5.4.19  ready in XXX ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Option 2: Using Start Scripts

#### Windows (PowerShell)
```powershell
# Start backend
.\start_backend.ps1

# In another terminal, start frontend
cd PRISM\prism-FE
npm run dev
```

#### Linux/Mac
```bash
# Start backend
python start_backend.py

# In another terminal, start frontend
cd PRISM/prism-FE
npm run dev
```

## Testing the Integration

### Step 1: Verify Services are Running

1. **Backend Health Check**
   - Open browser: `http://localhost:8000/status/health`
   - Should return:
     ```json
     {
       "status": "healthy",
       "service": "PRISMA Forecast API",
       "version": "1.0.0",
       "timestamp": "...",
       "ml_pipeline_available": true
     }
     ```

2. **Frontend**
   - Open browser: `http://localhost:8080`
   - You should see the PRISMA dashboard
   - If no forecast data exists yet, you'll see "No Forecast Data Available"

### Step 2: Upload Dataset and Generate Forecast

1. **Navigate to Upload Page**
   - Click "Upload Dataset" button or go to `http://localhost:8080/upload`

2. **Select Upload Mode**
   - Choose "New Schema Upload" (default)

3. **Upload CSV File**
   - Click the upload zone or drag & drop a CSV file
   - Recommended test file: Use any CSV from `prisma_forecast/data/` directory
   - Example: `material_demand_sample.csv`

4. **Select Forecast Duration**
   - Choose from dropdown:
     - **3 Months (90 days)** - Fastest, good for testing
     - **6 Months (180 days)** - Medium duration
     - **12 Months (365 days)** - Longest forecast

5. **Generate Forecast**
   - Click "Upload & Generate Forecast"
   - Watch the progress:
     - ✓ Uploading (file transfer)
     - ✓ Validating (file check)
     - ✓ Processing (ML training + prediction)
     - ✓ Complete

6. **View Results**
   - Automatically redirected to `/forecast` page
   - See forecast table with all materials
   - View charts and predictions

### Step 3: Explore the Dashboard

1. **Home Page** (`/`)
   - View aggregated KPIs
   - See total predicted demand
   - Check forecast horizon
   - View recent activity

2. **Forecast Page** (`/forecast`)
   - Browse material-by-material forecasts
   - Filter by category
   - Search for specific materials
   - View confidence intervals
   - Export data (CSV/PDF/Excel)

3. **Data Upload Page** (`/upload`)
   - Upload new datasets
   - Generate new forecasts with different durations

## API Endpoints Reference

### Upload
- **POST** `http://localhost:8000/upload`
  - Upload CSV file
  - Returns: File path and metadata

### Forecast
- **POST** `http://localhost:8000/forecast`
  - Generate forecast (train + predict)
  - Body: `{ duration, data_path, feature_select, group_by, ... }`

- **GET** `http://localhost:8000/forecast/results/3_months`
  - Retrieve 3-month forecast data
  - Also available: `6_months`, `12_months`

### Status
- **GET** `http://localhost:8000/status/health`
  - Health check

- **GET** `http://localhost:8000/status`
  - Detailed service status

- **GET** `http://localhost:8000/status/config`
  - Configuration info

## Troubleshooting

### Backend Issues

**Error: "ModuleNotFoundError: No module named 'fastapi'"**
```bash
pip install -r prisma_backend/requirements.txt
```

**Error: "Address already in use"**
```bash
# Port 8000 is occupied, use a different port
uvicorn prisma_backend.main:app --reload --port 8001

# Update frontend .env file
echo "VITE_API_BASE_URL=http://localhost:8001" > PRISM/prism-FE/.env
```

**Error: "ML pipeline not available"**
```bash
# Verify ML pipeline works
cd prisma_forecast
python src/cli_new.py --help
```

### Frontend Issues

**Error: "Failed to fetch"**
- Check backend is running on port 8000
- Verify CORS settings in `prisma_backend/main.py`
- Check `.env` file in `PRISM/prism-FE/`

**Error: "No forecast data available"**
- Upload a dataset first
- Generate a forecast
- Check `prisma_backend/results/` directory has JSON files

**Blank page or errors in console**
```bash
# Reinstall dependencies
cd PRISM/prism-FE
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### ML Pipeline Issues

**Error: "Ollama not running"**
```bash
# Start Ollama
ollama serve

# In another terminal, pull Mistral model
ollama pull mistral
```

**Error: "Training failed"**
- Check CSV file format
- Ensure required columns exist
- Check logs in terminal for detailed error

## File Locations

### Uploaded Files
- `prisma_backend/uploads/` - Original uploads
- `prisma_forecast/data/` - Copied for ML pipeline

### Forecast Results
- `prisma_forecast/forecasts/` - ML pipeline output
- `prisma_backend/results/` - Copied for API access

### Logs
- `prisma_backend/logs/` - Backend logs (if configured)
- Terminal output - Real-time logs

## Sample Workflow

```bash
# 1. Start services
uvicorn prisma_backend.main:app --reload --port 8000
# (in another terminal)
cd PRISM/prism-FE && npm run dev

# 2. Open browser
http://localhost:8080

# 3. Upload dataset
# - Go to /upload
# - Select CSV file
# - Choose "3 Months"
# - Click "Upload & Generate Forecast"

# 4. Wait for processing (30-60 seconds)

# 5. View results
# - Automatically redirected to /forecast
# - Explore charts and tables
# - Navigate to / for dashboard

# 6. Generate new forecast
# - Go to /upload
# - Upload same or different file
# - Choose different duration
# - Repeat
```

## Next Steps

1. **Test with your own data**
   - Prepare CSV with material demand data
   - Upload and generate forecast
   - Validate results

2. **Explore API**
   - Visit `http://localhost:8000/docs` for interactive API docs
   - Test endpoints with Swagger UI

3. **Customize**
   - Adjust forecast parameters
   - Modify frontend styling
   - Add new features

## Support

For issues or questions:
1. Check `INTEGRATION_GUIDE.md` for detailed documentation
2. Review backend logs in terminal
3. Check browser console for frontend errors
4. Verify all services are running

## Summary

✅ Backend running on `http://localhost:8000`
✅ Frontend running on `http://localhost:8080`
✅ Upload → Forecast → Display workflow complete
✅ Real-time ML pipeline integration
✅ Production-ready architecture

Happy forecasting! 🚀

