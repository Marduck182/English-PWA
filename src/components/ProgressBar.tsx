interface Props {
  value: number // 0..1
  className?: string
}

export function ProgressBar({ value, className = '' }: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-slate-800 ${className}`}>
      <div
        className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
