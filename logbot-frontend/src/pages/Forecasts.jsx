import { MOCK_FORECASTS, MOCK_FORECAST_MONTHLY, MOCK_CATEGORIES } from '../data.js';
import { Card, CardHeader, ForecastCard } from '../components.jsx';
import { Icons } from '../icons.jsx';
import { DualLineChart, BarChart } from '../charts.jsx';

const MODEL_INFO = [
  { label: 'Algorithm',      value: 'LightGBM + ETS + TFT Ensemble' },
  { label: 'Training Period', value: '24 months (May 2024 – Apr 2026)' },
  { label: 'Seasonality',    value: 'Detected (weekly + monthly)' },
  { label: 'Bootstrap Runs', value: '100 iterations' },
  { label: 'Last Trained',   value: 'Apr 27, 2026' },
  { label: 'Data Points',    value: '52,416 records' },
];

const categoryForecast = MOCK_CATEGORIES.map((c, i) => ({
  name: c.name.split(' ')[0],
  threeM: Math.round(1380 * (c.pct / 100)),
  sixM:   Math.round(2780 * (c.pct / 100)),
  trend:  `+${(4 + i * 1.6).toFixed(1)}%`,
  color:  c.color,
}));

export default function Forecasts() {
  return (
    <div className="space-y-5 fade-in">
      <div className="grid grid-cols-3 gap-4">
        <ForecastCard period="Next 3 Months"  data={MOCK_FORECASTS.threeMonth}  />
        <ForecastCard period="Next 6 Months"  data={MOCK_FORECASTS.sixMonth}    />
        <ForecastCard period="Next 12 Months" data={MOCK_FORECASTS.twelveMonth} />
      </div>

      <Card className="p-5">
        <CardHeader
          title="12-Month Demand Forecast"
          subtitle="Predicted demand with confidence band (May 2026 – Apr 2027)"
          action={
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-fb-green-dim border border-fb-green/20">
              <div className="w-1.5 h-1.5 rounded-full bg-fb-green"></div>
              <span className="text-[10px] text-fb-green font-medium">Model accuracy: 94.2%</span>
            </div>
          }
        />
        <DualLineChart
          data={MOCK_FORECAST_MONTHLY}
          label1="Forecast" label2="Lower Bound"
          key1="demand" key2="lower"
          color1="#4c9eff" color2="#9966ff"
          height={260}
        />
      </Card>

      <div className="grid grid-cols-3 gap-5">
        <Card className="col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-fb-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-fb-text">Forecast by Category</h3>
              <p className="text-xs text-fb-muted mt-0.5">Demand split across product categories</p>
            </div>
          </div>
          <table className="w-full">
            <thead className="bg-fb-card2/50">
              <tr>
                {['Category', '3-Month', '6-Month', 'Growth Trend'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-fb-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categoryForecast.map(c => (
                <tr key={c.name} className="border-t border-fb-border/50 hover:bg-fb-card2/20">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }}></div>
                      <span className="text-sm text-fb-text">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm font-bold font-mono text-fb-accent">{c.threeM.toLocaleString()} units</td>
                  <td className="px-5 py-3 text-sm font-bold font-mono text-fb-blue">{c.sixM.toLocaleString()} units</td>
                  <td className="px-5 py-3 text-xs text-fb-green font-medium">{c.trend} MoM</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <CardHeader title="Model Info" subtitle="Ensemble configuration" />
          <div className="space-y-3">
            {MODEL_INFO.map(m => (
              <div key={m.label} className="flex flex-col gap-0.5 py-2.5 border-b border-fb-border/50 last:border-0">
                <span className="text-[10px] font-medium text-fb-muted uppercase tracking-wider">{m.label}</span>
                <span className="text-xs text-fb-text">{m.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <button className="w-full py-2.5 rounded-lg btn-primary text-xs flex items-center justify-center gap-2">
              <Icons.Refresh size={13} /> Retrain Model
            </button>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <CardHeader
          title="Upper Bound Forecast"
          subtitle="Optimistic scenario — 95th percentile demand"
          action={<span className="text-xs text-fb-muted">Use for safety stock planning</span>}
        />
        <DualLineChart
          data={MOCK_FORECAST_MONTHLY}
          label1="Upper Bound" label2="Forecast"
          key1="upper" key2="demand"
          color1="#e05555" color2="#f5c518"
          height={180}
        />
      </Card>
    </div>
  );
}
