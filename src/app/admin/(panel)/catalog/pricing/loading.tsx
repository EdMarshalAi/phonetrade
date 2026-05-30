export default function PricingLoading() {
  return (
    <div className="space-y-5">
      <div className="h-16 animate-pulse rounded-lg bg-surface" />
      <div className="flex gap-3">
        <div className="h-9 w-40 animate-pulse rounded-sm bg-surface" />
        <div className="h-9 w-64 animate-pulse rounded-sm bg-surface" />
      </div>
      <div className="space-y-2 rounded-lg border border-border/60 bg-white p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-sm bg-surface" />
        ))}
      </div>
    </div>
  );
}
