import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-zinc-200/80", className)}
      aria-hidden
    />
  );
}

export function PageSkeleton({ title = "Loading" }: { title?: string }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label={title}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Bone className="h-7 w-40" />
          <Bone className="h-4 w-64 max-w-full" />
        </div>
        <Bone className="h-9 w-28" />
      </div>

      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3 space-y-2">
              <Bone className="h-3 w-16" />
              <Bone className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Bone className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Bone key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
