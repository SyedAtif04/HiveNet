import { useState, useEffect } from 'react';
import { fetchSKUs, fetchStock, fetchSuppliers, createSKU, updateStock, buildInventoryRows } from '../api.js';
import { Card, StockBadge, Modal, Field, Input, Select, fmtNum } from '@/components.jsx';
import { Icons } from '@/icons.jsx';

const STATUSES = ['All', 'OK', 'Low', 'Critical'];
const UNIT_OPTIONS = ['units', 'kg', 'litres', 'boxes', 'pieces'];

export default function Inventory() {
  const [rows,      setRows]      = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState('');
  const [status,    setStatus]    = useState('All');
  const [sortKey,   setSortKey]   = useState('name');
  const [sortDir,   setSortDir]   = useState(1);
  const [modal,     setModal]     = useState(false);
  const [formError, setFormError] = useState('');
  const [form,      setForm]      = useState({
    name: '', category: '', description: '', unit_of_measure: 'units',
    qty: '', price: '', location: '', rp: '', ss: '', eoq: '',
  });

  const load = () => {
    setLoading(true);
    Promise.all([fetchSKUs(), fetchStock(), fetchSuppliers()])
      .then(([skus, stock, sups]) => {
        setRows(buildInventoryRows(stock, skus));
        setSuppliers(sups);
        setError(null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const sort = (key) => {
    if (sortKey === key) setSortDir(d => -d);
    else { setSortKey(key); setSortDir(1); }
  };

  const filtered = rows
    .filter(r => status === 'All' || r.status === status)
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      return typeof av === 'number' ? (av - bv) * sortDir : String(av).localeCompare(String(bv)) * sortDir;
    });

  const SortTh = ({ label, col }) => (
    <th className="px-4 py-3 text-left text-[11px] font-semibold text-fb-muted uppercase tracking-wider cursor-pointer hover:text-fb-accent transition-colors" onClick={() => sort(col)}>
      <span className="flex items-center gap-1">{label}{sortKey === col && (sortDir === 1 ? ' ↑' : ' ↓')}</span>
    </th>
  );

  const handleAdd = async () => {
    if (!form.name.trim()) { setFormError('Product name is required.'); return; }
    setFormError(''); setSaving(true);
    try {
      await createSKU({ name: form.name.trim(), category: form.category, description: form.description, unit_of_measure: form.unit_of_measure });
      await updateStock({
        product_name:      form.name.trim(),
        quantity:          form.qty     ? parseFloat(form.qty)   : undefined,
        unit_price:        form.price   ? parseFloat(form.price)  : undefined,
        warehouse_location: form.location || undefined,
        reorder_point:     form.rp      ? parseFloat(form.rp)    : undefined,
        safety_stock:      form.ss      ? parseFloat(form.ss)    : undefined,
        eoq:               form.eoq     ? parseFloat(form.eoq)   : undefined,
      });
      setModal(false);
      setForm({ name: '', category: '', description: '', unit_of_measure: 'units', qty: '', price: '', location: '', rp: '', ss: '', eoq: '' });
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-fb-card border border-fb-border rounded-lg px-4 py-2.5 flex-1 max-w-xs">
          <Icons.Search size={15} className="text-fb-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-fb-text placeholder-fb-dim outline-none flex-1" placeholder="Search name or category…" />
          {search && <button onClick={() => setSearch('')} className="text-fb-muted hover:text-fb-text"><Icons.X size={14} /></button>}
        </div>
        <div className="flex gap-1">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${status === s ? 'bg-fb-accent text-fb-sidebar font-semibold' : 'bg-fb-card2 border border-fb-border text-fb-muted hover:border-fb-accent/50'}`}>
              {s}
            </button>
          ))}
        </div>
        <span className="text-xs text-fb-muted ml-auto">{filtered.length} items</span>
        <button onClick={() => { setFormError(''); setModal(true); }} className="btn-primary px-4 py-2 rounded-lg text-xs flex items-center gap-1.5">
          <Icons.Plus size={14} /> Add SKU
        </button>
      </div>

      {loading && <div className="text-center py-12 text-fb-muted text-sm">Loading inventory…</div>}
      {error   && <div className="text-center py-12 text-fb-red text-sm">Error: {error}</div>}

      {!loading && !error && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-fb-card2/50">
                <tr>
                  <SortTh label="Name"     col="name"     />
                  <SortTh label="Category" col="category" />
                  <SortTh label="Qty"      col="qty"      />
                  <SortTh label="ROP"      col="rp"       />
                  <SortTh label="Safety"   col="ss"       />
                  <SortTh label="EOQ"      col="eoq"      />
                  <SortTh label="Price"    col="price"    />
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-fb-muted uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-fb-muted uppercase tracking-wider">Location</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.id} className={`border-t border-fb-border/50 hover:bg-fb-card2/30 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="px-4 py-3 text-xs font-medium text-fb-text">{item.name}</td>
                    <td className="px-4 py-3 text-xs text-fb-muted">{item.category}</td>
                    <td className={`px-4 py-3 text-xs font-bold font-mono ${item.qty === 0 ? 'text-fb-red' : item.qty <= item.ss ? 'text-fb-accent' : 'text-fb-green'}`}>{fmtNum(item.qty)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-fb-muted">{item.rp || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-fb-muted">{item.ss || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-fb-blue">{item.eoq || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-fb-muted">{item.price ? `₹${item.price.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3"><StockBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-xs font-mono text-fb-muted">{item.location}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-fb-muted text-sm">No items match your filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add New SKU">
        <div className="space-y-4">
          <Field label="Product Name *"><Input placeholder="Steel Rod 10mm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category"><Input placeholder="Raw Materials" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></Field>
            <Field label="Unit">
              <Select value={form.unit_of_measure} onChange={e => setForm(f => ({ ...f, unit_of_measure: e.target.value }))}>
                {UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Initial Qty"><Input type="number" placeholder="0" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} /></Field>
            <Field label="Unit Price ($)"><Input type="number" placeholder="0.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></Field>
            <Field label="Location"><Input placeholder="Bay A-12" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Reorder Point"><Input type="number" placeholder="50" value={form.rp} onChange={e => setForm(f => ({ ...f, rp: e.target.value }))} /></Field>
            <Field label="Safety Stock"><Input type="number" placeholder="20" value={form.ss} onChange={e => setForm(f => ({ ...f, ss: e.target.value }))} /></Field>
            <Field label="EOQ"><Input type="number" placeholder="200" value={form.eoq} onChange={e => setForm(f => ({ ...f, eoq: e.target.value }))} /></Field>
          </div>
          {formError && <p className="text-xs text-fb-red">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 rounded-lg btn-primary text-xs font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Add SKU'}
            </button>
            <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-lg btn-ghost text-xs">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
