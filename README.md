# CareerGraph

An interactive career and skill graph application built as an assessment project using **TanStack Start**, **React**, **TypeScript**, and a graph database layer powered by **CognoDB**.

## Assessment Highlights

- Graph-based data modeling and querying
- TanStack Start server functions
- Type-safe React/TypeScript UI
- Interactive SVG graph visualization
- Deterministic, non-physics graph layout
- Individual node dragging
- Canvas pan and zoom
- Technology icons using the Simple Icons CDN
- Career matching and skill-gap exploration
- Job and company discovery
- Loading, error, and empty states
- Separation of server/database logic from UI

## Core Features

### Interactive Skill Graph

The graph supports:

- Dragging individual nodes
- Dragging empty space to pan
- Mouse-wheel zoom
- Zoom controls
- Fit-to-view
- Reset layout
- Fullscreen mode
- Node selection and focus
- Double-clicking a skill to make it the graph center
- Subtle relationship highlighting
- Technology icons
- Graceful icon fallback

The graph intentionally uses a **deterministic layout without physics**. This keeps the visualization stable and predictable instead of continuously moving nodes.

### Technology Icons

Technology icons are resolved through:

```text
src/lib/stack-icons.ts
```

The application uses the Simple Icons public CDN and does not require an npm icon package or API key.

Supported examples include React, Next.js, Vue, Angular, JavaScript, TypeScript, Node.js, Python, PostgreSQL, MongoDB, Redis, AWS, Azure, GCP, Docker, Kubernetes, Terraform, Nginx, Git, GitHub, RabbitMQ, Kafka, OpenAI, TensorFlow, and PyTorch.

Unknown or unavailable icons fall back to initials.

### Career Matching

The application supports:

- Finding jobs associated with skills
- Finding career matches for a person
- Viewing skill gaps for a job
- Viewing owned skills
- Finding learning resources for missing skills
- Exploring career paths

### Job Discovery

Jobs can be filtered by skill and seniority:

```text
Junior
Mid
Senior
Lead
```

### Company Exploration

Companies can be listed and explored through company details and career matching relationships.

## Technology Stack

### Frontend

- React 19
- TypeScript
- TanStack Router
- TanStack Start
- TanStack Query
- Tailwind CSS
- Radix UI
- Lucide React
- SVG graph rendering

### Backend

- TanStack Start Server Functions
- Zod validation
- CognoDB / graph database layer

### Tooling

- Vite
- TypeScript
- ESLint
- Prettier

### Deployment

- Netlify TanStack Start plugin

## Project Structure

```text
career_graph/
├── src/
│   ├── components/
│   │   ├── app-shell.tsx
│   │   ├── skill-graph.tsx
│   │   ├── stack-icon.tsx
│   │   └── ui-bits.tsx
│   ├── lib/
│   │   ├── careergraph.functions.ts
│   │   ├── db.server.ts
│   │   ├── graph-export.ts
│   │   ├── queries.server.ts
│   │   ├── seed.server.ts
│   │   ├── stack-icons.ts
│   │   └── types.ts
│   └── routes/
│       ├── index.tsx
│       ├── jobs.tsx
│       ├── companies.tsx
│       └── ...
├── vite.config.ts
├── package.json
└── README.md
```

## Server Functions

Server operations are defined in:

```text
src/lib/careergraph.functions.ts
```

The project uses TanStack Start server functions with Zod validation.

Key operations include:

```text
getHealth
seedDatabase
listProfiles
getDashboard
getCareerMatches
getCareerDetail
searchSkills
getSkillGraph
getSkillPaths
getJobs
listCompanies
getCompanyDetail
getCompanyMatches
```

Validated functions use:

```ts
createServerFn({
  method: "GET",
})
  .validator(...)
  .handler(...)
```

This keeps database access on the server and creates a clear boundary between UI and data access.

## Graph Data Model

The application models relationships between entities such as:

```text
Person
Skill
Job
Company
Resource
```

Conceptual relationships:

```text
Person ──HAS_SKILL──────> Skill
Job ──REQUIRES──────────> Skill
Person ──MATCHES────────> Job
Job ──OFFERED_BY────────> Company
Skill ──PREREQUISITE_OF─> Skill
Skill ──HAS_RESOURCE────> Resource
```

This allows relationship-oriented queries such as:

```text
Person
  ↓
Owned Skills
  ↓
Missing Skills
  ↓
Required by Jobs
  ↓
Matching Careers
  ↓
Companies
```

## Graph UX

### Why no physics?

A physics simulation can make a graph unpredictable:

- Nodes continuously move
- Dragging one node can move other nodes
- The same graph can appear differently between renders
- Dense graphs become difficult to inspect

Instead, this project uses a deterministic radial layout based on graph distance.

Users can manually reposition individual nodes when desired.

### Interaction Model

**Node click**

Selects a node without fading unrelated nodes.

**Node drag**

Moves only the selected node. There is no physics simulation.

**Canvas pan**

Dragging empty space moves the graph viewport.

**Zoom**

Mouse-wheel zoom is centered around the cursor.

Controls include:

```text
+
-
Fit
Reset
Fullscreen
```

**Double-click**

Makes a skill the graph center.

## Icon Failure Handling

Icon loading is asynchronous because icons are fetched from a CDN.

Failed icon requests are handled through an error callback:

```text
Simple Icons CDN
       ↓
     404
       ↓
Error callback
       ↓
Fallback initials
```

A missing icon therefore cannot break graph rendering.

## Loading, Error, and Empty States

The UI includes dedicated states for:

- Loading: skeletons and loading indicators
- Error: database/server error display with retry
- Empty: clear messaging and filter reset action

## Development

Install dependencies:

```bash
npm install
```

Start development:

```bash
npm run dev
```

Force Vite dependency rebuild:

```bash
npm run dev -- --force
```

Build:

```bash
npm run build
```

Preview:

```bash
npm run preview
```

Lint:

```bash
npm run lint
```

Format:

```bash
npm run format
```

## Database and Environment

Database access is kept server-side in:

```text
src/lib/db.server.ts
src/lib/queries.server.ts
src/lib/seed.server.ts
```

Configure the required CognoDB connection values in the environment used for the assessment.

Do not commit credentials or secrets to the repository.

## Seed Data

Graph initialization is implemented in:

```text
src/lib/seed.server.ts
```

and exposed through:

```text
seedDatabase
```

This keeps database mutation logic out of UI components.

## Data Flow

```text
React Component
      │
      ▼
TanStack Query
      │
      ▼
TanStack Start Server Function
      │
      ▼
Zod Validation
      │
      ▼
Repository / Query Layer
      │
      ▼
CognoDB
      │
      ▼
Graph Data
      │
      ▼
React UI
```

Skill graph flow:

```text
Skill Search
     │
     ▼
getSkillGraph()
     │
     ▼
Graph Query
     │
     ▼
Nodes + Relationships
     │
     ▼
Deterministic Layout
     │
     ▼
Interactive SVG
```

## Design Decisions

### Deterministic graph layout

Chosen instead of physics for:

- Predictable positioning
- Reproducible assessment demos
- Easier manual node manipulation
- Less visual noise
- Better control over interaction

### SVG graph

SVG provides precise node positioning, relationship paths, pointer interactions, zooming, panning, icon rendering, and export support.

### Server functions

TanStack Start server functions provide a clear boundary for database access, validation, and server-only logic without unnecessary REST endpoints.

### Zod

Zod validates server-function input before repository operations.

## Performance Considerations

The graph avoids unnecessary React state updates during dragging.

Node positions are maintained through refs and SVG transforms, so dragging does not require a complete React tree re-render on every pointer movement.

The graph also:

- Uses memoized graph data
- Updates SVG transforms directly
- Avoids continuous physics calculations
- Uses lightweight CDN icons

## Assessment Engineering Principles

1. **Separation of concerns** — UI, server functions, repository queries, database access, and graph visualization are separated.
2. **Type safety** — TypeScript is used throughout the application.
3. **Validation** — Server inputs are validated with Zod.
4. **Reusable UI** — Common UI states and controls are reusable.
5. **Graph-first data modeling** — Relationships are first-class data.
6. **Interactive UX** — The graph is designed for exploration rather than static visualization.
7. **Graceful failure** — Missing icons, empty searches, loading states, and database errors are explicitly handled.
8. **Performance-aware rendering** — Direct SVG updates are used for high-frequency node dragging.

## Known Considerations

The graph uses a deterministic radial layout instead of a force-directed physics engine. This is intentional to keep interaction stable and user-controlled.

External stack icons depend on the Simple Icons CDN. Local fallback behavior prevents missing icons from breaking the graph.

Full functionality requires the configured graph database environment.

## Future Improvements

Potential extensions include:

- Local icon caching
- Additional icon providers
- Graph minimap
- Keyboard navigation
- Search-to-node focus
- Technology category grouping
- Relationship filtering
- Skill comparison
- Career path animation
- Saved graph layouts
- Collaborative annotations
- Advanced graph analytics

## Author

**CareerGraph — Assessment Project**

Built with React, TypeScript, TanStack Start, and a graph database architecture.
