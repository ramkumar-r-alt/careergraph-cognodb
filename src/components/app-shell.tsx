import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";

import { listProfiles } from "@/lib/careergraph.functions";
import { useProfile } from "@/components/profile-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/careers", label: "Career Explorer" },
  { to: "/graph", label: "Skill Graph" },
  { to: "/jobs", label: "Jobs" },
  { to: "/companies", label: "Companies" },
] as const;

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { personId, setPersonId } = useProfile();
  const fetchProfiles = useServerFn(listProfiles);
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: () => fetchProfiles({}), retry: 1 });

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="bg-sidebar text-sidebar-foreground lg:min-h-screen lg:w-64 lg:shrink-0">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            CG
          </span>
          <span className="font-display text-base font-semibold">CareerGraph</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col lg:overflow-visible">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "focus-ring whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {/* <div className="hidden border-t border-sidebar-border px-5 py-4 text-xs text-sidebar-foreground/60 lg:block">
          Live data from CognoDB via Bolt. Every screen is powered by parameterized Cypher.
        </div> */}
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-border bg-card/85 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-semibold">{title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-end gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Demo profile
                <select
                  value={personId}
                  onChange={(event) => setPersonId(event.target.value)}
                  className="focus-ring min-w-56 rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium normal-case tracking-normal text-foreground"
                >
                  {(profiles.data ?? [{ id: personId, name: "Loading…" }]).map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </label>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="px-5 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}