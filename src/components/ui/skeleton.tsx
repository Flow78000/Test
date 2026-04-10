export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`animate-pulse bg-[#1E1E22] rounded-lg ${className}`} style={style} />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-[#111114] border border-[#1E1E22] rounded-xl p-4 ${className}`}>
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function SkeletonGrid({ cols = 4, rows = 1 }: { cols?: number; rows?: number }) {
  return (
    <div className={`grid gap-4 mb-6`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols * rows }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 200 }: { height?: number }) {
  return (
    <div className="bg-[#111114] border border-[#1E1E22] rounded-xl p-4">
      <Skeleton className="h-3 w-40 mb-4" />
      <Skeleton className={`w-full rounded-lg`} style={{ height }} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-[#111114] border border-[#1E1E22] rounded-xl overflow-hidden">
      <div className="p-3 border-b border-[#1E1E22]">
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="p-3 space-y-2">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex gap-3">
            {Array.from({ length: cols }, (_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorCard({ message = "Reconnexion automatique en cours", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="bg-[#111114] border border-[#FF6B0033] rounded-xl p-8 text-center">
      <div className="text-[#FF6B00] text-lg font-bold mb-2">Reconnexion en cours...</div>
      <div className="text-[#6B6B75] text-sm mb-4">{message}</div>
      <div className="text-xs text-[#6B6B75] bg-[#08080A] rounded-lg p-3 inline-block mb-4">
        Le serveur se reconnecte tout seul — aucune action requise.
      </div>
      {onRetry && (
        <div>
          <button onClick={onRetry} className="px-4 py-2 bg-[#FF6B00] text-black rounded-lg text-sm font-semibold hover:bg-[#FF8533] transition-colors">
            Forcer un rafraichissement
          </button>
        </div>
      )}
    </div>
  );
}
