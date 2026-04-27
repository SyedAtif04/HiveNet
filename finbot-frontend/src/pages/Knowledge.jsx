import { useState } from 'react';
import { MOCK_KNOWLEDGE } from '../data.js';
import { Card, CardHeader } from '../components.jsx';
import { Icons } from '../icons.jsx';

const ScoreBar = ({ score }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 bg-fb-card2 rounded-full h-1 w-20">
      <div className="h-full rounded-full bg-fb-accent" style={{ width: `${score * 100}%` }}></div>
    </div>
    <span className="text-xs font-mono font-bold text-fb-accent">{score}</span>
  </div>
);

export default function Knowledge() {
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = MOCK_KNOWLEDGE.filter(k =>
    !search ||
    k.title.toLowerCase().includes(search.toLowerCase()) ||
    k.tags.some(t => t.includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5 fade-in">
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex-1 flex items-center gap-3 bg-fb-card2 border border-fb-border rounded-xl px-4 py-3">
            <Icons.Search size={18} className="text-fb-muted flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm text-fb-text placeholder-fb-dim outline-none flex-1"
              placeholder="Search insights, reports, policies…" />
            {search && (
              <button onClick={() => setSearch('')} className="text-fb-muted hover:text-fb-text">
                <Icons.X size={14} />
              </button>
            )}
          </div>
          <div className="text-xs text-fb-muted whitespace-nowrap">
            {filtered.length} of {MOCK_KNOWLEDGE.length} insights
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-3">
          {filtered.map(k => (
            <Card key={k.id}
              className={`p-5 cursor-pointer transition-all duration-150 hover:border-fb-accent/40 ${selected?.id === k.id ? 'border-fb-accent/60' : ''}`}
              onClick={() => setSelected(selected?.id === k.id ? null : k)}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-fb-card2 border border-fb-border flex items-center justify-center text-fb-accent flex-shrink-0">
                  <Icons.Knowledge size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="text-sm font-semibold text-fb-text">{k.title}</h3>
                    <div className="flex-shrink-0"><ScoreBar score={k.score} /></div>
                  </div>
                  <p className="text-xs text-fb-muted leading-relaxed mb-3">{k.preview}</p>
                  <div className="flex items-center gap-2">
                    {k.tags.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-fb-card2 border border-fb-border text-fb-muted">{t}</span>
                    ))}
                    <span className="ml-auto text-[10px] text-fb-dim">Similarity: {(k.score * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {selected?.id === k.id && (
                <div className="mt-4 pt-4 border-t border-fb-border space-y-3">
                  <p className="text-xs text-fb-muted leading-relaxed">
                    This insight was extracted from your financial documents and stored in the knowledge base.
                    It has a semantic similarity score of <strong className="text-fb-accent">{k.score}</strong> for your current query.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ['Source',    'Document Store', '#f5c518'],
                      ['Relevance', `${(k.score * 100).toFixed(0)}%`, '#3ecf8e'],
                      ['Indexed',   '26-04-2026',     '#4c9eff'],
                    ].map(([l, v, c]) => (
                      <div key={l} className="bg-fb-card2 rounded-lg p-3 border border-fb-border">
                        <div className="text-[10px] text-fb-muted mb-1">{l}</div>
                        <div className="text-xs font-semibold" style={{ color: c }}>{v}</div>
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
            <Card className="p-12 text-center">
              <Icons.Search size={32} className="text-fb-dim mx-auto mb-3" />
              <p className="text-sm text-fb-muted">No insights match &ldquo;{search}&rdquo;</p>
              <button onClick={() => setSearch('')} className="mt-3 text-xs text-fb-accent hover:underline">Clear search</button>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader title="Knowledge Base" />
            <div className="space-y-3">
              {[
                ['Total Insights', MOCK_KNOWLEDGE.length, 'text-fb-accent'],
                ['Avg. Similarity', '0.83',           'text-fb-green'],
                ['Last Updated',   '26-04-2026',      'text-fb-muted'],
                ['Sources',        '4 files',         'text-fb-blue'],
              ].map(([l, v, c]) => (
                <div key={l} className="flex items-center justify-between py-2 border-b border-fb-border/50 last:border-0">
                  <span className="text-xs text-fb-muted">{l}</span>
                  <span className={`text-xs font-semibold font-mono ${c}`}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <CardHeader title="Top Tags" />
            <div className="flex flex-wrap gap-2">
              {['report','budget','forecast','AI','policy','Q1','cashflow','planning','compliance'].map(t => (
                <button key={t} onClick={() => setSearch(t)}
                  className="text-[10px] px-2.5 py-1 rounded-lg border border-fb-border text-fb-muted hover:border-fb-accent/50 hover:text-fb-accent transition-colors">
                  {t}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <CardHeader title="Quick Actions" />
            <div className="space-y-2">
              {['Re-index all documents', 'Export knowledge base', 'Add new document'].map(a => (
                <button key={a} className="w-full py-2.5 px-3 rounded-lg btn-ghost text-xs text-left">{a}</button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
