import neo4j, { type Driver, type QueryResult } from "neo4j-driver-lite";

let driver: Driver | null = null;

/** Lazily create a single CognoDB (Bolt) driver from server-only env vars. */
function getDriver(): Driver {
  if (driver) return driver;
  const uri = process.env["COGNODB_URI"];
  const username = process.env["COGNODB_USERNAME"];
  const password = process.env["COGNODB_PASSWORD"];
  if (!uri || !username || !password) {
    throw new DatabaseUnavailableError("CognoDB credentials are not configured on the server.");
  }
  const auth = neo4j.auth.basic(username, password) as Parameters<typeof neo4j.driver>[1];
  driver = neo4j.driver(uri, auth, {
    connectionTimeout: 15000,
  });
  return driver;
}

export class DatabaseUnavailableError extends Error {}

/** Convert Neo4j integers/temporal wrappers into plain JSON-safe values. */
function toPlain(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (neo4j.isInt(value as never)) return (value as { toNumber(): number }).toNumber();
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = toPlain(v);
    return out;
  }
  return value;
}

/** Run a parameterized Cypher statement and return plain rows. */
export async function runQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const session = getDriver().session();
  try {
    const result: QueryResult = await session.run(cypher, params);
    return result.records.map((record) => toPlain(record.toObject()) as T);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseUnavailableError(message);
  } finally {
    await session.close();
  }
}

/** Run several write statements inside one session (used by the seed workflow). */
export async function runWrites(
  statements: { cypher: string; params?: Record<string, unknown> }[],
): Promise<void> {
  const session = getDriver().session();
  try {
    for (const statement of statements) {
      await session.run(statement.cypher, statement.params ?? {});
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new DatabaseUnavailableError(message);
  } finally {
    await session.close();
  }
}

export async function healthCheck(): Promise<{ ok: boolean; nodes: number }> {
  const rows = await runQuery<{ nodes: number }>("MATCH (n) RETURN count(n) AS nodes");
  return { ok: true, nodes: rows[0]?.nodes ?? 0 };
}