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
          tooltip: { backgroundColor: '#13131f', borderColor: '#252538', borderWidth: 1, padding: 12, titleColor: '#e2e2f0', bodyColor: '#6b6b88', callbacks: { label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}` } },
        },
        scales: {
          x: { grid: { color: '#1a1a2e' }, ticks: { color: '#6b6b88' } },
          y: { grid: { color: '#1a1a2e' }, ticks: { color: '#6b6b88', callback: v => '$' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v) } },
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
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#13131f', borderColor: '#252538', borderWidth: 1, padding: 10, titleColor: '#e2e2f0', bodyColor: '#6b6b88', callbacks: { label: ctx => ` $${ctx.parsed.y.toLocaleString()}` } } },
        scales: { x: { grid: { display: false }, ticks: { color: '#6b6b88' } }, y: { grid: { color: '#1a1a2e' }, ticks: { color: '#6b6b88', callback: v => '$' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v) } } },
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
          tooltip: { backgroundColor: '#13131f', borderColor: '#252538', borderWidth: 1, padding: 10, callbacks: { label: ctx => ` $${ctx.parsed.toLocaleString()} (${data[ctx.dataIndex].pct}%)` } },
        },
      },
    });
    return () => { chart.destroy(); };
  }, [data, height]);
  return <div style={{ height }}><canvas ref={canvasRef} /></div>;
};

export const SparkLine = ({ data, color = '#f5c518', height = 60, getValue }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    destroyChart(canvasRef);
    const ctx = canvasRef.current.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, color + '44');
    grad.addColorStop(1, color + '00');
    const fn = getValue || (d => d.value !== undefined ? d.value : (d.income - d.expense));
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.month),
        datasets: [{ data: data.map(fn), borderColor: color, backgroundColor: grad, borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
      },
    });
    return () => { chart.destroy(); };
  }, [data, color, height, getValue]);
  return <div style={{ height }}><canvas ref={canvasRef} /></div>;
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
          tooltip: { backgroundColor: '#13131f', borderColor: '#252538', borderWidth: 1, padding: 12, titleColor: '#e2e2f0', bodyColor: '#6b6b88', callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} units` } },
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
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#13131f', borderColor: '#252538', borderWidth: 1, padding: 10, titleColor: '#e2e2f0', bodyColor: '#6b6b88', callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString()} units` } } },
        scales: { x: { grid: { display: false }, ticks: { color: '#6b6b88' } }, y: { grid: { color: '#1a1a2e' }, ticks: { color: '#6b6b88', callback: v => v >= 1000 ? (v/1000).toFixed(1) + 'k' : v } } },
      },
    });
    return () => { chart.destroy(); };
  }, [data, height, getLabel, getValue]);
  return <div style={{ height }}><canvas ref={canvasRef} /></div>;
};
