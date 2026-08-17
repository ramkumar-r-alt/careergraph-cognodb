import { runWrites, runQuery } from "./cognodb.server";
import { companies, jobs, people, prerequisiteOf, relatedTo, resources, skills } from "./seed-data.server";

/**
 * Idempotent seed: every write uses MERGE keyed on id/name, so re-running the
 * seed converges to the same graph instead of duplicating nodes or edges.
 */
export async function seedGraph(): Promise<{ nodes: number; relationships: number }> {
  await runWrites([
    { cypher: "CREATE INDEX skill_name IF NOT EXISTS FOR (s:Skill) ON (s.name)" },
    { cypher: "CREATE INDEX person_id IF NOT EXISTS FOR (p:Person) ON (p.id)" },
    { cypher: "CREATE INDEX job_id IF NOT EXISTS FOR (j:Job) ON (j.id)" },
    { cypher: "CREATE INDEX company_id IF NOT EXISTS FOR (c:Company) ON (c.id)" },
    {
      cypher: `UNWIND $rows AS row
        MERGE (s:Skill {id: row.id})
        SET s.name = row.name, s.category = row.category, s.difficulty = row.difficulty`,
      params: { rows: skills },
    },
    {
      cypher: `UNWIND $rows AS row
        MERGE (c:Company {id: row.id})
        SET c.name = row.name, c.industry = row.industry, c.location = row.location`,
      params: { rows: companies },
    },
    {
      cypher: `UNWIND $rows AS row
        MERGE (j:Job {id: row.id})
        SET j.title = row.title, j.level = row.level, j.location = row.location, j.remote = row.remote
        WITH j, row
        MATCH (c:Company {id: row.company})
        MERGE (j)-[:OFFERED_BY]->(c)
        WITH j, row
        UNWIND row.skills AS skillName
        MATCH (s:Skill {name: skillName})
        MERGE (j)-[r:REQUIRES]->(s)
        SET r.importance = 3`,
      params: { rows: jobs },
    },
    {
      cypher: `UNWIND $rows AS row
        MERGE (res:Resource {id: row.id})
        SET res.title = row.title, res.type = row.type, res.url = row.url
        WITH res, row
        MATCH (s:Skill {name: row.skill})
        MERGE (s)-[:TAUGHT_BY]->(res)`,
      params: { rows: resources },
    },
    {
      cypher: `UNWIND $rows AS row
        MERGE (p:Person {id: row.id})
        SET p.name = row.name, p.title = row.title
        WITH p, row
        UNWIND row.skills AS pair
        MATCH (s:Skill {name: pair[0]})
        MERGE (p)-[r:HAS_SKILL]->(s)
        SET r.proficiency = pair[1]`,
      params: { rows: people },
    },
    {
      cypher: `UNWIND $rows AS row
        MATCH (a:Skill {name: row[0]}), (b:Skill {name: row[1]})
        MERGE (a)-[r:RELATED_TO]->(b)
        SET r.weight = row[2]`,
      params: { rows: relatedTo },
    },
    {
      cypher: `UNWIND $rows AS row
        MATCH (a:Skill {name: row[0]}), (b:Skill {name: row[1]})
        MERGE (a)-[r:PREREQUISITE_OF]->(b)
        SET r.confidence = row[2]`,
      params: { rows: prerequisiteOf },
    },
  ]);

  const rows = await runQuery<{ nodes: number; relationships: number }>(
    `MATCH (n) WITH count(n) AS nodes
     MATCH ()-[r]->() RETURN nodes, count(r) AS relationships`,
  );
  return rows[0] ?? { nodes: 0, relationships: 0 };
}