import { useState, useEffect, useRef } from 'react';
import { fetchTransactions, fetchTransactionItems, postTransaction, fetchInventoryItems } from '../api.js';
import { Card, StatCard, Badge, Modal, Field, Input, Select, fmt } from '@/components.jsx';
import { Icons } from '@/icons.jsx';

const CATEGORIES = ['', 'Sales', 'Salaries', 'Marketing', 'Operations', 'Raw Materials', 'Finished Goods', 'Packaging', 'Logistics', 'Utilities', 'Office', 'Other'];

const emptyLine = () => ({ id: Date.now() + Math.random(), product_name: '', quantity: '', price: '' });

export default function Transactions() {
  const [rows,        setRows]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [sortKey,     setSortKey]     = useState('date');
  const [sortDir,     setSortDir]     = useState('desc');
  const [filterType,  setFilter]      = useState('All');
  const [search,      setSearch]      = useState('');
  const [modal,       setModal]       = useState(false);
  const [form,        setForm]        = useState({ type: 'Income', category: '', description: '', date: '' });
  const [lineItems,   setLineItems]   = useState([emptyLine()]);
  const [formError,   setFormError]   = useState('');
  const [itemsModal,    setItemsModal]    = useState(false);
  const [items,         setItems]         = useState([]);
  const [itemsLoading,  setItemsLoading]  = useState(false);
  const [invItems,      setInvItems]      = useState([]);
  const [suggestions,   setSuggestions]   = useState({});   // { lineId: [matches] }
  const suggestRef = useRef({});

  const invoiceTotal = lineItems.reduce((s, i) => {
    const qty = parseFloat(i.quantity) || 0;
    const prc = parseFloat(i.price) || 0;
    return s + qty * prc;
  }, 0);

  const updateLine = (id, field, value) =>
    setLineItems(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));

  const addLine = () => setLineItems(prev => [...prev, emptyLine()]);

  const removeLine = (id) => setLineItems(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);

  const openModal = () => {
    setFormError('');
    setForm({ type: 'Income', category: '', description: '', date: '' });
    setLineItems([emptyLine()]);
    setSuggestions({});
    setModal(true);
    fetchInventoryItems().then(setInvItems).catch(() => {});
  };

  const handleNameChange = (id, value) => {
    updateLine(id, 'product_name', value);
    if (value.trim().length < 1) { setSuggestions(s => ({ ...s, [id]: [] })); return; }
    const matches = invItems.filter(i =>
      i.product_name.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 6);
    setSuggestions(s => ({ ...s, [id]: matches }));
  };

  const pickSuggestion = (lineId, item) => {
    setLineItems(prev => prev.map(l =>
      l.id === lineId ? { ...l, product_name: item.product_name, price: item.unit_price > 0 ? String(item.unit_price) : l.price } : l
    ));
    setSuggestions(s => ({ ...s, [lineId]: [] }));
  };

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

  const handleViewItems = async (transactionId) => {
    setItemsLoading(true);
    try {
      const fetchedItems = await fetchTransactionItems(transactionId);
      setItems(fetchedItems);
      setItemsModal(true);
    } catch (e) {
      setItems([]);
      setItemsModal(true);
    } finally {
      setItemsLoading(false);
    }
  };

  const handleAdd = async () => {
    const validLines = lineItems.filter(l => l.product_name.trim() && parseFloat(l.quantity) > 0 && parseFloat(l.price) > 0);
    if (validLines.length === 0) { setFormError('Add at least one item with name, quantity, and price.'); return; }
    if (!form.date) { setFormError('Date is required.'); return; }
    setFormError('');
    setSaving(true);
    try {
      await postTransaction({ ...form, items: validLines });
      setModal(false);
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
          <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 rounded-lg btn-primary text-xs">
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
                    <td className="px-4 py-3 flex items-center gap-2 justify-between">
                      <span className="text-xs text-fb-muted max-w-xs truncate">{row.description}</span>
                      <button onClick={() => handleViewItems(row.id)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-fb-card2 border border-fb-border text-fb-muted hover:border-fb-accent/50 hover:text-fb-accent transition-colors whitespace-nowrap">
                        <Icons.ChevronDown size={10} /> Items
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-fb-muted text-sm">No transactions match the filter.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && <div className="px-4 py-3 border-t border-fb-border text-xs text-fb-muted">Showing {filtered.length} of {rows.length} transactions</div>}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="New Invoice" size="xl">
        <div className="space-y-5">

          {/* Type selector — full width, tall buttons */}
          <Field label="Type">
            <div className="grid grid-cols-2 gap-3">
              {['Income', 'Expense'].map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                    form.type === t
                      ? t === 'Income' ? 'bg-fb-green-dim border-fb-green text-fb-green' : 'bg-fb-red-dim border-fb-red text-fb-red'
                      : 'border-fb-border text-fb-muted hover:border-fb-dim'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </Field>

          {/* Date + Description row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date (dd-mm-yyyy)">
              <Input placeholder="dd-mm-yyyy" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field label="Description">
              <Input placeholder="Invoice description…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </Field>
          </div>

          {/* Category */}
          <Field label="Category">
            <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c || 'Auto-detect from items'}</option>)}
            </Select>
          </Field>

          {/* Items List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-fb-muted uppercase tracking-wider">Items List</span>
              <button onClick={addLine} className="flex items-center gap-1 text-[10px] text-fb-accent hover:underline">
                <Icons.Plus size={11} /> Add item
              </button>
            </div>

            {/* Column headers: Product | Qty | Unit Price | Qty Total | × */}
            <div className="grid grid-cols-[1fr_70px_110px_100px_28px] gap-2 mb-2 px-1">
              {['Product / Service', 'Qty', 'Unit Price (₹)', 'Qty Total', ''].map(h => (
                <span key={h} className="text-[10px] text-fb-muted uppercase tracking-wider">{h}</span>
              ))}
            </div>

            <div className="space-y-2">
              {lineItems.map(line => {
                const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.price) || 0);
                const suggs = suggestions[line.id] || [];
                return (
                  <div key={line.id} className="grid grid-cols-[1fr_70px_110px_100px_28px] gap-2 items-start">

                    {/* Product name with autocomplete */}
                    <div className="relative">
                      <input
                        value={line.product_name}
                        onChange={e => handleNameChange(line.id, e.target.value)}
                        onBlur={() => setTimeout(() => setSuggestions(s => ({ ...s, [line.id]: [] })), 150)}
                        placeholder="Item name…"
                        className="w-full bg-fb-card2 border border-fb-border rounded-lg px-3 py-2.5 text-xs text-fb-text placeholder-fb-dim outline-none focus:border-fb-accent/60 transition-colors"
                      />
                      {suggs.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-fb-card border border-fb-border rounded-lg shadow-xl overflow-hidden">
                          {suggs.map(s => (
                            <button key={s.product_name} onMouseDown={() => pickSuggestion(line.id, s)}
                              className="w-full text-left px-3 py-2 text-xs text-fb-text hover:bg-fb-card2 transition-colors flex items-center justify-between gap-2">
                              <span className="truncate">{s.product_name}</span>
                              <span className="text-[10px] text-fb-muted flex-shrink-0">
                                {s.quantity > 0 ? `${s.quantity} in stock` : 'out of stock'}
                                {s.unit_price > 0 ? ` · ₹${s.unit_price}` : ''}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Qty */}
                    <input
                      type="number" min="0"
                      value={line.quantity}
                      onChange={e => updateLine(line.id, 'quantity', e.target.value)}
                      placeholder="0"
                      className="bg-fb-card2 border border-fb-border rounded-lg px-2 py-2.5 text-xs text-fb-text placeholder-fb-dim outline-none focus:border-fb-accent/60 transition-colors text-center"
                    />

                    {/* Unit Price */}
                    <input
                      type="number" min="0" step="0.01"
                      value={line.price}
                      onChange={e => updateLine(line.id, 'price', e.target.value)}
                      placeholder="0.00"
                      className="bg-fb-card2 border border-fb-border rounded-lg px-3 py-2.5 text-xs text-fb-text placeholder-fb-dim outline-none focus:border-fb-accent/60 transition-colors text-right"
                    />

                    {/* Qty Total */}
                    <div className="flex items-center justify-end h-[38px]">
                      <span className={`text-xs font-mono font-semibold ${lineTotal > 0 ? (form.type === 'Income' ? 'text-fb-green' : 'text-fb-red') : 'text-fb-dim'}`}>
                        {lineTotal > 0 ? `₹${lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                      </span>
                    </div>

                    {/* Remove */}
                    <button onClick={() => removeLine(line.id)}
                      className="w-7 h-[38px] flex items-center justify-center rounded text-fb-dim hover:text-fb-red hover:bg-fb-red-dim transition-colors">
                      <Icons.X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Invoice Total */}
            <div className="flex justify-end items-center gap-3 mt-4 pt-4 border-t border-fb-border">
              <span className="text-sm text-fb-muted">Invoice Total</span>
              <span className={`text-2xl font-bold font-mono ${form.type === 'Income' ? 'text-fb-green' : 'text-fb-red'}`}>
                ₹{invoiceTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {formError && <p className="text-xs text-fb-red">{formError}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={() => setModal(false)} className="flex-1 py-3 rounded-xl btn-ghost text-sm">Cancel</button>
            <button onClick={handleAdd} disabled={saving || invoiceTotal === 0}
              className="flex-1 py-3 rounded-xl btn-primary text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Transaction'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={itemsModal} onClose={() => setItemsModal(false)} title="Transaction Items">
        {itemsLoading ? (
          <div className="py-8 text-center text-fb-muted text-sm">Loading items…</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-fb-muted text-sm">No items in this transaction</div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-fb-card2 border border-fb-border rounded-lg">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-fb-text">{item.productName}</div>
                  <div className="text-[10px] text-fb-muted mt-1">Qty: {item.quantity} × ${item.price.toFixed(2)}</div>
                </div>
                <div className="text-sm font-bold text-fb-accent">${item.total.toFixed(2)}</div>
              </div>
            ))}
            <div className="border-t border-fb-border pt-3 mt-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-fb-muted">Total Items:</span>
                <span className="font-semibold text-fb-text">{items.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold mt-2">
                <span className="text-fb-muted">Total Value:</span>
                <span className="text-fb-accent">${items.reduce((s, i) => s + i.total, 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
