import {
  ArcElement,
  Chart as ChartJS,
  DoughnutController,
  Legend,
  Tooltip,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, DoughnutController, Tooltip, Legend);

export default function StatusDoughnutChart({ distribution = {} }) {
  const total =
    (distribution.pending || 0) +
    (distribution.in_progress || 0) +
    (distribution.completed || 0);

  const data = {
    labels: ["Completed", "In Progress", "Pending"],
    datasets: [
      {
        data: [
          distribution.completed || 0,
          distribution.in_progress || 0,
          distribution.pending || 0,
        ],
        backgroundColor: ["#10B981", "#2563EB", "#F59E0B"],
        borderColor: "#F8F7F3",
        borderWidth: 4,
        hoverOffset: 10,
      },
    ],
  };

  const options = {
    cutout: "72%",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#18181B",
          usePointStyle: true,
          boxWidth: 10,
          padding: 18,
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
  };

  return (
    <div className="relative h-[280px]">
      <Doughnut data={data} options={options} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Focus</p>
        <p className="font-display text-4xl font-bold text-zinc-950">{total}</p>
        <p className="text-sm text-zinc-500">Active total</p>
      </div>
      {distribution.overdue ? (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
          {distribution.overdue} overdue
        </div>
      ) : null}
    </div>
  );
}
