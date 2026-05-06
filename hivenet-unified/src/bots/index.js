import finbotConfig from './finbot/config.js';
import logbotConfig from './logbot/config.js';
import hrbotConfig  from './hrbot/config.js';

import FinDashboard    from './finbot/pages/Dashboard.jsx';
import FinTransactions from './finbot/pages/Transactions.jsx';
import FinUpload       from './finbot/pages/Upload.jsx';
import FinAnalytics    from './finbot/pages/Analytics.jsx';
import FinPredictions  from './finbot/pages/Predictions.jsx';
import FinAI           from './finbot/pages/AIAssistant.jsx';
import FinKnowledge    from './finbot/pages/Knowledge.jsx';

import LogDashboard from './logbot/pages/Dashboard.jsx';
import LogInventory from './logbot/pages/Inventory.jsx';
import LogUpload    from './logbot/pages/Upload.jsx';
import LogAnalytics from './logbot/pages/Analytics.jsx';
import LogForecasts from './logbot/pages/Forecasts.jsx';
import LogAI        from './logbot/pages/AIAssistant.jsx';
import LogAlerts    from './logbot/pages/Alerts.jsx';

import HRDashboard from './hrbot/pages/Dashboard.jsx';
import HRRoster    from './hrbot/pages/Roster.jsx';
import HRUpload    from './hrbot/pages/Upload.jsx';
import HRAIAssistant from './hrbot/pages/AIAssistant.jsx';

export const BOTS = {
  finbot: {
    ...finbotConfig,
    pages: {
      dashboard:    FinDashboard,
      transactions: FinTransactions,
      upload:       FinUpload,
      analytics:    FinAnalytics,
      predictions:  FinPredictions,
      ai:           FinAI,
      knowledge:    FinKnowledge,
    },
  },
  logbot: {
    ...logbotConfig,
    pages: {
      dashboard: LogDashboard,
      inventory: LogInventory,
      upload:    LogUpload,
      analytics: LogAnalytics,
      forecasts: LogForecasts,
      ai:        LogAI,
      alerts:    LogAlerts,
    },
  },
  hrbot: {
    ...hrbotConfig,
    pages: {
      dashboard: HRDashboard,
      roster:    HRRoster,
      upload:    HRUpload,
      ai:        HRAIAssistant,
    },
  },
};
