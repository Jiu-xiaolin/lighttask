export type GanttLinkType = "FS" | "SS" | "FF" | "SF";

const LINK_TYPES = new Set<GanttLinkType>(["FS", "SS", "FF", "SF"]);

export function normalizeLinkType(value: any): GanttLinkType {
  const type = String(value || "FS").toUpperCase();
  return LINK_TYPES.has(type as GanttLinkType) ? type as GanttLinkType : "FS";
}

export function linkId(from: string, to: string, type: GanttLinkType) {
  return `ln_${from}_${to}_${type}`;
}

export function dependencyToken(from: string, type: GanttLinkType) {
  return type === "FS" ? from : `${from}:${type}`;
}

export function parseDependencyToken(token: string): { from: string; type: GanttLinkType } | null {
  if (!token || typeof token !== "string") return null;
  const match = token.match(/^(.+):(FS|SS|FF|SF)$/i);
  if (match) return { from: match[1], type: normalizeLinkType(match[2]) };
  return { from: token, type: "FS" };
}

function sameDependency(token: string, from: string, type: GanttLinkType) {
  const parsed = parseDependencyToken(token);
  return Boolean(parsed && parsed.from === from && parsed.type === type);
}

export function dependencyTokensToLinks(taskId: string, tokens: string[], knownTaskIds: Set<string>) {
  const seen = new Set<string>();
  const links: Array<{ id: string; from: string; to: string; type: GanttLinkType }> = [];
  for (const token of tokens || []) {
    const parsed = parseDependencyToken(token);
    if (!parsed || !knownTaskIds.has(parsed.from) || parsed.from === taskId) continue;
    const key = `${parsed.from}:${taskId}:${parsed.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ id: linkId(parsed.from, taskId, parsed.type), from: parsed.from, to: taskId, type: parsed.type });
  }
  return links;
}

export function upsertDependencyToken(tokens: string[], from: string, type: any) {
  const normalizedType = normalizeLinkType(type);
  const next = (tokens || []).filter(token => !sameDependency(token, from, normalizedType));
  next.push(dependencyToken(from, normalizedType));
  return next;
}

export function removeDependencyToken(tokens: string[], from: string, type: any) {
  const normalizedType = normalizeLinkType(type);
  return (tokens || []).filter(token => !sameDependency(token, from, normalizedType));
}
