export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "blue",
}) {
  const variants = {
    blue: "from-white via-blue-50/90 to-cyan-50 border-blue-200/50",
    green: "from-white via-emerald-50/90 to-lime-50 border-emerald-200/50",
    amber: "from-white via-amber-50/90 to-orange-50 border-amber-200/50",
    rose: "from-zinc-950 via-rose-950 to-fuchsia-900 border-rose-300/20",
  };

  const iconVariants = {
    blue: "bg-gradient-to-br from-blue-600 to-cyan-500 text-white",
    green: "bg-gradient-to-br from-emerald-600 to-lime-500 text-white",
    amber: "bg-gradient-to-br from-amber-500 to-orange-500 text-white",
    rose: "bg-white text-zinc-950",
  };

  const textVariants = {
    blue: { title: "text-blue-700/80", value: "text-zinc-950", subtitle: "text-zinc-600", divider: "bg-gradient-to-r from-blue-500 to-cyan-400" },
    green: { title: "text-emerald-700/80", value: "text-zinc-950", subtitle: "text-zinc-600", divider: "bg-gradient-to-r from-emerald-500 to-lime-400" },
    amber: { title: "text-amber-700/80", value: "text-zinc-950", subtitle: "text-zinc-600", divider: "bg-gradient-to-r from-amber-500 to-orange-400" },
    rose: { title: "text-rose-200", value: "text-white", subtitle: "text-zinc-300", divider: "bg-gradient-to-r from-rose-400 to-fuchsia-300" },
  };

  return (
    <div
      className={`panel bg-gradient-to-br ${variants[variant]} p-5 transition duration-300 hover:-translate-y-1`}
    >
      <div className="absolute -right-6 top-6 h-24 w-24 rounded-full bg-black/5 blur-3xl" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-[0.32em] ${textVariants[variant].title}`}>
            {title}
          </p>
          <p className={`mt-3 font-display text-4xl font-bold ${textVariants[variant].value}`}>{value}</p>
          <p className={`mt-2 max-w-[18rem] text-sm ${textVariants[variant].subtitle}`}>{subtitle}</p>
          <div className="mt-4 h-1.5 w-20 rounded-full bg-black/10">
            <div className={`h-full rounded-full ${textVariants[variant].divider}`} />
          </div>
        </div>
        <div className={`metric-orb ${iconVariants[variant]}`}>
          <Icon className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}
