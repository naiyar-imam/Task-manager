import {
  BarElement,
  BarController,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LineController,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Chart } from "react-chartjs-2";

import { formatChartLabel } from "../../utils/formatters";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

export default function TaskTrendChart({ trend = [] }) {
  const labels = trend.map((item) => formatChartLabel(item.date));

  const data = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Created",
        data: trend.map((item) => item.created),
        backgroundColor: "rgba(37, 99, 235, 0.72)",
        borderRadius: 10,
        borderSkipped: false,
      },
      {
        type: "bar",
        label: "Due",
        data: trend.map((item) => item.due),
        backgroundColor: "rgba(245, 158, 11, 0.55)",
        borderRadius: 10,
        borderSkipped: false,
      },
      {
        type: "line",
        label: "Completed",
        data: trend.map((item) => item.completed),
        borderColor: "#059669",
        backgroundColor: "rgba(5, 150, 105, 0.1)",
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#059669",
        fill: true,
      },
      {
        type: "line",
        label: "Overdue",
        data: trend.map((item) => item.overdue),
        borderColor: "#E11D48",
        tension: 0.35,
        borderDash: [6, 6],
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#18181B",
          usePointStyle: true,
          boxWidth: 10,
        },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        titleColor: "#111111",
        bodyColor: "#3F3F46",
        borderColor: "rgba(0, 0, 0, 0.12)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: "#52525B" },
        grid: { color: "rgba(0, 0, 0, 0.05)" },
      },
      y: {
        ticks: { color: "#52525B", precision: 0 },
        grid: { color: "rgba(0, 0, 0, 0.06)" },
      },
    },
  };

  return <Chart type="bar" data={data} options={options} />;
}
