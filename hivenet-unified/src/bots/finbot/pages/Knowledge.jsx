import { useState } from 'react';
import { MOCK_KNOWLEDGE } from '../data.js';
import { Card, CardHeader } from '@/components.jsx';
import { Icons } from '@/icons.jsx';

const ALL_TAGS = ['report', 'Q1', 'budget', 'planning', 'policy', 'compliance', 'forecast', 'AI', 'cashflow'];

export default function Knowledge() {
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = MOCK_KNOWLEDGE.filter(k => !search || k.title.toLowerCase().includes(search.toLowerCase()) || k.preview.toLowerCase().includes(search.toLowerCase()) || k.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-fb-card border border-fb-border rounded-lg px-4 py-2.5 flex-1 max-w-lg">
          <Icons.Search size={15} className="text-fb-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-fb-text placeholder-fb-dim outline-none flex-1" placeholder="Search knowledge base…" />
          {search && <button onClick={() => setSearch('')} className="text-fb-muted hover:text-fb-text"><Icons.X size={14} /></button>}
        </div>
        <span className="text-xs text-fb-muted">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-3">
          {filtered.map(k => (
            <Card key={k.id} className={`p-5 cursor-pointer transition-all ${selected === k.id ? 'border-fb-accent/50' : 'hover:border-fb-border/80'}`}
              onClick={() => setSelected(selected === k.id ? null : k.id)}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-sm font-semibold text-fb-text leading-tight">{k.title}</h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[10px] font-mono font-bold text-fb-accent">{(k.score * 100).toFixed(0)}%</span>
                  <span className="text-[10px] text-fb-muted">match</span>
                </div>
              </div>
              <p className="text-xs text-fb-muted leading-relaxed line-clamp-2">{k.preview}</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {k.tags.map(t => <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-fb-card2 border border-fb-border text-fb-dim">{t}</span>)}
              </div>
              {selected === k.id && (
                <div className="mt-4 pt-4 border-t border-fb-border space-y-3">
                  <p className="text-xs text-fb-muted leading-relaxed">{k.preview} This document provides detailed financial analysis and actionable insights derived from your transaction data.</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[['Source', 'Financial DB'],['Relevance', `${k.score}`],['Indexed', '2026-04-01']].map(([l,v]) => (
                      <div key={l} className="bg-fb-card2 rounded-lg p-2 border border-fb-border">
                        <div className="text-[9px] text-fb-muted mb-0.5">{l}</div>
                        <div className="text-xs font-medium text-fb-text font-mono">{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 rounded-lg btn-primary text-xs">Use in Chat</button>
                    <button className="flex-1 py-2 rounded-lg btn-ghost text-xs">View Source</button>
                  </div>
                </div>
              )}
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-fb-muted text-sm">No results found for "{search}"</div>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader title="Knowledge Base" />
            <div className="space-y-3">
              {[['Total Insights', '5', 'text-fb-accent'],['Avg Similarity', '83%', 'text-fb-blue'],['Last Updated', 'Apr 27', 'text-fb-green'],['Sources', '4 files', 'text-fb-muted']].map(([l,v,c]) => (
                <div key={l} className="flex items-center justify-between py-2 border-b border-fb-border/50 last:border-0">
                  <span className="text-xs text-fb-muted">{l}</span>
                  <span className={`text-xs font-bold font-mono ${c}`}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <CardHeader title="Top Tags" />
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map(t => (
                <button key={t} onClick={() => setSearch(t)}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-fb-card2 border border-fb-border text-fb-muted hover:border-fb-accent/50 hover:text-fb-accent transition-colors">
                  {t}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <CardHeader title="Quick Actions" />
            <div className="space-y-2">
              {[['Re-index','Refresh all documents'],['Export','Download as JSON'],['Add Document','Upload new source']].map(([label, sub]) => (
                <button key={label} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-fb-card2 border border-fb-border hover:border-fb-accent/40 text-left transition-colors">
                  <span className="text-xs font-medium text-fb-text">{label}</span>
                  <span className="text-[10px] text-fb-muted ml-auto">{sub}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
