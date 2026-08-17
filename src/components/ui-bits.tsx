import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card-surface p-5", className)}>{children}</div>;
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "accent" | "warning" | "danger";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-secondary text-secondary-foreground",
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent/12 text-accent",
    warning: "bg-warning/15 text-warning",
    danger: "bg-destructive/12 text-destructive",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "primary" | "accent" | "warning" | "success";
}) {
  const rings: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/12 text-accent",
    warning: "bg-warning/15 text-warning",
    success: "bg-success/15 text-success",
  };
  return (
    <Card className="p-5 transition-shadow hover:shadow-elevated">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
        </div>
        {icon ? (
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", rings[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export function LoadingBlock({ label = "Loading graph data…" }: { label?: string }) {
  return (
    <Card className="space-y-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
    </Card>
  );
}

/** Card-shaped placeholder grid used while list data is loading. */
export function SkeletonCards({ count = 6, columns = 3 }: { count?: number; columns?: 1 | 2 | 3 }) {
  const grid = {
    1: "grid-cols-1",
    2: "sm:grid-cols-2",
    3: "md:grid-cols-2 xl:grid-cols-3",
  }[columns];
  return (
    <div className={cn("grid gap-4", grid)} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Placeholder for the selectable left-hand lists. */
export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card px-4 py-3">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="mt-2 h-3 w-2/5" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder shaped like the skill graph canvas. */
export function SkeletonGraph() {
  return (
    <div className="card-surface overflow-hidden" aria-hidden="true">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-7 w-40" />
      </div>
      <div className="relative h-[420px] bg-graph-surface sm:h-[520px]">
        <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-primary/25" />
        {[
          "left-[22%] top-[24%]",
          "left-[70%] top-[20%]",
          "left-[18%] top-[68%]",
          "left-[76%] top-[64%]",
          "left-[48%] top-[16%]",
          "left-[46%] top-[82%]",
        ].map((position) => (
          <div
            key={position}
            className={cn("absolute h-12 w-12 animate-pulse rounded-full bg-muted", position)}
          />
        ))}
      </div>
      <div className="border-t border-border px-4 py-3">
        <Skeleton className="h-4 w-72" />
      </div>
    </div>
  );
}

export function EmptyBlock({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="text-center">
      <span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Card>
  );
}

export function DbErrorBlock({
  onRetry,
  detail,
}: {
  onRetry: () => void;
  detail?: string | undefined;
}) {
  return (
    <Card className="border-destructive/40 text-center">
      <h3 className="text-base font-semibold text-destructive">
        CareerGraph can&apos;t reach the graph database right now.
      </h3>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
        The CognoDB instance may be paused, unreachable, or missing credentials. Nothing is cached
        locally, so the screens stay empty until the connection is restored.
      </p>
      {detail ? (
        <p className="mx-auto mt-2 max-w-lg truncate text-xs text-muted-foreground/80">{detail}</p>
      ) : null}
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold cursor-pointer text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Retry
      </button>
    </Card>
  );
}

export function SkillPill({ name, tone = "neutral" }: { name: string; tone?: "neutral" | "primary" | "warning" }) {
  return <Badge tone={tone}>{name}</Badge>;
}

export function MatchBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary" aria-hidden="true">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}