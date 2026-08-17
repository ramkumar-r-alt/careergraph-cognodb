import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { healthCheck } from "./cognodb.server";
import { seedGraph } from "./seed.server";
import * as repo from "./queries.server";

export const getHealth = createServerFn({
  method: "GET",
}).handler(async () => healthCheck());

export const seedDatabase = createServerFn({
  method: "POST",
}).handler(async () => seedGraph());

export const listProfiles = createServerFn({
  method: "GET",
}).handler(async () => repo.listPeople());

export const getDashboard = createServerFn({
  method: "GET",
})
  .validator((data: unknown) =>
    z
      .object({
        personId: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    repo.getDashboard(data.personId),
  );

export const getCareerMatches = createServerFn({
  method: "GET",
})
  .validator((data: unknown) =>
    z
      .object({
        personId: z.string().min(1),
        limit: z
          .number()
          .int()
          .min(1)
          .max(40)
          .default(12),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    repo.getCareerMatches(
      data.personId,
      data.limit,
    ),
  );

export const getCareerDetail = createServerFn({
  method: "GET",
})
  .validator((data: unknown) =>
    z
      .object({
        jobId: z.string().min(1),
        personId: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const [
      missing,
      owned,
      company,
    ] = await Promise.all([
      repo.getSkillGaps(
        data.jobId,
        data.personId,
      ),

      repo.getOwnedSkillsForJob(
        data.jobId,
        data.personId,
      ),

      repo
        .getJobsForSkill(
          "",
          "",
          200,
        )
        .then(
          (jobs) =>
            jobs.find(
              (job) =>
                job.id === data.jobId,
            ) ?? null,
        ),
    ]);

    const resources =
      await repo.getResourcesForSkills(
        missing.map(
          (row) =>
            row.missingSkill,
        ),
        8,
      );

    return {
      missing,
      owned,
      job: company,
      resources,
    };
  });

export const searchSkills = createServerFn({
  method: "GET",
})
  .validator((data: unknown) =>
    z
      .object({
        query: z.string().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    repo.searchSkills(data.query),
  );

export const getSkillGraph = createServerFn({
  method: "GET",
})
  .validator((data: unknown) =>
    z
      .object({
        skill: z.string().min(1),
        hops: z
          .number()
          .int()
          .min(1)
          .max(3)
          .default(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    repo.getSkillGraph(
      data.skill,
      data.hops,
    ),
  );

export const getSkillPaths = createServerFn({
  method: "GET",
})
  .validator((data: unknown) =>
    z
      .object({
        skill: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    repo.getSkillPaths(data.skill),
  );

export const getJobs = createServerFn({
  method: "GET",
})
  .validator((data: unknown) =>
    z
      .object({
        skill: z.string().default(""),
        level: z.string().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    repo.getJobsForSkill(
      data.skill,
      data.level,
    ),
  );

export const listCompanies =
  createServerFn({
    method: "GET",
  }).handler(async () =>
    repo.listCompanies(),
  );

export const getCompanyDetail =
  createServerFn({
    method: "GET",
  })
    .validator((data: unknown) =>
      z
        .object({
          companyId:
            z.string().min(1),
        })
        .parse(data),
    )
    .handler(async ({ data }) =>
      repo.getCompanyDetail(
        data.companyId,
      ),
    );

export const getCompanyMatches =
  createServerFn({
    method: "GET",
  })
    .validator((data: unknown) =>
      z
        .object({
          personId:
            z.string().min(1),
        })
        .parse(data),
    )
    .handler(async ({ data }) =>
      repo.getCompanyMatches(
        data.personId,
      ),
    );