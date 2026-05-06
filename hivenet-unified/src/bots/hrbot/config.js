import { Icons } from '@/icons.jsx';

const config = {
  id:    'hrbot',
  label: 'HRBot',
  sub:   'HR & Workforce AI',
  navItems: [
    { id: 'dashboard', label: 'Dashboard',     icon: Icons.Dashboard   },
    { id: 'roster',    label: 'Roster Planner', icon: Icons.Roster     },
    { id: 'upload',    label: 'Upload Data',    icon: Icons.Upload     },
    { id: 'ai',        label: 'AI Assistant',   icon: Icons.AIAssistant },
  ],
  pageTitles: {
    dashboard: { title: 'HR Dashboard',    sub: 'Workforce overview & key metrics'         },
    roster:    { title: 'Roster Planner',  sub: 'Generate and manage shift assignments'     },
    upload:    { title: 'Upload Data',     sub: 'Import employee & shift requirement files' },
    ai:        { title: 'AI Assistant',   sub: 'Chat with your HR data'                    },
  },
};

export default config;
