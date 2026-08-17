export type Person = { id: string; name: string; title?: string; skillCount?: number };
export type Skill = { id: string; name: string; category: string; difficulty: string };
export type Job = {
  id: string;
  title: string;
  level: string;
  location: string;
  remote: boolean;
  company?: string;
  matchingSkills?: string[];
};
export type Company = {
  id: string;
  name: string;
  industry: string;
  location: string;
  jobCount?: number;
};
export type Resource = { id: string; title: string; type: string; url: string; skill?: string };

export type CareerMatch = {
  id: string;
  title: string;
  level: string;
  location: string;
  remote: boolean;
  company: string;
  matchedSkills: number;
  totalSkills: number;
  matchPercentage: number;
};

export type GraphNode = { id: string; label: string; group: string; distance: number };
export type GraphEdge = { source: string; target: string; type: string };
export type SkillGraphData = { nodes: GraphNode[]; edges: GraphEdge[] };

export type SkillPath = { skillPath: string[]; distance: number };

export type DashboardData = {
  person: Person;
  skills: { name: string; category: string; proficiency: number }[];
  matches: CareerMatch[];
  gaps: { skill: string; demand: number }[];
  resources: Resource[];
  connections: number;
};

export type CompanyDetail = {
  company: Company;
  jobs: Job[];
  topSkills: { name: string; count: number }[];
};