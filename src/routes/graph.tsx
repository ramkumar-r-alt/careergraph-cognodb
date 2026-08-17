import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";

import { AppShell } from "@/components/app-shell";
import { SkillGraph } from "@/components/skill-graph";
import {
  Badge,
  Card,
  DbErrorBlock,
  EmptyBlock,
  LoadingBlock,
  SectionTitle,
  SkeletonGraph,
  SkeletonList,
} from "@/components/ui-bits";
import { getSkillGraph, getSkillPaths, searchSkills } from "@/lib/careergraph.functions";

export const Route = createFileRoute("/graph")({
  validateSearch: (search: Record<string, unknown>) =>
    z
      .object({
        skill: z.string().catch("React"),
        hops: z.coerce.number().int().min(1).max(3).catch(2),
      })
      .parse(search),
  head: () => ({
    meta: [
      { title: "Skill Graph — CareerGraph" },
      {
        name: "description",
        content:
          "Interactive 1-3 hop skill traversal: related skills, prerequisites and multi-hop learning paths.",
      },
      { property: "og:title", content: "Skill Graph — CareerGraph" },
      {
        property: "og:description",
        content: "Zoom, pan and explore skill relationships straight from the graph database.",
      },
    ],
  }),
  component: SkillGraphPage,
});

function SkillGraphPage() {
  const { skill, hops } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [query, setQuery] = useState("");

  const fetchGraph = useServerFn(getSkillGraph);
  const fetchPaths = useServerFn(getSkillPaths);
  const fetchSkills = useServerFn(searchSkills);

  const skillList = useQuery({
    queryKey: ["skills", query],
    queryFn: () => fetchSkills({ data: { query } }),
    retry: 0,
  });

  const graph = useQuery({
    queryKey: ["skill-graph", skill, hops],
    queryFn: () => fetchGraph({ data: { skill, hops } }),
    retry: 0,
  });

  const paths = useQuery({
    queryKey: ["skill-paths", skill],
    queryFn: () => fetchPaths({ data: { skill } }),
    retry: 0,
  });

  const setSkill = (next: string) => navigate({ search: { skill: next, hops } });

  const uniquePaths = (paths.data ?? []).filter(
    (path, index, all) =>
      all.findIndex((other) => other.skillPath.join(">") === path.skillPath.join(">")) === index,
  );

  return (
    <AppShell
      title="Skill Graph"
      description="Traverse RELATED_TO and PREREQUISITE_OF relationships one to three hops out from any skill."
    >
      <div className="grid gap-6 xl:grid-cols-[18rem_1fr]">
        <div className="space-y-4">
          <Card>
            <SectionTitle title="Choose a skill" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search skills…"
              className="focus-ring w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
            />
            <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
              {skillList.isPending ? <SkeletonList count={5} /> : null}
              {skillList.isError ? (
                <p className="text-sm text-destructive">Skill list unavailable.</p>
              ) : null}
              {!skillList.isPending && skillList.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No skill matches that search.</p>
              ) : null}
              {skillList.data?.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSkill(item.name)}
                  className={`focus-ring flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm cursor-pointer transition-colors ${
                    item.name === skill ? "bg-primary-soft font-semibold text-primary" : "hover:bg-secondary"
                  }`}
                >
                  {item.name}
                  <span className="text-xs text-muted-foreground">{item.category}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle title="Traversal depth" subtitle="How many hops to expand." />
            <div className="flex gap-2">
              {[1, 2, 3].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => navigate({ search: { skill, hops: value } })}
                  className={`focus-ring flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    value === hops
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-card hover:bg-secondary"
                  }`}
                >
                  {value} hop{value === 1 ? "" : "s"}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {graph.isError ? (
            <DbErrorBlock
              onRetry={() => graph.refetch()}
              detail={graph.error instanceof Error ? graph.error.message : undefined}
            />
          ) : null}
          {graph.isPending ? <SkeletonGraph /> : null}
          {graph.data && graph.data.nodes.length === 0 ? (
            <EmptyBlock
              title={`No connections for “${skill}”`}
              description="Pick a skill from the list on the left — the graph only contains seeded skills."
            />
          ) : null}
          {graph.data && graph.data.nodes.length > 0 ? (
            <div
              className={
                graph.isFetching ? "opacity-60 transition-opacity" : "transition-opacity"
              }
              aria-busy={graph.isFetching}
            >
              <SkillGraph data={graph.data} center={skill} onSelectSkill={setSkill} />
            </div>
          ) : null}

          <section>
            <SectionTitle
              title={`Multi-hop paths from ${skill}`}
              subtitle="Chains of RELATED_TO / PREREQUISITE_OF two to three hops long."
            />
            {paths.isError ? (
              <DbErrorBlock
                onRetry={() => paths.refetch()}
                detail={paths.error instanceof Error ? paths.error.message : undefined}
              />
            ) : null}
            {paths.isPending ? <LoadingBlock label="Finding 2–3 hop paths…" /> : null}
            {!paths.isPending && !paths.isError && uniquePaths.length === 0 ? (
              <EmptyBlock
                title="No 2–3 hop paths from this skill"
                description="This skill has no outgoing chains of that length. Try React, Python, Docker or SQL."
              />
            ) : null}
            {uniquePaths.length > 0 ? (
              <Card>
                <ul className="space-y-3">
                  {uniquePaths.map((path, index) => (
                    <li
                      key={`${path.skillPath.join("-")}-${index}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      {path.skillPath.map((node, position) => (
                        <span key={`${node}-${position}`} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSkill(node)}
                            className="focus-ring text-sm font-medium hover:text-primary hover:underline"
                          >
                            {node}
                          </button>
                          {position < path.skillPath.length - 1 ? (
                            <span className="text-muted-foreground">→</span>
                          ) : null}
                        </span>
                      ))}
                      <Badge tone="primary">{path.distance} hops</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </section>
        </div>
      </div>
    </AppShell>
  );
}