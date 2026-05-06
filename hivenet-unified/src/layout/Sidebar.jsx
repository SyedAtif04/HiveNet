import { useBot } from '../context/BotContext.jsx';
import { Icons } from '../icons.jsx';
import { BOTS } from '../bots/index.js';
import logo from './HiveNetLogo.png';

const BOT_OPTIONS = [
  { id: 'finbot', label: 'FinBot',  sub: 'Financial AI',    color: 'text-fb-green'  },
  { id: 'logbot', label: 'LogBot',  sub: 'Supply Chain AI', color: 'text-fb-blue'   },
  { id: 'hrbot',  label: 'HRBot',   sub: 'HR & Workforce',  color: 'text-fb-purple' },
];

export default function Sidebar() {
  const { currentBot, currentPage, navigate, switchBot } = useBot();
  const botConfig = BOTS[currentBot];

  return (
    <aside className="fixed top-0 left-0 h-full w-56 bg-fb-sidebar border-r border-fb-border flex flex-col z-40">
      <div className="flex flex-col items-center gap-3 px-5 py-4 border-b border-fb-border">
        <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
          <img src={logo} alt="HiveNet Logo" className="w-16 h-16 object-contain" />
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-fb-text tracking-tight">HiveNet</div>
          <div className="text-[9px] text-fb-muted">Unified Intelligence Platform</div>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-fb-border">
        <div className="text-[9px] font-semibold text-fb-dim uppercase tracking-widest px-1 mb-2">Switch Bot</div>
        <div className="space-y-0.5">
          {BOT_OPTIONS.map(({ id, label, sub, color }) => (
            <button key={id} onClick={() => switchBot(id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150 sidebar-item
                ${currentBot === id ? 'sidebar-active font-semibold' : 'text-fb-muted'}`}>
              <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-[9px] font-bold
                ${currentBot === id ? 'bg-black/15 text-fb-sidebar' : `bg-fb-card2 ${color}`}`}>
                {label[0]}
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-semibold truncate ${currentBot === id ? 'text-fb-sidebar' : 'text-fb-text'}`}>{label}</div>
                <div className={`text-[9px] truncate ${currentBot === id ? 'text-fb-sidebar/70' : 'text-fb-muted'}`}>{sub}</div>
              </div>
              {currentBot === id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-fb-sidebar/50 flex-shrink-0"></div>}
            </button>
          ))}
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <div className="text-[9px] font-semibold text-fb-dim uppercase tracking-widest px-2 mb-2">
          {botConfig.label} Menu
        </div>
        {botConfig.navItems.map(({ id, label, icon: NavIcon }) => {
          const isActive = currentPage === id;
          return (
            <button key={id} onClick={() => navigate(id)}
              className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150
                ${isActive ? 'sidebar-active font-semibold' : 'text-fb-muted'}`}>
              <span className="flex-shrink-0 w-4 h-4"><NavIcon size={16} /></span>
              <span className="text-xs">{label}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-fb-sidebar/50"></span>}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-fb-border pt-3">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg card-glass border border-fb-border">
          <div className="w-7 h-7 rounded-full bg-fb-accent flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-fb-sidebar">SA</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-fb-text truncate">Admin User</div>
            <div className="text-[10px] text-fb-muted truncate">SPORTS INFRA</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
