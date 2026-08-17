import { createFileRoute } from "@tanstack/react-router";
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
  SectionTitle,
  Skeleton,
  SkeletonCards,
  SkeletonList,
} from "@/components/ui-bits";
import { getCompanyDetail, getCompanyMatches, listCompanies } from "@/lib/careergraph.functions";

export const Route = createFileRoute("/companies")({
  head: () => ({
    meta: [
      { title: "Companies — CareerGraph" },
      {
        name: "description",
        content: "Companies, their open roles and the skills that connect them to your profile.",
      },
      { property: "og:title", content: "Companies — CareerGraph" },
      {
        property: "og:description",
        content: "Person to skill to job to company traversal in a single relationship-heavy query.",
      },
    ],
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const { personId } = useProfile();
  const [selected, setSelected] = useState<string | null>(null);

  const fetchCompanies = useServerFn(listCompanies);
  const fetchDetail = useServerFn(getCompanyDetail);
  const fetchMatches = useServerFn(getCompanyMatches);

  const companies = useQuery({
    queryKey: ["companies"],
    queryFn: () => fetchCompanies({}),
    retry: 0,
  });

  const activeId = selected ?? companies.data?.[0]?.id ?? null;

  const detail = useQuery({
    queryKey: ["company-detail", activeId],
    queryFn: () => fetchDetail({ data: { companyId: activeId! } }),
    enabled: Boolean(activeId),
    retry: 0,
  });

  const matches = useQuery({
    queryKey: ["company-matches", personId],
    queryFn: () => fetchMatches({ data: { personId } }),
    retry: 0,
  });

  const matchedForActive = (matches.data ?? []).filter(
    (row) => row.company === detail.data?.company.name,
  );

  return (
    <AppShell
      title="Companies"
      description="Companies connected to their open roles, and roles connected to the skills you already have."
    >
      {companies.isError ? (
        <DbErrorBlock
          onRetry={() => companies.refetch()}
          detail={companies.error instanceof Error ? companies.error.message : undefined}
        />
      ) : null}
      {companies.isPending ? (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <SkeletonList count={5} />
          <div className="space-y-4">
            <Card className="space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </Card>
            <SkeletonCards count={2} columns={2} />
          </div>
        </div>
      ) : null}
      {!companies.isPending && companies.data?.length === 0 ? (
        <EmptyBlock
          title="No companies in the graph"
          description="Seed the demo graph from the dashboard to populate companies."
        />
      ) : null}

      {companies.data && companies.data.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <ul className="space-y-2">
            {companies.data.map((company) => (
              <li key={company.id}>
                <button
                  type="button"
                  onClick={() => setSelected(company.id)}
                    className={`focus-ring w-full rounded-xl border px-4 py-3 text-left cursor-pointer transition-colors ${
                    company.id === activeId
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                >
                  <span className="block text-sm font-semibold">{company.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {company.industry} · {company.jobCount ?? 0} role
                    {company.jobCount === 1 ? "" : "s"}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="space-y-6">
            {detail.isError ? (
              <DbErrorBlock
                onRetry={() => detail.refetch()}
                detail={detail.error instanceof Error ? detail.error.message : undefined}
              />
            ) : null}
            {detail.isPending ? (
              <>
                <Card className="space-y-3">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </Card>
                <SkeletonCards count={2} columns={2} />
              </>
            ) : null}
            {detail.data ? (
              <>
                <Card>
                  <h2 className="font-display text-xl font-semibold">{detail.data.company.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {detail.data.company.industry} · {detail.data.company.location}
                  </p>
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Most requested skills
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {detail.data.topSkills.map((skill) => (
                        <Badge key={skill.name} tone="primary">
                          {skill.name} · {skill.count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>

                <section>
                  <SectionTitle title="Open roles" subtitle="Roles offered by this company." />
                  {detail.data.jobs.length === 0 ? (
                    <EmptyBlock
                      title="No roles connected"
                      description="This company has no jobs in the graph yet."
                    />
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {detail.data.jobs.map((job) => (
                        <Card key={job.id}>
                          <h3 className="text-base font-semibold">{job.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {job.level} · {job.location}
                            {job.remote ? " · Remote" : ""}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(job.matchingSkills ?? []).map((name) => (
                              <Badge key={name}>{name}</Badge>
                            ))}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <SectionTitle
                    title="Why this company connects to you"
                    subtitle="Your skills matched against the roles this company offers."
                  />
                  {matches.isPending ? <LoadingBlock label="Matching your skills…" /> : null}
                  {!matches.isPending && matchedForActive.length === 0 ? (
                    <EmptyBlock
                      title="No shared skills yet"
                      description="None of this company's roles require a skill on your profile."
                    />
                  ) : null}
                  {matchedForActive.length > 0 ? (
                    <Card>
                      <ul className="divide-y divide-border">
                        {matchedForActive.map((row) => (
                          <li key={row.job} className="py-2.5">
                            <p className="text-sm font-medium">{row.job}</p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {row.matchingSkills.map((name) => (
                                <Badge key={name} tone="accent">
                                  {name}
                                </Badge>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ) : null}
                </section>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}