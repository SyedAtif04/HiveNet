const Icon = ({ d, size = 18, strokeWidth = 1.6, style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

export const Icons = {
  Dashboard:    (p) => <Icon {...p} d={['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z','M9 22V12h6v10']} />,
  Inventory:    (p) => <Icon {...p} d={['M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z','M3.27 6.96L12 12.01l8.73-5.05','M12 22.08V12']} />,
  Upload:       (p) => <Icon {...p} d={['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4','M17 8l-5-5-5 5','M12 3v12']} />,
  Analytics:    (p) => <Icon {...p} d={['M18 20V10','M12 20V4','M6 20v-6']} />,
  Forecasts:    (p) => <Icon {...p} d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  AIAssistant:  (p) => <Icon {...p} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  Alerts:       (p) => <Icon {...p} d={['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z','M12 9v4','M12 17h.01']} />,
  Bell:         (p) => <Icon {...p} d={['M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9','M13.73 21a2 2 0 01-3.46 0']} />,
  Search:       (p) => <Icon {...p} d={['M11 17a6 6 0 100-12 6 6 0 000 12z','M21 21l-4.35-4.35']} />,
  Plus:         (p) => <Icon {...p} d={['M12 5v14','M5 12h14']} />,
  X:            (p) => <Icon {...p} d={['M18 6L6 18','M6 6l12 12']} />,
  ChevronDown:  (p) => <Icon {...p} d="M6 9l6 6 6-6" />,
  ChevronUp:    (p) => <Icon {...p} d="M18 15l-6-6-6 6" />,
  ArrowUp:      (p) => <Icon {...p} d={['M12 19V5','M5 12l7-7 7 7']} />,
  ArrowDown:    (p) => <Icon {...p} d={['M12 5v14','M19 12l-7 7-7-7']} />,
  TrendUp:      (p) => <Icon {...p} d={['M23 6l-9.5 9.5-5-5L1 18','M17 6h6v6']} />,
  TrendDown:    (p) => <Icon {...p} d={['M23 18l-9.5-9.5-5 5L1 6','M17 18h6v-6']} />,
  Send:         (p) => <Icon {...p} d={['M22 2L11 13','M22 2L15 22 11 13 2 9l20-7z']} />,
  File:         (p) => <Icon {...p} d={['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z','M14 2v6h6','M16 13H8','M16 17H8','M10 9H8']} />,
  Check:        (p) => <Icon {...p} d="M20 6L9 17l-5-5" />,
  Alert:        (p) => <Icon {...p} d={['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z','M12 9v4','M12 17h.01']} />,
  Info:         (p) => <Icon {...p} d={['M12 22a10 10 0 100-20 10 10 0 000 20z','M12 16v-4','M12 8h.01']} />,
  Filter:       (p) => <Icon {...p} d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />,
  Calendar:     (p) => <Icon {...p} d={['M8 2v4','M16 2v4','M3 10h18','M21 8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V8z']} />,
  Download:     (p) => <Icon {...p} d={['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4','M7 10l5 5 5-5','M12 15V3']} />,
  Refresh:      (p) => <Icon {...p} d={['M23 4v6h-6','M1 20v-6h6','M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15']} />,
  Dot:          ({ color }) => <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill={color} /></svg>,
  Shield:       (p) => <Icon {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  Zap:          (p) => <Icon {...p} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  Truck:        (p) => <Icon {...p} d={['M1 3h15v13H1z','M16 8h4l3 3v5h-7V8z','M4 19h1','M17 19h1']} />,
  Link:         (p) => <Icon {...p} d={['M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71','M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71']} />,
};
