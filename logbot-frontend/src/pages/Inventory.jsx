import { useState } from 'react';
import { MOCK_INVENTORY } from '../data.js';
import { Card, StatCard, StockBadge, Modal, Field, Input, Select, fmt, fmtNum } from '../components.jsx';
import { Icons } from '../icons.jsx';

const CATEGORIES = ['Electronics', 'Furniture', 'Office Supplies', 'Chemicals', 'Tools', 'Other'];
const SUPPLIERS  = ['TechCorp', 'FurniPro', 'ChemSafe', 'OfficeWorld', 'ToolMaster'];

export default function Inventory() {
  const [rows, setRows]         = useState(MOCK_INVENTORY);
  const [sortKey, setSortKey]   = useState('sku');
  const [sortDir, setSortDir]   = useState('asc');
  const [filterStatus, setFilter] = useState('All');
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ sku: '', name: '', category: 'Electronics', qty: '', rp: '', ss: '', eoq: '', price: '', location: '', supplier: 'TechCorp' });

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = rows
    .filter(r => filterStatus === 'All' || r.status === filterStatus)
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.sku.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
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

  const handleAdd = () => {
    if (!form.sku || !form.name || !form.qty) return;
    const qty = parseInt(form.qty);
    const rp  = parseInt(form.rp) || 0;
    const ss  = parseInt(form.ss) || 0;
    let status = 'OK';
    if (qty === 0 || qty < ss) status = 'Critical';
    else if (qty < rp) status = 'Low';
    setRows(prev => [{
      id: prev.length + 1,
      sku: form.sku,
      name: form.name,
      category: form.category,
      qty,
      rp,
      ss,
      eoq:  parseInt(form.eoq)   || 0,
      price: parseFloat(form.price) || 0,
      status,
      location: form.location,
      supplier: form.supplier,
      lastUpdated: new Date().toISOString().slice(0, 10),
    }, ...prev]);
    setModal(false);
    setForm({ sku: '', name: '', category: 'Electronics', qty: '', rp: '', ss: '', eoq: '', price: '', location: '', supplier: 'TechCorp' });
  };

  const totalValue    = rows.reduce((s, r) => s + r.qty * r.price, 0);
  const inStockCount  = rows.filter(r => r.status === 'OK').length;
  const lowCount      = rows.filter(r => r.status === 'Low').length;
  const criticalCount = rows.filter(r => r.status === 'Critical').length;

  return (
    <div className="space-y-5 fade-in">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total SKUs"     color="accent" value={rows.length}            sub="All products"       icon={<Icons.Inventory size={16} />} />
        <StatCard label="In Stock (OK)"  color="green"  value={inStockCount}           sub="Adequate levels"    icon={<Icons.Check size={16} />} />
        <StatCard label="Low Stock"      color="accent" value={lowCount}               sub="Monitor closely"    icon={<Icons.Alert size={16} />} />
        <StatCard label="Critical"       color="red"    value={criticalCount}          sub="Immediate action"   trend="Reorder required" trendUp={false} icon={<Icons.Zap size={16} />} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-fb-border flex-wrap">
          <div className="flex items-center gap-2 bg-fb-card2 border border-fb-border rounded-lg px-3 py-2 flex-1 min-w-40">
            <Icons.Search size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-xs text-fb-text placeholder-fb-dim outline-none flex-1"
              placeholder="Search SKU, name or category…" />
          </div>
          <div className="flex gap-1">
            {['All', 'OK', 'Low', 'Critical'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors
                  ${filterStatus === s ? 'bg-fb-accent text-fb-sidebar font-semibold' : 'bg-fb-card2 text-fb-muted border border-fb-border hover:border-fb-accent/50'}`}>
                {s}
              </button>
            ))}
          </div>
          <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg btn-primary text-xs">
            <Icons.Plus size={14} /> Add SKU
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-fb-card2/50">
              <tr>
                <Th label="SKU"      col="sku"      />
                <Th label="Name"     col="name"     />
                <Th label="Category" col="category" />
                <Th label="Qty"      col="qty"      />
                <Th label="ROP"      col="rp"       />
                <Th label="Safety Stock" col="ss"   />
                <Th label="EOQ"      col="eoq"      />
                <Th label="Status"   col="status"   />
                <Th label="Supplier" col="supplier" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id} className={`border-t border-fb-border/50 hover:bg-fb-card2/30 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                  <td className="px-4 py-3 text-xs font-mono text-fb-accent font-semibold">{row.sku}</td>
                  <td className="px-4 py-3 text-xs text-fb-text font-medium max-w-[160px] truncate">{row.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-fb-card2 border border-fb-border text-fb-muted">{row.category}</span>
                  </td>
                  <td className={`px-4 py-3 text-sm font-bold font-mono ${row.status === 'Critical' ? 'text-fb-red' : row.status === 'Low' ? 'text-fb-accent' : 'text-fb-green'}`}>
                    {fmtNum(row.qty)}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-fb-muted">{row.rp}</td>
                  <td className="px-4 py-3 text-xs font-mono text-fb-muted">{row.ss}</td>
                  <td className="px-4 py-3 text-xs font-mono text-fb-muted">{row.eoq}</td>
                  <td className="px-4 py-3"><StockBadge status={row.status} /></td>
                  <td className="px-4 py-3 text-xs text-fb-muted">{row.supplier}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-fb-muted text-sm">No SKUs match the filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-fb-border flex items-center justify-between">
          <span className="text-xs text-fb-muted">Showing {filtered.length} of {rows.length} SKUs</span>
          <span className="text-xs font-mono text-fb-accent">Total value: {fmt(totalValue)}</span>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Add SKU">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU ID">
              <Input placeholder="SKU-XXX" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Product Name">
            <Input placeholder="Product name…" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Current Qty">
              <Input type="number" placeholder="0" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
            </Field>
            <Field label="Unit Price ($)">
              <Input type="number" placeholder="0.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="ROP">
              <Input type="number" placeholder="0" value={form.rp} onChange={e => setForm(f => ({ ...f, rp: e.target.value }))} />
            </Field>
            <Field label="Safety Stock">
              <Input type="number" placeholder="0" value={form.ss} onChange={e => setForm(f => ({ ...f, ss: e.target.value }))} />
            </Field>
            <Field label="EOQ">
              <Input type="number" placeholder="0" value={form.eoq} onChange={e => setForm(f => ({ ...f, eoq: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location">
              <Input placeholder="W-A1" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </Field>
            <Field label="Supplier">
              <Select value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}>
                {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-lg btn-ghost text-sm">Cancel</button>
            <button onClick={handleAdd} className="flex-1 py-2.5 rounded-lg btn-primary text-sm">Save SKU</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
