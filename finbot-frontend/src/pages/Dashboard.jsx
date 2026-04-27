import { MOCK_SUMMARY, MOCK_MONTHLY, MOCK_CATEGORIES, MOCK_PREDICTIONS, MOCK_ALERTS } from '../data.js';
import { Card, CardHeader, StatCard, ActionCard, AlertRow, PredCard, fmt } from '../components.jsx';
import { Icons } from '../icons.jsx';
import { LineChart, DonutChart, SparkLine } from '../charts.jsx';

export default function Dashboard({ onNavigate }) {
  return (
    <div className="space-y-5 fade-in">
      <div className="grid grid-cols-4 gap-4">
        <ActionCard label="Upload Data"    sub="Import new data"      icon={<Icons.Upload size={18} />}      onClick={() => onNavigate('upload')} />
        <ActionCard label="Quick Forecast" sub="Generate predictions" icon={<Icons.Predictions size={18} />} onClick={() => onNavigate('predictions')} />
        <ActionCard label="View Reports"   sub="Analytics & insights" icon={<Icons.Analytics size={18} />}   onClick={() => onNavigate('analytics')} />
        <ActionCard label="AI Assistant"   sub="Chat with your data"  icon={<Icons.AIAssistant size={18} />} onClick={() => onNavigate('ai')} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Income"  color="green" value={fmt(MOCK_SUMMARY.income)}  sub="Jan – Jun 2026" trend="+14.2% vs last period" trendUp={true}  icon={<Icons.TrendUp size={16} />} />
        <StatCard label="Total Expense" color="red"   value={fmt(MOCK_SUMMARY.expense)} sub="Jan – Jun 2026" trend="+6.8% vs last period"  trendUp={false} icon={<Icons.TrendDown size={16} />} />
        <StatCard label="Net Profit"    color="blue"  value={fmt(MOCK_SUMMARY.profit)}  sub="Margin: 29.3%"  trend="+21.5% vs last period" trendUp={true}  icon={<Icons.TrendUp size={16} />} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 p-5">
          <CardHeader
            title="Monthly Income vs Expense"
            subtitle="Revenue performance over 6 months"
            action={
              <div className="flex gap-1">
                {['1M','3M','6M'].map(t => (
                  <button key={t} className="text-[10px] px-2 py-1 rounded border border-fb-border text-fb-muted hover:border-fb-accent/50 hover:text-fb-accent transition-colors btn-ghost">{t}</button>
                ))}
              </div>
            }
          />
          <LineChart data={MOCK_MONTHLY} height={220} />
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5 flex-1">
            <CardHeader title="Alerts" subtitle={`${MOCK_ALERTS.length} active`}
              action={<span className="text-[10px] text-fb-accent cursor-pointer hover:underline">View all</span>} />
            <div className="space-y-2">
              {MOCK_ALERTS.map(a => <AlertRow key={a.id} {...a} />)}
            </div>
          </Card>
          <Card className="p-5">
            <CardHeader title="Quick Stats" />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-fb-card2 rounded-lg p-3 border border-fb-border">
                <div className="text-[10px] text-fb-muted mb-1">Transactions</div>
                <div className="text-xl font-bold font-mono text-fb-accent">{MOCK_SUMMARY.transactions}</div>
                <div className="text-[10px] text-fb-green mt-1">+6.3% ↑</div>
              </div>
              <div className="bg-fb-card2 rounded-lg p-3 border border-fb-border">
                <div className="text-[10px] text-fb-muted mb-1">Avg Profit</div>
                <div className="text-xl font-bold font-mono text-fb-blue">{fmt(MOCK_SUMMARY.avgProfit)}</div>
                <div className="text-[10px] text-fb-green mt-1">+12.5% ↑</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-1 p-5">
          <CardHeader title="Category Breakdown" subtitle="Expense distribution" />
          <DonutChart data={MOCK_CATEGORIES} height={200} />
        </Card>
        <Card className="col-span-2 p-5">
          <CardHeader title="Financial Predictions" subtitle="AI-powered forecast"
            action={<button onClick={() => onNavigate('predictions')} className="text-[10px] text-fb-accent hover:underline cursor-pointer">Full forecast →</button>} />
          <div className="grid grid-cols-3 gap-4">
            <PredCard period="Next Month"   data={MOCK_PREDICTIONS.nextMonth}   />
            <PredCard period="Next Quarter" data={MOCK_PREDICTIONS.nextQuarter} />
            <PredCard period="Next Year"    data={MOCK_PREDICTIONS.nextYear}    />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <CardHeader title="Profit Trend" subtitle="Net profit across 6 months"
          action={<span className="text-xs font-mono text-fb-accent font-bold">{fmt(MOCK_SUMMARY.profit)} total</span>} />
        <SparkLine data={MOCK_MONTHLY} height={280} />
      </Card>
    </div>
  );
}
