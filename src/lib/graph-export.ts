/**
 * Serializes a live SVG graph into a downloadable PNG.
 * CSS custom properties and Tailwind utility classes do not survive
 * serialization, so both are resolved to literal values on a clone first.
 */
function resolveVars(markup: string, root: Element): string {
  const styles = getComputedStyle(root);
  return markup.replace(/var\((--[\w-]+)\)/g, (_match, name: string) => {
    const value = styles.getPropertyValue(name).trim();
    return value || "transparent";
  });
}

export async function downloadGraphPng(svg: SVGSVGElement, filename: string, scale = 2) {
  const rect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  const width = viewBox.width || rect.width || 900;
  const height = viewBox.height || rect.height || 560;
  const rootStyles = getComputedStyle(document.documentElement);
  const background = rootStyles.getPropertyValue("--color-graph-surface").trim() ||
    rootStyles.getPropertyValue("--color-card").trim() ||
    "#ffffff";

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.removeAttribute("class");

  // Labels are styled with Tailwind classes; bake the computed text styles in.
  const liveTexts = svg.querySelectorAll("text");
  clone.querySelectorAll("text").forEach((text, index) => {
    const source = liveTexts[index];
    const computed = source ? getComputedStyle(source) : null;
    text.removeAttribute("class");
    text.setAttribute("fill", computed?.fill && computed.fill !== "none" ? computed.fill : "#111111");
    text.setAttribute("font-size", computed?.fontSize ?? "12px");
    text.setAttribute("font-weight", computed?.fontWeight ?? "500");
    text.setAttribute("font-family", computed?.fontFamily ?? "sans-serif");
  });

  const markup = resolveVars(new XMLSerializer().serializeToString(clone), svg);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

  const image = new Image();
  image.decoding = "sync";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not rasterize the graph"));
    image.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const href = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}