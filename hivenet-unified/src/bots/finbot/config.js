import { Icons } from '@/icons.jsx';

const config = {
  id:    'finbot',
  label: 'FinBot',
  sub:   'Financial AI',
  navItems: [
    { id: 'dashboard',    label: 'Dashboard',    icon: Icons.Dashboard    },
    { id: 'transactions', label: 'Transactions', icon: Icons.Transactions },
    { id: 'upload',       label: 'Upload Data',  icon: Icons.Upload       },
    { id: 'analytics',    label: 'Analytics',    icon: Icons.Analytics    },
    { id: 'predictions',  label: 'Predictions',  icon: Icons.Predictions  },
    { id: 'ai',           label: 'AI Assistant', icon: Icons.AIAssistant  },
    { id: 'knowledge',    label: 'Knowledge',    icon: Icons.Knowledge    },
  ],
  pageTitles: {
    dashboard:    { title: 'Dashboard',        sub: 'Financial overview & insights'        },
    transactions: { title: 'Transactions',     sub: 'All income and expense records'       },
    upload:       { title: 'Upload Data',      sub: 'Import CSV or Excel files'            },
    analytics:    { title: 'Analytics',        sub: 'Date-filtered charts & trends'        },
    predictions:  { title: 'Predictions',      sub: 'AI-powered financial forecasts'       },
    ai:           { title: 'AI Assistant',     sub: 'Chat with your financial data'        },
    knowledge:    { title: 'Knowledge Viewer', sub: 'Stored insights & semantic search'    },
  },
};

export default config;
