import { Icons } from './icons.jsx';

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',    icon: Icons.Dashboard    },
  { id: 'transactions', label: 'Transactions', icon: Icons.Transactions },
  { id: 'upload',       label: 'Upload Data',  icon: Icons.Upload       },
  { id: 'analytics',   label: 'Analytics',    icon: Icons.Analytics    },
  { id: 'predictions',  label: 'Predictions',  icon: Icons.Predictions  },
  { id: 'ai',          label: 'AI Assistant', icon: Icons.AIAssistant  },
  { id: 'knowledge',   label: 'Knowledge',    icon: Icons.Knowledge    },
];

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="fixed top-0 left-0 h-full w-56 bg-fb-sidebar border-r border-fb-border flex flex-col z-40">
      <div className="flex flex-col items-center gap-3 px-5 py-5 border-b border-fb-border">
        <div className="w-24 h-24 flex items-center justify-center flex-shrink-0">
              <img
                src="/HiveNetLogo.png"
                alt="HiveNet Logo"
                className="w-24 h-24 object-contain"
              />
        </div>
        <div>
          <div className="text-sm font-bold text-fb-text tracking-tight">FinBot</div>
          <div className="text-[10px] text-fb-muted">Financial AI</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] font-semibold text-fb-dim uppercase tracking-widest px-2 mb-3">Menu</div>
        {NAV_ITEMS.map(({ id, label, icon: NavIcon }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => onNavigate(id)}
              className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150
                ${isActive ? 'sidebar-active font-semibold' : 'text-fb-muted'}`}>
              <span className="flex-shrink-0 w-4 h-4"><NavIcon size={16} /></span>
              <span className="text-xs">{label}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-fb-sidebar/50"></span>}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-fb-border pt-4">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg card-glass border border-fb-border">
          <div className="w-7 h-7 rounded-full bg-fb-accent flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-fb-sidebar">SA</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-fb-text truncate">Admin User</div>
            <div className="text-[10px] text-fb-muted truncate">MJ College</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
