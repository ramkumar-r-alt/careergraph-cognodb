import { Link, createFileRoute } from "@tanstack/react-router";

/** Catch-all: any unmatched URL renders this friendly page instead of failing. */
export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "Page not found — CareerGraph" },
      {
        name: "description",
        content: "This CareerGraph URL doesn't exist. Jump back to the dashboard or the skill graph.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Page not found — CareerGraph" },
      { property: "og:description", content: "This CareerGraph URL doesn't exist." },
    ],
  }),
  component: NotFoundPage,
});

const SUGGESTIONS = [
  { to: "/", label: "Dashboard", hint: "Your skills, matches and gaps" },
  { to: "/careers", label: "Career Explorer", hint: "Match scores and gap analysis" },
  { to: "/graph", label: "Skill Graph", hint: "Multi-hop skill traversal" },
  { to: "/jobs", label: "Jobs", hint: "Filter roles by skill and level" },
  { to: "/companies", label: "Companies", hint: "Who is hiring your skills" },
] as const;

function NotFoundPage() {
  const { _splat } = Route.useParams();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="card-surface overflow-hidden">
          <div className="bg-gradient-hero px-8 py-10 text-center">
            <p className="font-display text-6xl font-bold text-hero-foreground">404</p>
            <h1 className="mt-3 font-display text-2xl font-semibold text-hero-foreground">
              That page isn&apos;t in the graph
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-hero-foreground/75">
              {_splat ? `No route matches “/${_splat}”.` : "This URL doesn't match any route."} Nothing
              broke — pick a destination below.
            </p>
          </div>
          <div className="grid gap-2 p-6 sm:grid-cols-2">
            {SUGGESTIONS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="focus-ring rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary"
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.hint}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}