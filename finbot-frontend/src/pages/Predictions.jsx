import { MOCK_PREDICTIONS, MOCK_MONTHLY } from '../data.js';
import { Card, CardHeader, Badge, fmt } from '../components.jsx';
import { Icons } from '../icons.jsx';
import { SparkLine } from '../charts.jsx';

const Row = ({ label, val, trend, up }) => (
  <div className="flex items-center justify-between py-3 border-b border-fb-border/50 last:border-0">
    <span className="text-sm text-fb-muted">{label}</span>
    <div className="flex items-center gap-4">
      <span className={`text-base font-bold font-mono ${up ? 'text-fb-green' : 'text-fb-red'}`}>{fmt(val)}</span>
      <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${up ? 'bg-fb-green-dim text-fb-green' : 'bg-fb-red-dim text-fb-red'}`}>
        {up ? <Icons.ArrowUp size={10} /> : <Icons.ArrowDown size={10} />} {trend}
      </div>
    </div>
  </div>
);

const BigCard = ({ title, data, accent }) => (
  <Card className="p-6" style={{ borderColor: accent + '33' }}>
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: accent + '22' }}>
        <Icons.Predictions size={20} style={{ color: accent }} />
      </div>
      <div>
        <h3 className="text-base font-bold text-fb-text">{title}</h3>
        <p className="text-xs text-fb-muted">AI-powered forecast</p>
      </div>
    </div>
    <Row label="Projected Income"  val={data.income}  trend={data.incomeTrend}  up={true}  />
    <Row label="Projected Expense" val={data.expense} trend={data.expenseTrend} up={false} />
    <Row label="Projected Profit"  val={data.profit}  trend={data.profitTrend}  up={true}  />
    <div className="mt-4 p-3 rounded-lg" style={{ background: accent + '11', border: `1px solid ${accent}33` }}>
      <p className="text-xs" style={{ color: accent }}>Based on 6-month historical data · Model accuracy: 94.2%</p>
    </div>
  </Card>
);

export default function Predictions() {
  const preds = MOCK_PREDICTIONS;
  const forecastData = [
    ...MOCK_MONTHLY,
    { month: 'Jul', income: 25400, expense: 15800 },
    { month: 'Aug', income: 26200, expense: 16100 },
    { month: 'Sep', income: 27000, expense: 16500 },
  ];

  return (
    <div className="space-y-5 fade-in">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-fb-text">Financial Predictions</h2>
            <p className="text-xs text-fb-muted mt-1">AI-powered forecasts using LSTM model trained on your transaction history</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-fb-green-dim border border-fb-green/20">
            <div className="w-1.5 h-1.5 rounded-full bg-fb-green"></div>
            <span className="text-xs text-fb-green font-medium">Model Active · 94.2% accuracy</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-5">
        <BigCard title="Next Month"   data={preds.nextMonth}   accent="#3ecf8e" />
        <BigCard title="Next Quarter" data={preds.nextQuarter} accent="#4c9eff" />
        <BigCard title="Next Year"    data={preds.nextYear}    accent="#f5c518" />
      </div>

      <Card className="p-5">
        <CardHeader title="Profit Forecast Trend" subtitle="Projected monthly profit trajectory" />
        <SparkLine data={forecastData} color="#4c9eff" height={120} />
        <div className="flex justify-end gap-2 mt-3">
          <Badge label="Historical" color="default" />
          <Badge label="Forecast →" color="Income" />
        </div>
      </Card>

      <Card className="p-5">
        <CardHeader title="Model Assumptions" />
        <div className="grid grid-cols-3 gap-4">
          {[
            ['Training Period', '24 months',  '#f5c518'],
            ['Seasonality',     'Monthly',    '#4c9eff'],
            ['Growth Rate',     '+8.2% MoM',  '#3ecf8e'],
            ['Confidence',      '94.2%',      '#3ecf8e'],
            ['Last Updated',    '26-04-2026', '#6b6b88'],
            ['Data Points',     '1,240 tx',   '#f5c518'],
          ].map(([l, v, c]) => (
            <div key={l} className="bg-fb-card2 rounded-lg p-3 border border-fb-border">
              <div className="text-[10px] text-fb-muted mb-1">{l}</div>
              <div className="text-sm font-bold font-mono" style={{ color: c }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
