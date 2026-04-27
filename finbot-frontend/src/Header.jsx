import { useState } from 'react';
import { Icons } from './icons.jsx';

const PAGE_TITLES = {
  dashboard:    { title: 'Dashboard',        sub: 'Financial overview & insights' },
  transactions: { title: 'Transactions',     sub: 'All income and expense records' },
  upload:       { title: 'Upload Data',      sub: 'Import CSV or Excel files' },
  analytics:    { title: 'Analytics',        sub: 'Date-filtered charts & trends' },
  predictions:  { title: 'Predictions',      sub: 'AI-powered financial forecasts' },
  ai:           { title: 'AI Assistant',     sub: 'Chat with your financial data' },
  knowledge:    { title: 'Knowledge Viewer', sub: 'Stored insights & search' },
};

export default function Header({ page, onNavigate }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { title, sub } = PAGE_TITLES[page] || PAGE_TITLES.dashboard;

  return (
    <header className="fixed top-0 left-56 right-0 h-14 bg-fb-sidebar/80 backdrop-blur-md border-b border-fb-border z-30 flex items-center px-6 gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-fb-text">{title}</h1>
          <span className="text-fb-dim text-xs hidden md:block">·</span>
          <span className="text-xs text-fb-muted hidden md:block">{sub}</span>
        </div>
      </div>

      <div className={`flex items-center gap-2 bg-fb-card2 border border-fb-border rounded-lg px-3 py-1.5 transition-all duration-200 ${searchOpen ? 'w-56' : 'w-32'}`}>
        <Icons.Search size={14} />
        <input
          className="bg-transparent text-xs text-fb-text placeholder-fb-dim outline-none flex-1"
          placeholder="Search…"
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setSearchOpen(false)}
        />
      </div>

      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-fb-card2 border border-fb-border">
        <div className="w-1.5 h-1.5 rounded-full bg-fb-green"></div>
        <span className="text-xs text-fb-muted">MJ College Pvt Ltd</span>
      </div>

      <button className="relative w-8 h-8 rounded-lg bg-fb-card2 border border-fb-border flex items-center justify-center text-fb-muted hover:text-fb-accent hover:border-fb-accent/40 transition-colors">
        <Icons.Bell size={15} />
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-fb-red rounded-full text-[9px] font-bold text-white flex items-center justify-center">3</span>
      </button>

      <button onClick={() => onNavigate('ai')}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-fb-accent text-fb-sidebar text-xs font-semibold btn-primary">
        <Icons.AIAssistant size={13} />
        <span className="hidden sm:block">Ask AI</span>
      </button>
    </header>
  );
}
