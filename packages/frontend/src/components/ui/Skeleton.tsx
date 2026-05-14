export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`}
      style={{ animationDuration: "1.5s" }}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: rows }).map((_: unknown, i: number) => (
        <div key={i} className="flex gap-6">
          {Array.from({ length: cols }).map((__: unknown, j: number) => (
            <Skeleton key={j} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
