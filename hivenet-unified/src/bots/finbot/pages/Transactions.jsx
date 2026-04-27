import { useState, useEffect } from 'react';
import { fetchTransactions, postTransaction } from '../api.js';
import { Card, StatCard, Badge, Modal, Field, Input, Select, fmt } from '@/components.jsx';
import { Icons } from '@/icons.jsx';

const CATEGORIES = ['Sales', 'Salaries', 'Marketing', 'Operations', 'Software', 'Services', 'Other'];

export default function Transactions() {
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [sortKey,    setSortKey]    = useState('date');
  const [sortDir,    setSortDir]    = useState('desc');
  const [filterType, setFilter]     = useState('All');
  const [search,     setSearch]     = useState('');
  const [modal,      setModal]      = useState(false);
  const [form,       setForm]       = useState({ type: 'Income', amount: '', category: 'Sales', description: '', date: '' });
  const [formError,  setFormError]  = useState('');

  const loadTransactions = () => {
    setLoading(true);
    fetchTransactions()
      .then(data => { setRows(data); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTransactions(); }, []);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = rows
    .filter(r => filterType === 'All' || r.type === filterType)
    .filter(r => !search || r.description.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === 'amount') { av = Math.abs(av); bv = Math.abs(bv); }
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const SortIcon = ({ col }) => sortKey === col
    ? (sortDir === 'asc' ? <Icons.ChevronUp size={12} /> : <Icons.ChevronDown size={12} />)
    : <Icons.ChevronDown size={12} className="opacity-30" />;

  const Th = ({ label, col }) => (
    <th className="px-4 py-3 text-left cursor-pointer select-none group" onClick={() => handleSort(col)}>
      <div className="flex items-center gap-1 text-[11px] font-semibold text-fb-muted uppercase tracking-wider group-hover:text-fb-accent transition-colors">
        {label} <SortIcon col={col} />
      </div>
    </th>
  );

  const handleAdd = async () => {
    if (!form.amount || !form.date) { setFormError('Amount and date are required.'); return; }
    setFormError('');
    setSaving(true);
    try {
      await postTransaction(form);
      setModal(false);
      setForm({ type: 'Income', amount: '', category: 'Sales', description: '', date: '' });
      loadTransactions();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const totalIncome  = rows.filter(r => r.type === 'Income').reduce((s, r) => s + r.amount, 0);
  const totalExpense = rows.filter(r => r.type === 'Expense').reduce((s, r) => s + Math.abs(r.amount), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Income"  color="green" value={fmt(totalIncome)}              sub={`${rows.filter(r=>r.type==='Income').length} transactions`}  icon={<Icons.TrendUp size={16}/>} />
        <StatCard label="Total Expense" color="red"   value={fmt(totalExpense)}             sub={`${rows.filter(r=>r.type==='Expense').length} transactions`} icon={<Icons.TrendDown size={16}/>} />
        <StatCard label="Net"           color="blue"  value={fmt(totalIncome - totalExpense)} sub="All time"                                                   icon={<Icons.Analytics size={16}/>} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-fb-border flex-wrap">
          <div className="flex items-center gap-2 bg-fb-card2 border border-fb-border rounded-lg px-3 py-2 flex-1 min-w-40">
            <Icons.Search size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-xs text-fb-text placeholder-fb-dim outline-none flex-1" placeholder="Search transactions…" />
          </div>
          <div className="flex gap-1">
            {['All', 'Income', 'Expense'].map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filterType === t ? 'bg-fb-accent text-fb-sidebar font-semibold' : 'bg-fb-card2 text-fb-muted border border-fb-border hover:border-fb-accent/50'}`}>
                {t}
              </button>
            ))}
          </div>
          <button onClick={() => { setFormError(''); setModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg btn-primary text-xs">
            <Icons.Plus size={14} /> Add Transaction
          </button>
        </div>

        {loading && <div className="py-12 text-center text-fb-muted text-sm">Loading transactions…</div>}
        {error   && <div className="py-12 text-center text-fb-red text-sm">Error: {error}</div>}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-fb-card2/50">
                <tr><Th label="Date" col="date" /><Th label="Type" col="type" /><Th label="Amount" col="amount" /><Th label="Category" col="category" /><Th label="Description" col="description" /></tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={row.id} className={`border-t border-fb-border/50 hover:bg-fb-card2/30 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="px-4 py-3 text-xs font-mono text-fb-muted">{row.date}</td>
                    <td className="px-4 py-3"><Badge label={row.type} color={row.type} /></td>
                    <td className={`px-4 py-3 text-sm font-bold font-mono ${row.amount > 0 ? 'text-fb-green' : 'text-fb-red'}`}>{row.amount > 0 ? '+' : ''}{fmt(row.amount)}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-fb-card2 border border-fb-border text-fb-muted">{row.category}</span></td>
                    <td className="px-4 py-3 text-xs text-fb-muted max-w-xs truncate">{row.description}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-fb-muted text-sm">No transactions match the filter.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && <div className="px-4 py-3 border-t border-fb-border text-xs text-fb-muted">Showing {filtered.length} of {rows.length} transactions</div>}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Transaction">
        <div className="space-y-4">
          <Field label="Type">
            <div className="flex gap-2">
              {['Income', 'Expense'].map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${form.type === t ? (t === 'Income' ? 'bg-fb-green-dim border-fb-green text-fb-green' : 'bg-fb-red-dim border-fb-red text-fb-red') : 'border-fb-border text-fb-muted hover:border-fb-dim'}`}>
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Amount"><Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></Field>
          <Field label="Category">
            <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Description"><Input placeholder="Brief description…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></Field>
          <Field label="Date (dd-mm-yyyy)"><Input placeholder="dd-mm-yyyy" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
          {formError && <p className="text-xs text-fb-red">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-lg btn-ghost text-sm">Cancel</button>
            <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 rounded-lg btn-primary text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Transaction'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
