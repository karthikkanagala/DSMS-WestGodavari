import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function BarChart({ labels, data, title, color = '#2563eb' }) {
  const chartData = {
    labels,
    datasets: [
      {
        label: title || 'Waste Collected (kg)',
        data,
        backgroundColor: color,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.raw.toLocaleString()} kg`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#f3f4f6' } },
    },
  };

  return <Bar data={chartData} options={options} />;
}

export function LineChart({ labels, data, title, color = '#2563eb' }) {
  const chartData = {
    labels,
    datasets: [
      {
        label: title || 'Daily Trend',
        data,
        borderColor: color,
        backgroundColor: `${color}15`,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.raw.toLocaleString()} kg`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#f3f4f6' } },
    },
  };

  return <Line data={chartData} options={options} />;
}

export function DonutChart({ labels, data, colors }) {
  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors || ['#22c55e', '#facc15', '#f97316', '#ef4444'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, padding: 15, font: { size: 11 } },
      },
    },
    cutout: '70%',
  };

  return <Doughnut data={chartData} options={options} />;
}
