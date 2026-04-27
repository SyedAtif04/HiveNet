export const MOCK_SUMMARY = {
  income:       124800,
  expense:       88200,
  profit:        36600,
  transactions:    342,
  avgProfit:      1220,
};

export const MOCK_MONTHLY = [
  { month: 'Jan', income: 18000, expense: 14200 },
  { month: 'Feb', income: 21400, expense: 15500 },
  { month: 'Mar', income: 19200, expense: 12800 },
  { month: 'Apr', income: 23600, expense: 16400 },
  { month: 'May', income: 22100, expense: 15100 },
  { month: 'Jun', income: 20500, expense: 14200 },
];

export const MOCK_CATEGORIES = [
  { name: 'Salaries',    amount: 42000, pct: 47, color: '#f5c518' },
  { name: 'Operations',  amount: 18000, pct: 20, color: '#3ecf8e' },
  { name: 'Marketing',   amount: 15200, pct: 17, color: '#4c9eff' },
  { name: 'Software',    amount:  8000, pct:  9, color: '#9966ff' },
  { name: 'Other',       amount:  5000, pct:  7, color: '#e05555' },
];

export const MOCK_TRANSACTIONS = [
  { id: 1,  date: '12-04-2026', type: 'Income',  amount:  4200, category: 'Sales',      description: 'Q2 product revenue' },
  { id: 2,  date: '10-04-2026', type: 'Expense', amount: -1800, category: 'Salaries',   description: 'March payroll batch' },
  { id: 3,  date: '08-04-2026', type: 'Expense', amount:  -620, category: 'Marketing',  description: 'Google Ads campaign' },
  { id: 4,  date: '05-04-2026', type: 'Income',  amount:   900, category: 'Services',   description: 'Consulting retainer' },
  { id: 5,  date: '01-04-2026', type: 'Expense', amount:  -340, category: 'Software',   description: 'AWS monthly bill' },
  { id: 6,  date: '28-03-2026', type: 'Income',  amount:  2100, category: 'Sales',      description: 'Retail channel Q1' },
  { id: 7,  date: '25-03-2026', type: 'Expense', amount:  -500, category: 'Marketing',  description: 'Event sponsorship' },
  { id: 8,  date: '22-03-2026', type: 'Income',  amount:  3800, category: 'Sales',      description: 'Enterprise contract' },
  { id: 9,  date: '18-03-2026', type: 'Expense', amount: -1200, category: 'Operations', description: 'Office rent' },
  { id: 10, date: '15-03-2026', type: 'Income',  amount:  1500, category: 'Services',   description: 'Support package' },
  { id: 11, date: '10-03-2026', type: 'Expense', amount:  -450, category: 'Software',   description: 'SaaS subscriptions' },
  { id: 12, date: '05-03-2026', type: 'Income',  amount:  6200, category: 'Sales',      description: 'Annual license deal' },
];

export const MOCK_PREDICTIONS = {
  nextMonth: {
    income:  25400, expense: 15800, profit:  9600,
    incomeTrend: '+8.2%', expenseTrend: '+2.1%', profitTrend: '+12.4%',
  },
  nextQuarter: {
    income:  74000, expense: 44500, profit: 29500,
    incomeTrend: '+11.6%', expenseTrend: '+3.8%', profitTrend: '+18.2%',
  },
  nextYear: {
    income: 298000, expense: 172000, profit: 126000,
    incomeTrend: '+21.3%', expenseTrend: '+8.5%', profitTrend: '+31.4%',
  },
};

export const MOCK_ALERTS = [
  { id: 1, level: 'error',   message: 'Expense spike in April — +18% vs prior month', time: '2h ago' },
  { id: 2, level: 'warning', message: 'Marketing budget reached 91% of limit',         time: '5h ago' },
  { id: 3, level: 'warning', message: 'Q1 anomaly detected in operations costs',       time: '1d ago' },
  { id: 4, level: 'info',    message: 'Forecast accuracy improved to 94.2%',           time: '2d ago' },
];

export const MOCK_KNOWLEDGE = [
  { id: 1, title: 'Q1 2026 Financial Report',    score: 0.94, tags: ['report', 'Q1'],         preview: 'Total Q1 income reached $62,100 with a net profit margin of 28.4%...' },
  { id: 2, title: 'Budget Plan FY2026',          score: 0.87, tags: ['budget', 'planning'],   preview: 'Annual budget allocates 48% to salaries, 20% operations, 17% marketing...' },
  { id: 3, title: 'Expense Policy Guidelines',   score: 0.82, tags: ['policy', 'compliance'], preview: 'All expenses above $1,000 require manager approval and documentation...' },
  { id: 4, title: 'Forecast Model v3.2',         score: 0.79, tags: ['forecast', 'AI'],       preview: 'LSTM-based model trained on 24 months of transaction data with 94% accuracy...' },
  { id: 5, title: 'Cash Flow Analysis Mar 2026', score: 0.73, tags: ['cashflow'],             preview: 'March showed positive cash flow of $6,400 driven by enterprise contract wins...' },
];

export const MOCK_CHAT = [
  { role: 'bot',  text: "Hello! I'm FinBot AI. Ask me anything about your financial data — income trends, expense analysis, forecasts, or anomalies." },
  { role: 'user', text: 'What was my biggest expense category last quarter?' },
  { role: 'bot',  text: 'Your largest expense in Q1 2026 was **Salaries** at $42,000 (47% of total expenses), followed by **Operations** at $18,000 (20%). Would you like a detailed breakdown by month?' },
];
