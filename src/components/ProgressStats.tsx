interface StatItem {
  label: string
  value: string
  note?: string
}

interface Props {
  items: StatItem[]
}

export function ProgressStats({ items }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="card border-slate-700/70 bg-slate-950/80 p-4">
          <div className="text-sm uppercase tracking-[0.24em] text-slate-400">{item.label}</div>
          <div className="mt-3 text-3xl font-semibold text-slate-100">{item.value}</div>
          {item.note && <div className="mt-2 text-xs text-slate-500">{item.note}</div>}
        </div>
      ))}
    </div>
  )
}
