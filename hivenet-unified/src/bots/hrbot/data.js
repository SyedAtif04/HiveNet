export const MOCK_HR_SUMMARY = {
  totalEmployees: 48,
  onLeaveToday:    3,
  pendingLeaves:   7,
  shiftShortfall:  2,
};

export const MOCK_SHIFTS_CONFIG = [
  { key: 'morning',   label: 'Morning Shift',   time: '06:00 – 14:00' },
  { key: 'afternoon', label: 'Afternoon Shift',  time: '14:00 – 22:00' },
  { key: 'night',     label: 'Night Shift',      time: '22:00 – 06:00' },
];

export const MOCK_SHIFT_REQUIREMENTS = {
  morning:   3,
  afternoon: 3,
  night:     2,
};

export const MOCK_ROSTER = {
  morning:   [{ id: 'E-101', name: 'Alice Johnson' }, { id: 'E-102', name: 'Bob Smith' }, { id: 'E-107', name: 'Carol Lee' }],
  afternoon: [{ id: 'E-103', name: 'David Kim' },    { id: 'E-104', name: 'Eva Chen' },  { id: 'E-108', name: 'Frank Patel' }],
  night:     [{ id: 'E-105', name: 'Grace Wu' },     { id: 'E-106', name: 'Hank Brown' }],
};

export const MOCK_KPI_ALERTS = [
  { id: 1, level: 'warning', message: 'Night shift has only 2 assigned — minimum threshold met', time: '30m ago' },
  { id: 2, level: 'info',    message: '7 leave requests pending manager approval',               time: '2h ago'  },
  { id: 3, level: 'info',    message: 'Roster generated successfully for 2026-04-27',            time: '3h ago'  },
];
