import { useRef, useEffect } from 'react';
import {
  Chart,
  LineController, BarController, DoughnutController,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement, ArcElement,
  Tooltip, Legend, Filler,
} from 'chart.js';

Chart.register(
  LineController, BarController, DoughnutController,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement, ArcElement,
  Tooltip, Legend, Filler,
);

Chart.defaults.color = '#6b6b88';
Chart.defaults.borderColor = '#252538';
Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
Chart.defaults.font.size = 11;

const destroyChart = (canvasRef) => {
  if (canvasRef.current) {
    const existing = Chart.getChart(canvasRef.current);
    if (existing) existing.destroy();
  }
};

export const LineChart = ({ data, height = 220 }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    destroyChart(canvasRef);
    const ctx = canvasRef.current.getContext('2d');
    const incomeGrad = ctx.createLinearGradient(0, 0, 0, height);
    incomeGrad.addColorStop(0, 'rgba(62,207,142,0.35)');
    incomeGrad.addColorStop(1, 'rgba(62,207,142,0)');
    const expenseGrad = ctx.createLinearGradient(0, 0, 0, height);
    expenseGrad.addColorStop(0, 'rgba(224,85,85,0.25)');
    expenseGrad.addColorStop(1, 'rgba(224,85,85,0)');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.month),
        datasets: [
          { label: 'Income',  data: data.map(d => d.income),  borderColor: '#3ecf8e', backgroundColor: incomeGrad,  borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: '#3ecf8e', tension: 0.4, fill: true },
          { label: 'Expense', data: data.map(d => d.expense), borderColor: '#e05555', backgroundColor: expenseGrad, borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: '#e05555', tension: 0.4, fill: true },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, borderRadius: 3, useBorderRadius: true, padding: 16, color: '#6b6b88' } },
          tooltip: { backgroundColor: '#13131f', borderColor: '#252538', borderWidth: 1, padding: 12, titleColor: '#e2e2f0', bodyColor: '#6b6b88', callbacks: { label: ctx => ` ₹{ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}` } },
        },
        scales: {
          x: { grid: { color: '#1a1a2e' }, ticks: { color: '#6b6b88' } },
          y: { grid: { color: '#1a1a2e' }, ticks: { color: '#6b6b88', callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v) } },
        },
      },
    });
    return () => { chart.destroy(); };
  }, [data, height]);
  return <div style={{ height }}><canvas ref={canvasRef} /></div>;
};

export const BarChart = ({ data, height = 180 }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    destroyChart(canvasRef);
    const ctx = canvasRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.name),
        datasets: [{ data: data.map(d => d.amount), backgroundColor: data.map(d => d.color + 'bb'), borderColor: data.map(d => d.color), borderWidth: 1, borderRadius: 5, borderSkipped: false }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#13131f', borderColor: '#252538', borderWidth: 1, padding: 10, titleColor: '#e2e2f0', bodyColor: '#6b6b88', callbacks: { label: ctx => ` ₹${ctx.parsed.y.toLocaleString()}` } } },
        scales: { x: { grid: { display: false }, ticks: { color: '#6b6b88' } }, y: { grid: { color: '#1a1a2e' }, ticks: { color: '#6b6b88', callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v) } } },
      },
    });
    return () => { chart.destroy(); };
  }, [data, height]);
  return <div style={{ height }}><canvas ref={canvasRef} /></div>;
};

export const DonutChart = ({ data, height = 180 }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    destroyChart(canvasRef);
    const ctx = canvasRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.name),
        datasets: [{ data: data.map(d => d.amount), backgroundColor: data.map(d => d.color + 'cc'), borderColor: '#0d0d18', borderWidth: 3, hoverOffset: 6 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 10, boxHeight: 10, borderRadius: 3, useBorderRadius: true, padding: 12, color: '#6b6b88', font: { size: 11 } } },
          tooltip: { backgroundColor: '#13131f', borderColor: '#252538', borderWidth: 1, padding: 10, callbacks: { label: ctx => ` ₹${ctx.parsed.toLocaleString()} (${data[ctx.dataIndex].pct}%)` } },
        },
      },
    });
    return () => { chart.destroy(); };
  }, [data, height]);
  return <div style={{ height }}><canvas ref={canvasRef} /></div>;
};

export const SparkLine = ({ data, color = '#f5c518', height = 280, getValue }) => {
  const canvasRef = useRef(null);
  const fn = getValue || (d => d.value !== undefined ? d.value : (d.income - d.expense));

  useEffect(() => {
    destroyChart(canvasRef);
    const ctx = canvasRef.current.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, color + '44');
    grad.addColorStop(1, color + '00');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.month),
        datasets: [{
          label: 'Net Profit',
          data: data.map(fn),
          borderColor: color,
          backgroundColor: grad,
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: color,
          pointBorderColor: '#0d0d18',
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', align: 'end', labels: { boxWidth: 12, boxHeight: 12, borderRadius: 4, useBorderRadius: true, padding: 16, color: '#6b6b88', font: { size: 12, weight: 'bold' } } },
          tooltip: {
            backgroundColor: '#13131f',
            borderColor: '#252538',
            borderWidth: 1.5,
            padding: 14,
            titleColor: '#e2e2f0',
            bodyColor: '#6b6b88',
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            callbacks: {
              title: ctx => `${ctx[0].label}`,
              label: ctx => {
                const idx = ctx.dataIndex;
                if (idx !== undefined && idx < data.length) {
                  const item = data[idx];
                  return [
                    ` Income:  ₹${item.income?.toLocaleString() || 'N/A'}`,
                    ` Expense: ₹${item.expense?.toLocaleString() || 'N/A'}`,
                    ` Profit:  ₹${fn(item).toLocaleString()}`,
                  ];
                }
                return ` Profit: ₹${ctx.parsed.y.toLocaleString()}`;
              },
            }
          },
        },
        scales: {
          x: { grid: { color: '#1a1a2e', drawBorder: true }, ticks: { color: '#6b6b88', font: { size: 11 } }, title: { display: true, text: 'Month', color: '#6b6b88', font: { size: 11, weight: '500' } } },
          y: { grid: { color: '#1a1a2e', drawBorder: true }, ticks: { color: '#6b6b88', font: { size: 11 }, callback: v => '₹' + (v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : v >= 1000 ? (v/1000).toFixed(0) + 'k' : v) }, title: { display: true, text: 'Profit (₹)', color: '#6b6b88', font: { size: 11, weight: '500' } } },
        },
      },
    });
    return () => { chart.destroy(); };
  }, [data, color, height, fn]);

  const values = data.map(fn);
  const stats = {
    total: values.reduce((a, b) => a + b, 0),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    max: Math.max(...values),
    min: Math.min(...values),
  };

  return (
    <div>
      <div style={{ height }}><canvas ref={canvasRef} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginTop: '18px' }}>
        <div style={{ background: '#1a1a2e', border: '1px solid #252538', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#6b6b88', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Total Profit</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#f5c518' }}>₹{(stats.total / 1000).toFixed(0)}k</div>
        </div>
        <div style={{ background: '#1a1a2e', border: '1px solid #252538', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#6b6b88', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Average</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#3ecf8e' }}>₹{(stats.avg / 1000).toFixed(0)}k</div>
        </div>
        <div style={{ background: '#1a1a2e', border: '1px solid #252538', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#6b6b88', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Peak</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#4c9eff' }}>₹{(stats.max / 1000).toFixed(0)}k</div>
        </div>
        <div style={{ background: '#1a1a2e', border: '1px solid #252538', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#6b6b88', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Low</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#e05555' }}>₹{(stats.min / 1000).toFixed(0)}k</div>
        </div>
      </div>
    </div>
  );
};

export const DualLineChart = ({ data, label1 = 'A', label2 = 'B', key1 = 'a', key2 = 'b', color1 = '#f5c518', color2 = '#3ecf8e', height = 220 }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    destroyChart(canvasRef);
    const ctx = canvasRef.current.getContext('2d');
    const grad1 = ctx.createLinearGradient(0, 0, 0, height);
    grad1.addColorStop(0, color1 + '44'); grad1.addColorStop(1, color1 + '00');
    const grad2 = ctx.createLinearGradient(0, 0, 0, height);
    grad2.addColorStop(0, color2 + '33'); grad2.addColorStop(1, color2 + '00');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.month),
        datasets: [
          { label: label1, data: data.map(d => d[key1]), borderColor: color1, backgroundColor: grad1, borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: color1, tension: 0.4, fill: true },
          { label: label2, data: data.map(d => d[key2]), borderColor: color2, backgroundColor: grad2, borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: color2, tension: 0.4, fill: true },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, borderRadius: 3, useBorderRadius: true, padding: 16, color: '#6b6b88' } },
          tooltip: { backgroundColor: '#13131f', borderColor: '#252538', borderWidth: 1, padding: 12, titleColor: '#e2e2f0', bodyColor: '#6b6b88', callbacks: { label: ctx => ` ₹{ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} units` } },
        },
        scales: {
          x: { grid: { color: '#1a1a2e' }, ticks: { color: '#6b6b88' } },
          y: { grid: { color: '#1a1a2e' }, ticks: { color: '#6b6b88', callback: v => v >= 1000 ? (v/1000).toFixed(1) + 'k' : v } },
        },
      },
    });
    return () => { chart.destroy(); };
  }, [data, height, label1, label2, key1, key2, color1, color2]);
  return <div style={{ height }}><canvas ref={canvasRef} /></div>;
};

export const UnitBarChart = ({ data, height = 180, getLabel, getValue }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    destroyChart(canvasRef);
    const ctx = canvasRef.current.getContext('2d');
    const labelFn = getLabel || (d => d.month || d.name);
    const valueFn = getValue || (d => d.demand !== undefined ? d.demand : d.amount);
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(labelFn),
        datasets: [{ data: data.map(valueFn), backgroundColor: '#f5c518bb', borderColor: '#f5c518', borderWidth: 1, borderRadius: 5, borderSkipped: false }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#13131f', borderColor: '#252538', borderWidth: 1, padding: 10, titleColor: '#e2e2f0', bodyColor: '#6b6b88', callbacks: { label: ctx => ` ₹{ctx.parsed.y.toLocaleString()} units` } } },
        scales: { x: { grid: { display: false }, ticks: { color: '#6b6b88' } }, y: { grid: { color: '#1a1a2e' }, ticks: { color: '#6b6b88', callback: v => v >= 1000 ? (v/1000).toFixed(1) + 'k' : v } } },
      },
    });
    return () => { chart.destroy(); };
  }, [data, height, getLabel, getValue]);
  return <div style={{ height }}><canvas ref={canvasRef} /></div>;
};

export const ForecastTrendChart = ({ data, height = 220 }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    destroyChart(canvasRef);
    const ctx = canvasRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.month),
        datasets: [
          {
            label: 'Predicted Demand',
            data: data.map(d => d.demand),
            borderColor: '#f5c518',
            backgroundColor: 'rgba(245, 197, 24, 0.1)',
            borderWidth: 2.5,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#f5c518',
            pointBorderColor: '#0d0d18',
            pointBorderWidth: 2,
            tension: 0.4,
            fill: false,
          },
          {
            label: 'Upper Confidence (95%)',
            data: data.map(d => d.upper),
            borderColor: '#4c9eff',
            backgroundColor: 'rgba(76, 158, 255, 0.08)',
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0,
            tension: 0.4,
            fill: '-1',
          },
          {
            label: 'Lower Confidence (5%)',
            data: data.map(d => d.lower),
            borderColor: '#4c9eff',
            backgroundColor: 'rgba(76, 158, 255, 0.08)',
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0,
            tension: 0.4,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, borderRadius: 3, useBorderRadius: true, padding: 16, color: '#6b6b88', font: { size: 11 } } },
          tooltip: {
            backgroundColor: '#13131f',
            borderColor: '#252538',
            borderWidth: 1,
            padding: 12,
            titleColor: '#e2e2f0',
            bodyColor: '#6b6b88',
            callbacks: {
              label: ctx => {
                if (ctx.datasetIndex === 0) return ` Predicted: ${ctx.parsed.y.toLocaleString()} units`;
                if (ctx.datasetIndex === 1) return ` Upper: ${ctx.parsed.y.toLocaleString()} units`;
                if (ctx.datasetIndex === 2) return ` Lower: ${ctx.parsed.y.toLocaleString()} units`;
              },
            },
          },
        },
        scales: {
          x: { grid: { color: '#1a1a2e' }, ticks: { color: '#6b6b88' } },
          y: { grid: { color: '#1a1a2e' }, ticks: { color: '#6b6b88', callback: v => v >= 1000 ? (v/1000).toFixed(0) + 'k' : v } },
        },
      },
    });
    return () => { chart.destroy(); };
  }, [data, height]);
  return <div style={{ height }}><canvas ref={canvasRef} /></div>;
};
