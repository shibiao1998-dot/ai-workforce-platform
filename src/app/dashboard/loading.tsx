import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-[100dvh] bg-nd-canvas px-4 py-4 sm:px-5 lg:px-6">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <Skeleton className="h-[360px] rounded-nd-xl" />
          <Skeleton className="h-[360px] rounded-nd-xl" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-nd-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
          <Skeleton className="h-72 rounded-nd-lg" />
          <Skeleton className="h-72 rounded-nd-lg" />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
          <Skeleton className="h-[450px] rounded-nd-lg" />
          <div className="grid grid-cols-1 gap-4">
            <Skeleton className="h-56 rounded-nd-lg" />
            <Skeleton className="h-72 rounded-nd-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
