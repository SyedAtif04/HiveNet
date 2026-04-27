const BASE = '/finbot';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CAT_COLORS  = ['#f5c518','#3ecf8e','#4c9eff','#9966ff','#e05555','#6b6b88'];

function fmtMonth(ym) {
  const idx = parseInt(ym.split('-')[1], 10) - 1;
  return MONTH_SHORT[idx] ?? ym;
}

function fmtTxDate(isoStr) {
  const d = new Date(isoStr);
  const dd  = String(d.getDate()).padStart(2, '0');
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

export async function fetchSummary(startDate, endDate) {
  let url = `${BASE}/summary`;
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (params.toString()) url += `?${params.toString()}`;

  const r = await fetch(url);
  if (!r.ok) throw new Error('Failed to load summary');
  const d = await r.json();
  return { income: d.total_income, expense: d.total_expense, profit: d.profit };
}

export async function fetchMonthly(startDate, endDate) {
  let url = `${BASE}/summary/monthly`;
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (params.toString()) url += `?${params.toString()}`;

  const r = await fetch(url);
  if (!r.ok) throw new Error('Failed to load monthly data');
  const { monthly } = await r.json();
  return monthly.map(m => ({ month: fmtMonth(m.month), income: m.income, expense: m.expense }));
}

export async function fetchCategories(startDate, endDate) {
  let url = `${BASE}/summary/category`;
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (params.toString()) url += `?${params.toString()}`;

  const r = await fetch(url);
  if (!r.ok) throw new Error('Failed to load categories');
  const { expenses_by_category } = await r.json();
  const total = expenses_by_category.reduce((s, c) => s + c.amount, 0) || 1;
  return expenses_by_category.map((c, i) => ({
    name:   c.category || 'Other',
    amount: c.amount,
    pct:    Math.round((c.amount / total) * 100),
    color:  CAT_COLORS[i % CAT_COLORS.length],
  }));
}

export async function fetchPredictions() {
  const r = await fetch(`${BASE}/summary/predict`);
  if (!r.ok) throw new Error('Failed to load predictions');
  const d = await r.json();
  const card = (p) => ({
    income:       Math.round(p.income),
    expense:      Math.round(p.expense),
    profit:       Math.round(p.profit),
    incomeTrend:  '',
    expenseTrend: '',
    profitTrend:  '',
  });
  return {
    nextMonth:   card(d.next_month),
    nextQuarter: card(d.next_quarter),
    nextYear:    card(d.next_year),
    method:      d.method,
  };
}

export async function fetchTransactions() {
  const r = await fetch(`${BASE}/transactions`);
  if (!r.ok) throw new Error('Failed to load transactions');
  const list = await r.json();
  return list.map(t => {
    const type = t.type === 'income' ? 'Income' : 'Expense';
    return {
      id:          t.id,
      date:        fmtTxDate(t.date),
      type,
      amount:      type === 'Income' ? t.amount : -t.amount,
      category:    t.category || 'Other',
      description: t.description || '',
    };
  });
}

export async function fetchTransactionItems(transactionId) {
  const r = await fetch(`${BASE}/transactions/${transactionId}/items`);
  if (!r.ok) throw new Error('Failed to load items');
  const items = await r.json();
  return items.map(item => ({
    id:            item.id,
    productName:   item.product_name,
    quantity:      item.quantity,
    price:         item.price,
    total:         item.quantity * item.price,
  }));
}

export async function postTransaction(form) {
  const body = {
    type:        form.type.toLowerCase(),
    amount:      parseFloat(form.amount),
    category:    form.category,
    description: form.description || '',
    date:        form.date,
    items:       [],
  };
  const r = await fetch(`${BASE}/transactions`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to save transaction');
  }
  return r.json();
}
