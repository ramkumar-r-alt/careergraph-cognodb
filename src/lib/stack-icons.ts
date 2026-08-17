/**
 * Stack / technology icon resolver.
 *
 * Uses the Simple Icons public CDN.
 * No npm package or API key required.
 */

const SIMPLE_ICONS_CDN =
    "https://cdn.simpleicons.org";

const STACK_ICON_ALIASES: Record<
    string,
    string
> = {
    // Frontend
    react: "react",
    "react.js": "react",
    reactjs: "react",

    next: "nextdotjs",
    "next.js": "nextdotjs",
    nextjs: "nextdotjs",

    vue: "vuedotjs",
    "vue.js": "vuedotjs",
    vuejs: "vuedotjs",

    angular: "angular",
    svelte: "svelte",

    "three.js": "threedotjs",
    threejs: "threedotjs",
    three: "threedotjs",

    javascript: "javascript",
    js: "javascript",

    typescript: "typescript",
    ts: "typescript",

    html: "html5",
    css: "css3",

    tailwind: "tailwindcss",
    "tailwind css": "tailwindcss",

    vite: "vite",

    // Backend
    node: "nodedotjs",
    nodejs: "nodedotjs",
    "node.js": "nodedotjs",

    express: "express",

    nest: "nestjs",
    nestjs: "nestjs",
    "nest.js": "nestjs",

    python: "python",
    java: "openjdk",
    spring: "springboot",
    go: "go",
    rust: "rust",
    php: "php",

    // Databases
    postgres: "postgresql",
    postgresql: "postgresql",

    mysql: "mysql",

    mongodb: "mongodb",
    mongo: "mongodb",

    redis: "redis",
    sqlite: "sqlite",

    // Cloud
    aws: "amazonwebservices",
    "amazon web services": "amazonwebservices",

    azure: "microsoftazure",

    gcp: "googlecloud",
    "google cloud": "googlecloud",

    firebase: "firebase",
    vercel: "vercel",
    cloudflare: "cloudflare",

    // DevOps
    docker: "docker",

    kubernetes: "kubernetes",
    k8s: "kubernetes",

    terraform: "terraform",
    nginx: "nginx",
    linux: "linux",

    git: "git",
    github: "github",
    gitlab: "gitlab",
    bitbucket: "bitbucket",

    jenkins: "jenkins",
    grafana: "grafana",
    prometheus: "prometheus",

    // Messaging
    rabbitmq: "rabbitmq",
    kafka: "apachekafka",

    // AI
    openai: "openai",
    tensorflow: "tensorflow",
    pytorch: "pytorch",
};

function normalizeStackName(
    name: string,
): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

export function getStackIconSlug(
    stackName: string,
): string | null {
    const normalized =
        normalizeStackName(stackName);

    return (
        STACK_ICON_ALIASES[normalized] ??
        null
    );
}

/**
 * Get Simple Icons URL.
 *
 * The URL is only resolved here.
 * HTTP errors are handled by the caller's
 * image onError callback.
 */
export function getStackIconUrl(
    stackName: string,
): string | null {
    const slug =
        getStackIconSlug(stackName);

    if (!slug) {
        return null;
    }

    return `${SIMPLE_ICONS_CDN}/${slug}`;
}

/**
 * Get a colored Simple Icon URL.
 */
export function getColoredStackIconUrl(
    stackName: string,
    color?: string,
): string | null {
    const slug =
        getStackIconSlug(stackName);

    if (!slug) {
        return null;
    }

    if (!color) {
        return `${SIMPLE_ICONS_CDN}/${slug}`;
    }

    return `${SIMPLE_ICONS_CDN}/${slug}/${color}`;
}

/**
 * Check whether we know an icon mapping.
 */
export function hasStackIcon(
    stackName: string,
): boolean {
    return (
        getStackIconSlug(stackName) !== null
    );
}

/**
 * Handle a failed icon request.
 *
 * This is intentionally a callback helper
 * because 404 happens asynchronously in
 * the browser when the image is requested.
 */
export function handleStackIconError(
    stackName: string,
    error: unknown,
    onError?: (
        stackName: string,
        error: unknown,
    ) => void,
): void {
    console.warn(
        `[StackIcon] Failed to load icon for "${stackName}"`,
        error,
    );

    onError?.(stackName, error);
}