import { runQuery } from "./cognodb.server";
import type {
  CareerMatch,
  Company,
  CompanyDetail,
  DashboardData,
  Job,
  Person,
  Resource,
  Skill,
  SkillGraphData,
  SkillPath,
} from "./types";

/** All Cypher lives here. Every dynamic value is passed as a parameter. */

export async function listPeople(): Promise<Person[]> {
  return runQuery<Person>(
    `MATCH (p:Person)
     OPTIONAL MATCH (p)-[:HAS_SKILL]->(s:Skill)
     RETURN p.id AS id, p.name AS name, p.title AS title, count(s) AS skillCount
     ORDER BY p.name`,
  );
}

export async function getCareerMatches(personId: string, limit = 8): Promise<CareerMatch[]> {
  return runQuery<CareerMatch>(
    `MATCH (p:Person {id: $personId})-[:HAS_SKILL]->(skill:Skill)
     MATCH (job:Job)-[:REQUIRES]->(skill)
     WITH job, count(DISTINCT skill) AS matchedSkills
     MATCH (job)-[:REQUIRES]->(required:Skill)
     WITH job, matchedSkills, count(DISTINCT required) AS totalSkills
     MATCH (job)-[:OFFERED_BY]->(company:Company)
     RETURN job.id AS id, job.title AS title, job.level AS level,
            job.location AS location, job.remote AS remote,
            company.name AS company,
            matchedSkills, totalSkills,
            round(100.0 * matchedSkills / totalSkills) AS matchPercentage
     ORDER BY matchPercentage DESC, matchedSkills DESC, title
     LIMIT $limit`,
    { personId, limit },
  );
}

export async function getSkillGaps(jobId: string, personId: string) {
  return runQuery<{ missingSkill: string; category: string; difficulty: string }>(
    `MATCH (job:Job {id: $jobId})-[:REQUIRES]->(required:Skill)
     OPTIONAL MATCH (person:Person {id: $personId})-[:HAS_SKILL]->(owned:Skill)
     WITH required, collect(owned.name) AS ownedSkills
     WHERE NOT required.name IN ownedSkills
     RETURN required.name AS missingSkill, required.category AS category,
            required.difficulty AS difficulty
     ORDER BY missingSkill`,
    { jobId, personId },
  );
}

export async function getOwnedSkillsForJob(jobId: string, personId: string) {
  return runQuery<{ skill: string; proficiency: number }>(
    `MATCH (job:Job {id: $jobId})-[:REQUIRES]->(required:Skill)
     MATCH (person:Person {id: $personId})-[r:HAS_SKILL]->(required)
     RETURN required.name AS skill, r.proficiency AS proficiency
     ORDER BY skill`,
    { jobId, personId },
  );
}

export async function searchSkills(query: string, limit = 20): Promise<Skill[]> {
  return runQuery<Skill>(
    `MATCH (s:Skill)
     WHERE $query = '' OR toLower(s.name) CONTAINS toLower($query)
     RETURN s.id AS id, s.name AS name, s.category AS category, s.difficulty AS difficulty
     ORDER BY s.name
     LIMIT $limit`,
    { query, limit },
  );
}

/** Relationship-heavy: expands a skill neighbourhood up to `hops` levels. */
export async function getSkillGraph(skill: string, hops: number): Promise<SkillGraphData> {
  const rows = await runQuery<{
    source: string;
    target: string;
    relationship: string | null;
    sourceCategory: string;
    targetCategory: string;
  }>(
    `MATCH (start:Skill {name: $skill})
     OPTIONAL MATCH path = (start)-[:RELATED_TO|PREREQUISITE_OF*1..3]-(other:Skill)
     WHERE length(path) <= $hops
     UNWIND relationships(path) AS rel
     WITH DISTINCT rel, startNode(rel) AS a, endNode(rel) AS b
     RETURN a.name AS source, b.name AS target, type(rel) AS relationship,
            a.category AS sourceCategory, b.category AS targetCategory
     LIMIT 400`,
    { skill, hops },
  );

  const nodes = new Map<string, { id: string; label: string; group: string; distance: number }>();
  const edges: { source: string; target: string; type: string }[] = [];
  const seenEdges = new Set<string>();

  const addNode = (name: string, category: string) => {
    if (!nodes.has(name)) {
      nodes.set(name, {
        id: name,
        label: name,
        group: category ?? "Skill",
        distance: name === skill ? 0 : 99,
      });
    }
  };

  for (const row of rows) {
    addNode(row.source, row.sourceCategory);
    addNode(row.target, row.targetCategory);
    const key = `${row.source}|${row.target}|${row.relationship}`;
    if (!seenEdges.has(key)) {
      seenEdges.add(key);
      edges.push({ source: row.source, target: row.target, type: row.relationship ?? "RELATED_TO" });
    }
  }

  if (nodes.size === 0) {
    const exists = await runQuery<{ name: string; category: string }>(
      `MATCH (s:Skill {name: $skill}) RETURN s.name AS name, s.category AS category`,
      { skill },
    );
    if (exists[0]) addNode(exists[0].name, exists[0].category);
  }

  // BFS from the selected skill to assign hop distance for the radial layout.
  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }
  const queue: string[] = [skill];
  const distances = new Map<string, number>([[skill, 0]]);
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!distances.has(next)) {
        distances.set(next, (distances.get(current) ?? 0) + 1);
        queue.push(next);
      }
    }
  }
  const visible = [...nodes.values()]
    .map((node) => ({ ...node, distance: distances.get(node.id) ?? 99 }))
    .filter((node) => node.distance <= hops);
  const visibleIds = new Set(visible.map((node) => node.id));

  return {
    nodes: visible,
    edges: edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
  };
}

/** Mandatory multi-hop traversal: 2–3 hop learning paths from a skill. */
export async function getSkillPaths(skill: string, limit = 12): Promise<SkillPath[]> {
  return runQuery<SkillPath>(
    `MATCH path = (start:Skill {name: $skill})-[:RELATED_TO|PREREQUISITE_OF*2..3]->(target:Skill)
     WHERE target.name <> $skill
     RETURN [node IN nodes(path) | node.name] AS skillPath, length(path) AS distance
     ORDER BY distance, skillPath
     LIMIT $limit`,
    { skill, limit },
  );
}

export async function getJobsForSkill(skill: string, level: string, limit = 30): Promise<Job[]> {
  return runQuery<Job>(
    `MATCH (job:Job)-[:REQUIRES]->(s:Skill)
     WHERE ($skill = '' OR toLower(s.name) CONTAINS toLower($skill))
       AND ($level = '' OR job.level = $level)
     MATCH (job)-[:OFFERED_BY]->(company:Company)
     MATCH (job)-[:REQUIRES]->(all:Skill)
     RETURN job.id AS id, job.title AS title, job.level AS level, job.location AS location,
            job.remote AS remote, company.name AS company,
            collect(DISTINCT all.name) AS matchingSkills
     ORDER BY title
     LIMIT $limit`,
    { skill, level, limit },
  );
}

/** Person -> Skill -> Job -> Company traversal. */
export async function getCompanyMatches(personId: string) {
  return runQuery<{ company: string; job: string; matchingSkills: string[] }>(
    `MATCH (p:Person {id: $personId})-[:HAS_SKILL]->(s:Skill)
     MATCH (j:Job)-[:REQUIRES]->(s)
     MATCH (j)-[:OFFERED_BY]->(c:Company)
     RETURN c.name AS company, j.title AS job, collect(DISTINCT s.name) AS matchingSkills
     ORDER BY company, job`,
    { personId },
  );
}

export async function listCompanies(): Promise<Company[]> {
  return runQuery<Company>(
    `MATCH (c:Company)
     OPTIONAL MATCH (j:Job)-[:OFFERED_BY]->(c)
     RETURN c.id AS id, c.name AS name, c.industry AS industry, c.location AS location,
            count(DISTINCT j) AS jobCount
     ORDER BY c.name`,
  );
}

export async function getCompanyDetail(companyId: string): Promise<CompanyDetail | null> {
  const companyRows = await runQuery<Company>(
    `MATCH (c:Company {id: $companyId})
     RETURN c.id AS id, c.name AS name, c.industry AS industry, c.location AS location`,
    { companyId },
  );
  const company = companyRows[0];
  if (!company) return null;

  const jobs = await runQuery<Job>(
    `MATCH (j:Job)-[:OFFERED_BY]->(c:Company {id: $companyId})
     MATCH (j)-[:REQUIRES]->(s:Skill)
     RETURN j.id AS id, j.title AS title, j.level AS level, j.location AS location,
            j.remote AS remote, collect(DISTINCT s.name) AS matchingSkills
     ORDER BY title`,
    { companyId },
  );

  const topSkills = await runQuery<{ name: string; count: number }>(
    `MATCH (j:Job)-[:OFFERED_BY]->(:Company {id: $companyId})
     MATCH (j)-[:REQUIRES]->(s:Skill)
     RETURN s.name AS name, count(DISTINCT j) AS count
     ORDER BY count DESC, name
     LIMIT 10`,
    { companyId },
  );

  return { company, jobs, topSkills };
}

export async function getResourcesForSkills(skillNames: string[], limit = 6): Promise<Resource[]> {
  if (skillNames.length === 0) return [];
  return runQuery<Resource>(
    `MATCH (s:Skill)-[:TAUGHT_BY]->(r:Resource)
     WHERE s.name IN $skillNames
     RETURN r.id AS id, r.title AS title, r.type AS type, r.url AS url, s.name AS skill
     ORDER BY s.name
     LIMIT $limit`,
    { skillNames, limit },
  );
}

export async function getDashboard(personId: string): Promise<DashboardData | null> {
  const personRows = await runQuery<Person>(
    `MATCH (p:Person {id: $personId}) RETURN p.id AS id, p.name AS name, p.title AS title`,
    { personId },
  );
  const person = personRows[0];
  if (!person) return null;

  const skills = await runQuery<{ name: string; category: string; proficiency: number }>(
    `MATCH (p:Person {id: $personId})-[r:HAS_SKILL]->(s:Skill)
     RETURN s.name AS name, s.category AS category, r.proficiency AS proficiency
     ORDER BY r.proficiency DESC, s.name`,
    { personId },
  );

  const matches = await getCareerMatches(personId, 5);

  const gaps = await runQuery<{ skill: string; demand: number }>(
    `MATCH (p:Person {id: $personId})-[:HAS_SKILL]->(owned:Skill)
     WITH p, collect(owned.name) AS ownedSkills
     MATCH (p)-[:HAS_SKILL]->(:Skill)<-[:REQUIRES]-(job:Job)-[:REQUIRES]->(missing:Skill)
     WHERE NOT missing.name IN ownedSkills
     RETURN missing.name AS skill, count(DISTINCT job) AS demand
     ORDER BY demand DESC, skill
     LIMIT 8`,
    { personId },
  );

  const resources = await getResourcesForSkills(gaps.map((gap) => gap.skill), 6);

  const connectionRows = await runQuery<{ connections: number }>(
    `MATCH (p:Person {id: $personId})-[:HAS_SKILL]->(:Skill)<-[:REQUIRES]-(job:Job)-[:OFFERED_BY]->(c:Company)
     RETURN count(DISTINCT job) + count(DISTINCT c) AS connections`,
    { personId },
  );

  return {
    person,
    skills,
    matches,
    gaps,
    resources,
    connections: connectionRows[0]?.connections ?? 0,
  };
}