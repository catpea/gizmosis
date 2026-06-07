// Core DOM and math helpers used by Gizmosis runtime prototypes.

export function edgePath(from, to) {
  const dx = Math.max(36, Math.abs(to.x - from.x) * 0.45);
  return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} C ${(from.x + dx).toFixed(2)} ${from.y.toFixed(2)}, ${(to.x - dx).toFixed(2)} ${to.y.toFixed(2)}, ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
}

export function readPoint(pointOrX, y) {
  if (pointOrX && typeof pointOrX === 'object') return { x: Number(pointOrX.x) || 0, y: Number(pointOrX.y) || 0 };
  return { x: Number(pointOrX) || 0, y: Number(y) || 0 };
}

export function clone(value) { return JSON.parse(JSON.stringify(value)); }
export function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
export function round(value) { return Math.round((Number(value) || 0) * 100) / 100; }
export function roundPoint(point) { return { x: round(point.x), y: round(point.y) }; }
export function formatNumber(value) { return String(Math.round((Number(value) || 0) * 1000) / 1000); }
export function rect(el) { return el.getBoundingClientRect(); }
export function center(el) { const r = rect(el); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
export function centerY(el) { return center(el).y; }
export function distance(a, b) { return Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0)); }

export function parseEdgePath(d) {
  const match = String(d || '').match(/^M\s*([\d.-]+)\s+([\d.-]+).*?,\s*([\d.-]+)\s+([\d.-]+)$/);
  if (!match) return null;
  return { start: { x: Number(match[1]), y: Number(match[2]) }, end: { x: Number(match[3]), y: Number(match[4]) } };
}

export function slugify(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-'); }
export function cssEscape(value) { return globalThis.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/["\\]/g, '\\$&'); }
export function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
export function escapeAttr(value) { return escapeHtml(value).replace(/'/g, '&#39;'); }
