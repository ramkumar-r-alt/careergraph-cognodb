import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Badge, Card, DbErrorBlock, EmptyBlock, SkeletonCards } from "@/components/ui-bits";
import { getJobs } from "@/lib/careergraph.functions";

const LEVELS = ["", "Junior", "Mid", "Senior", "Lead"];

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs — CareerGraph" },
      {
        name: "description",
        content:
          "Browse jobs by required skill and seniority, each connected to its company in the graph.",
      },
      { property: "og:title", content: "Jobs — CareerGraph" },
      {
        property: "og:description",
        content: "Jobs discovered through REQUIRES relationships between roles and skills.",
      },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const [skill, setSkill] = useState("");
  const [level, setLevel] = useState("");
  const fetchJobs = useServerFn(getJobs);

  const jobs = useQuery({
    queryKey: ["jobs", skill, level],
    queryFn: () => fetchJobs({ data: { skill, level } }),
    retry: 0,
  });

  return (
    <AppShell
      title="Jobs"
      description="Each job is reached through its required skills and the company that offers it."
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <input
          value={skill}
          onChange={(event) => setSkill(event.target.value)}
          placeholder="Filter by skill (e.g. React)"
          className="focus-ring w-64 rounded-lg border border-input bg-card px-3 py-2 text-sm"
        />
        <select
          value={level}
          onChange={(event) => setLevel(event.target.value)}
          className="focus-ring rounded-lg border border-input bg-card px-3 py-2 text-sm"
        >
          {LEVELS.map((option) => (
            <option key={option || "all"} value={option}>
              {option || "All levels"}
            </option>
          ))}
        </select>
      </div>

      {jobs.isError ? (
        <DbErrorBlock
          onRetry={() => jobs.refetch()}
          detail={jobs.error instanceof Error ? jobs.error.message : undefined}
        />
      ) : null}
      {jobs.isPending ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">Loading jobs from the graph…</p>
          <SkeletonCards count={6} columns={3} />
        </>
      ) : null}
      {!jobs.isPending && jobs.data?.length === 0 ? (
        <EmptyBlock
          title="No jobs match those filters"
          description="No job in the graph requires that skill at the selected level. Try clearing a filter."
          action={
            <button
              type="button"
              onClick={() => {
                setSkill("");
                setLevel("");
              }}
              className="focus-ring rounded-lg bg-primary px-4 py-2 text-sm font-semibold cursor-pointer text-primary-foreground hover:bg-primary/90"
            >
              Clear filters
            </button>
          }
        />
      ) : null}

      <div
        className={`grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${jobs.isFetching && !jobs.isPending ? "opacity-60 transition-opacity" : "transition-opacity"}`}
        aria-busy={jobs.isFetching}
      >
        {jobs.data?.map((job) => (
          <Card key={job.id}>
            <h3 className="text-base font-semibold">{job.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {job.company} · {job.location}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="primary">{job.level}</Badge>
              {job.remote ? <Badge tone="accent">Remote</Badge> : null}
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Required skills
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(job.matchingSkills ?? []).map((name) => (
                <Badge key={name}>{name}</Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}