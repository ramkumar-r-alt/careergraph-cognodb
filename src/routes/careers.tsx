import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useProfile } from "@/components/profile-context";
import {
  Badge,
  Card,
  DbErrorBlock,
  EmptyBlock,
  LoadingBlock,
  MatchBar,
  SectionTitle,
} from "@/components/ui-bits";
import { getCareerDetail, getCareerMatches } from "@/lib/careergraph.functions";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Career Explorer — CareerGraph" },
      {
        name: "description",
        content:
          "Compare career matches, see owned versus missing skills and find companies hiring for each role.",
      },
      { property: "og:title", content: "Career Explorer — CareerGraph" },
      {
        property: "og:description",
        content: "Graph-backed career matching with live skill-gap analysis for every role.",
      },
    ],
  }),
  component: CareerExplorer,
});

function CareerExplorer() {
  const { personId } = useProfile();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const fetchMatches = useServerFn(getCareerMatches);
  const fetchDetail = useServerFn(getCareerDetail);

  const matches = useQuery({
    queryKey: ["career-matches", personId],
    queryFn: () => fetchMatches({ data: { personId, limit: 20 } }),
    retry: 0,
  });

  const activeId = selected ?? matches.data?.[0]?.id ?? null;

  const detail = useQuery({
    queryKey: ["career-detail", activeId, personId],
    queryFn: () => fetchDetail({ data: { jobId: activeId!, personId } }),
    enabled: Boolean(activeId),
    retry: 0,
  });

  const filtered = (matches.data ?? []).filter((match) =>
    `${match.title} ${match.company}`.toLowerCase().includes(search.toLowerCase()),
  );
  const active = filtered.find((match) => match.id === activeId) ?? matches.data?.find((m) => m.id === activeId);

  return (
    <AppShell
      title="Career Explorer"
      description="Pick a career to see match score, skill coverage, missing skills and connected learning resources."
    >
      {matches.isError ? (
        <DbErrorBlock
          onRetry={() => matches.refetch()}
          detail={matches.error instanceof Error ? matches.error.message : undefined}
        />
      ) : null}

      {matches.isPending ? <LoadingBlock label="Matching your skills against jobs…" /> : null}

      {matches.data ? (
        <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <div>
            <label className="mb-3 block">
              <span className="sr-only">Search careers</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search careers or companies…"
                className="focus-ring w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
              />
            </label>
            {filtered.length === 0 ? (
              <EmptyBlock
                title="No careers match that search"
                description="Try a different role or company name, or clear the search box."
              />
            ) : (
              <ul className="space-y-2">
                {filtered.map((match) => (
                  <li key={match.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(match.id)}
                      className={`focus-ring w-full rounded-xl border px-4 py-3 text-left cursor-pointer transition-colors ${
                        match.id === activeId
                          ? "border-primary bg-primary-soft"
                          : "border-border bg-card hover:bg-secondary"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{match.title}</span>
                        <span className="text-xs font-semibold text-primary">{match.matchPercentage}%</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {match.company} · {match.level}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-6">
            {detail.isError ? (
              <DbErrorBlock
                onRetry={() => detail.refetch()}
                detail={detail.error instanceof Error ? detail.error.message : undefined}
              />
            ) : null}
            {detail.isPending && activeId ? <LoadingBlock label="Running skill-gap analysis…" /> : null}
            {!activeId ? (
              <EmptyBlock
                title="No career selected"
                description="This profile has no jobs connected through shared skills yet."
              />
            ) : null}

            {detail.data && active ? (
              <>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-xl font-semibold">{active.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {active.company} · {active.location}
                        {active.remote ? " · Remote" : ""} · {active.level}
                      </p>
                    </div>
                    <Badge tone="primary">{active.matchPercentage}% match</Badge>
                  </div>
                  <div className="mt-4 space-y-2">
                    <MatchBar value={active.matchPercentage} />
                    <p className="text-xs text-muted-foreground">
                      {active.matchedSkills} of {active.totalSkills} required skills covered
                    </p>
                  </div>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <SectionTitle title="Skills you already have" />
                    {detail.data.owned.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None of this role&apos;s skills yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {detail.data.owned.map((row) => (
                          <Badge key={row.skill} tone="accent">
                            {row.skill} · {row.proficiency}/5
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                  <Card>
                    <SectionTitle title="Missing skills" />
                    {detail.data.missing.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        You already cover every required skill for this role.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {detail.data.missing.map((row) => (
                          <li key={row.missingSkill} className="flex items-center justify-between gap-3">
                            <Link
                              to="/graph"
                              search={{ skill: row.missingSkill, hops: 2 }}
                              className="focus-ring text-sm font-medium hover:text-primary hover:underline"
                            >
                              {row.missingSkill}
                            </Link>
                            <Badge tone="warning">{row.difficulty}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </div>

                <Card>
                  <SectionTitle
                    title="Learning resources for the gaps"
                    subtitle="Skill -[:TAUGHT_BY]-> Resource"
                  />
                  {detail.data.resources.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No resources connected to these skills.</p>
                  ) : (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {detail.data.resources.map((resource) => (
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
                  )}
                </Card>

                {detail.data.missing[0] ? (
                  <Link
                    to="/graph"
                    search={{ skill: detail.data.missing[0].missingSkill, hops: 3 }}
                    className="focus-ring inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    View skill path for {detail.data.missing[0].missingSkill} →
                  </Link>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}