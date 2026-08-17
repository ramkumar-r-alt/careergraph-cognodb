import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/app-shell";
import { useProfile } from "@/components/profile-context";
import {
  Badge,
  Card,
  DbErrorBlock,
  EmptyBlock,
  MatchBar,
  MetricCard,
  SectionTitle,
  Skeleton,
  SkeletonCards,
} from "@/components/ui-bits";
import { getDashboard, seedDatabase } from "@/lib/careergraph.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareerGraph — Skill & Career Path Explorer" },
      {
        name: "description",
        content:
          "Explore careers, skill gaps and multi-hop skill paths with a live graph database powering every match.",
      },
      { property: "og:title", content: "CareerGraph — Skill & Career Path Explorer" },
      {
        property: "og:description",
        content:
          "Graph-powered career intelligence: career matches, skill gaps and interactive multi-hop skill traversal.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { personId } = useProfile();
  const fetchDashboard = useServerFn(getDashboard);
  const seed = useServerFn(seedDatabase);

  const dashboard = useQuery({
    queryKey: ["dashboard", personId],
    queryFn: () => fetchDashboard({ data: { personId } }),
    retry: 0,
  });

  const seedMutation = useMutation({
    mutationFn: () => seed({}),
    onSuccess: () => dashboard.refetch(),
  });

  const data = dashboard.data;
  const topMatch = data?.matches[0];
  const averageMatch = data && data.matches.length > 0
    ? Math.round(data.matches.reduce((total, match) => total + match.matchPercentage, 0) / data.matches.length)
    : 0;
  const strongestSkills = [...(data?.skills ?? [])]
    .sort((a, b) => (b.proficiency ?? 0) - (a.proficiency ?? 0))
    .slice(0, 6);
  const topGapDemand = Math.max(1, ...(data?.gaps ?? []).map((gap) => gap.demand ?? 0));

  return (
    <AppShell
      title="Dashboard"
      description="Your skills, closest career matches and biggest gaps — all traversed live in CognoDB."
    >
      {dashboard.isPending ? (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="space-y-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-28" />
              </Card>
            ))}
          </div>
          <SkeletonCards count={4} columns={2} />
        </div>
      ) : null}

      {dashboard.isError ? (
        <DbErrorBlock
          onRetry={() => dashboard.refetch()}
          detail={dashboard.error instanceof Error ? dashboard.error.message : undefined}
        />
      ) : null}

      {!dashboard.isPending && !dashboard.isError && !data ? (
        <Card className="text-center">
          <h3 className="text-base font-semibold">The graph looks empty</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            No profile was found for this selection. Run the idempotent seed workflow to load the demo
            graph (people, skills, jobs, companies and learning resources).
          </p>
          <button
            type="button"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="focus-ring mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold cursor-pointer text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {seedMutation.isPending ? "Seeding graph…" : "Seed demo graph"}
          </button>
          {seedMutation.isError ? (
            <p className="mt-3 text-xs text-destructive">Seeding failed. Check the database connection.</p>
          ) : null}
        </Card>
      ) : null}

      {data ? (
        <div className="space-y-8">
          <section className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 shadow-elevated sm:p-8">
            <div className="relative flex flex-wrap items-center justify-between gap-8">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hero-foreground/70">
                  Live graph traversal
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-hero-foreground">
                  {data.person.name}
                </h2>
                <p className="mt-1 text-sm text-hero-foreground/80">
                  {data.person.title ?? "Candidate"} · {data.skills.length} skills ·{" "}
                  {data.connections} reachable nodes
                </p>
                {topMatch ? (
                  <p className="mt-4 text-sm text-hero-foreground/85">
                    Closest role:{" "}
                    <span className="font-semibold text-hero-foreground">{topMatch.title}</span> at{" "}
                    {topMatch.company} — {topMatch.matchPercentage}% match.
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    to="/careers"
                    className="focus-ring rounded-lg bg-hero-foreground px-4 py-2 text-sm font-semibold text-hero-cta transition-opacity hover:opacity-90"
                  >
                    Explore career matches
                  </Link>
                  <Link
                    to="/graph"
                    search={{ skill: data.skills[0]?.name ?? "React", hops: 2 }}
                    className="focus-ring rounded-lg border border-hero-foreground/35 px-4 py-2 text-sm font-semibold text-hero-foreground transition-colors hover:bg-hero-foreground/10"
                  >
                    Open skill graph
                  </Link>
                </div>
              </div>
              <ScoreRing value={averageMatch} label="Avg. match" />
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Skills"
              value={data.skills.length}
              hint={data.person.title ?? ""}
              tone="primary"
              icon={<StatIcon path="M12 3 4 7v6c0 4.4 3.4 7.4 8 8 4.6-.6 8-3.6 8-8V7Z" />}
            />
            <MetricCard
              label="Career matches"
              value={data.matches.length}
              hint="Jobs sharing your skills"
              tone="success"
              icon={<StatIcon path="M4 17 9 12l3 3 7-7M20 8h-4m4 0v4" />}
            />
            <MetricCard
              label="Skill gaps"
              value={data.gaps.length}
              hint="Missing skills in demand"
              tone="warning"
              icon={<StatIcon path="M12 8v5m0 4h.01M10.3 3.9 2.6 17.4A1.6 1.6 0 0 0 4 19.8h16a1.6 1.6 0 0 0 1.4-2.4L13.7 3.9a1.6 1.6 0 0 0-2.8 0Z" />}
            />
            <MetricCard
              label="Graph connections"
              value={data.connections}
              hint="Jobs + companies reachable from your skills"
              tone="accent"
              icon={<StatIcon path="M6 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM12 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-5.2-9.6 4 5m6.4-5-4 5" />}
            />
          </div>

          <section>
            <SectionTitle
              title="Top career matches"
              subtitle="Match percentage = your matched skills ÷ all skills the job requires."
              action={
                <Link
                  to="/careers"
                  className="focus-ring text-sm font-semibold text-primary hover:underline"
                >
                  Open Career Explorer →
                </Link>
              }
            />
            {data.matches.length === 0 ? (
              <EmptyBlock
                title="No career matches yet"
                description="This profile has no skills connected to any job in the graph."
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {data.matches.map((match) => (
                  <Card key={match.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold">{match.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {match.company} · {match.location}
                          {match.remote ? " · Remote" : ""}
                        </p>
                      </div>
                      <Badge tone="primary">{match.matchPercentage}%</Badge>
                    </div>
                    <div className="mt-4 space-y-2">
                      <MatchBar value={match.matchPercentage} />
                      <p className="text-xs text-muted-foreground">
                        {match.matchedSkills} of {match.totalSkills} required skills matched · {match.level}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <SectionTitle
                title="Missing skills in demand"
                subtitle="Skills required by jobs adjacent to your current skills."
              />
              {data.gaps.length === 0 ? (
                <EmptyBlock
                  title="No gaps found"
                  description="Every adjacent job requirement is already covered by your skills."
                />
              ) : (
                <Card>
                  <ul className="divide-y divide-border">
                    {data.gaps.map((gap) => (
                      <li key={gap.skill} className="py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <Link
                            to="/graph"
                            search={{ skill: gap.skill, hops: 2 }}
                            className="focus-ring text-sm font-medium hover:text-primary hover:underline"
                          >
                            {gap.skill}
                          </Link>
                          <Badge tone="warning">{gap.demand} jobs</Badge>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-warning"
                            style={{ width: `${Math.round(((gap.demand ?? 0) / topGapDemand) * 100)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </section>

            <section>
              <SectionTitle
                title="Recommended learning resources"
                subtitle="Resources connected to your missing skills via TAUGHT_BY."
              />
              {data.resources.length === 0 ? (
                <EmptyBlock
                  title="No resources connected"
                  description="No Resource nodes are linked to your missing skills yet."
                />
              ) : (
                <Card>
                  <ul className="space-y-3">
                    {data.resources.map((resource) => (
                      <li key={resource.id}>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="focus-ring text-sm font-medium hover:text-primary hover:underline"
                        >
                          {resource.title}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {resource.type} · teaches {resource.skill}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </section>
          </div>

          <section>
            <SectionTitle title="Your skills" subtitle="HAS_SKILL relationships with proficiency." />
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Strongest proficiencies
                </p>
                <ul className="mt-3 space-y-3">
                  {strongestSkills.map((skill) => (
                    <li key={skill.name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{skill.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {skill.proficiency}/5
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${((skill.proficiency ?? 0) / 5) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  All skills on your profile
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.skills.map((skill) => (
                    <Link
                      key={skill.name}
                      to="/graph"
                      search={{ skill: skill.name, hops: 2 }}
                      className="focus-ring rounded-full"
                    >
                      <Badge tone="neutral">
                        {skill.name} · {skill.proficiency}/5
                      </Badge>
                    </Link>
                  ))}
                </div>
              </Card>
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function StatIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Circular progress indicator for the hero banner. */
function ScoreRing({ value, label }: { value: number; label: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, value)) / 100);
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-hero-foreground/20" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-hero-foreground transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-3xl font-semibold text-hero-foreground tabular-nums">
            {value}%
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-hero-foreground/70">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}