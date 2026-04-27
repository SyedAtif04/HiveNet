import { Icons } from '@/icons.jsx';

const config = {
  id:    'logbot',
  label: 'LogBot',
  sub:   'Supply Chain AI',
  navItems: [
    { id: 'dashboard', label: 'Dashboard',    icon: Icons.Dashboard   },
    { id: 'inventory', label: 'Inventory',    icon: Icons.Inventory   },
    { id: 'upload',    label: 'Upload Data',  icon: Icons.Upload      },
    { id: 'analytics', label: 'Analytics',   icon: Icons.Analytics   },
    { id: 'forecasts', label: 'Forecasts',   icon: Icons.Forecasts   },
    { id: 'ai',        label: 'AI Assistant', icon: Icons.AIAssistant },
    { id: 'alerts',    label: 'Alerts',       icon: Icons.Alerts      },
  ],
  pageTitles: {
    dashboard: { title: 'Dashboard',    sub: 'Supply chain overview & insights'       },
    inventory: { title: 'Inventory',    sub: 'All SKUs and stock levels'              },
    upload:    { title: 'Upload Data',  sub: 'Import CSV or Excel inventory files'    },
    analytics: { title: 'Analytics',   sub: 'Demand trends & performance charts'     },
    forecasts: { title: 'Forecasts',   sub: 'ML-powered demand predictions'          },
    ai:        { title: 'AI Assistant', sub: 'Chat with your supply chain data'      },
    alerts:    { title: 'Alerts',       sub: 'Threshold monitoring & stockout risk'  },
  },
};

export default config;
