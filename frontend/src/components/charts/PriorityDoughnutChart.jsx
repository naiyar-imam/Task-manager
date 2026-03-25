import {
  ArcElement,
  Chart as ChartJS,
  DoughnutController,
  Legend,
  Tooltip,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, DoughnutController, Tooltip, Legend);

export default function PriorityDoughnutChart({ distribution = {} }) {
  const total =
    (distribution.low || 0) +
    (distribution.medium || 0) +
    (distribution.high || 0);

  const data = {
    labels: ["High", "Medium", "Low"],
    datasets: [
      {
        data: [
          distribution.high || 0,
          distribution.medium || 0,
          distribution.low || 0,
        ],
        backgroundColor: ["#E11D48", "#8B5CF6", "#0EA5E9"],
        borderColor: "#F8F7F3",
        borderWidth: 4,
      },
    ],
  };

  const options = {
    cutout: "70%",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
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
    <div className="relative h-[240px]">
      <Doughnut data={data} options={options} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-3xl font-bold text-zinc-950">{total}</p>
        <p className="text-sm text-zinc-500">Prioritized</p>
      </div>
    </div>
  );
}
