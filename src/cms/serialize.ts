/** Turn content files into JSON documents and back. Works in Node, Workers and the browser. */
import { parse, stringify } from 'yaml';
import type { Format } from './collections';

const FRONT = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseDocument(format: Format, text: string): Record<string, unknown> {
  if (format === 'yaml') {
    const data = parse(text);
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  }
  const m = text.match(FRONT);
  const front = m ? parse(m[1]!) : {};
  const body = (m ? m[2]! : text).replace(/^\s+/, '').replace(/\s+$/, '');
  return { ...(front && typeof front === 'object' ? front : {}), body };
}

/** Drop empty strings, nulls and undefined so files stay tidy and optional fields read as "not set". */
export function tidy<T>(value: T): T {
  if (Array.isArray(value)) return value.map(tidy) as T;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const t = tidy(v);
      if (t === undefined || t === null || t === '') continue;
      if (t && typeof t === 'object' && !Array.isArray(t) && !(t instanceof Date) && Object.keys(t).length === 0) continue;
      out[k] = t;
    }
    return out as T;
  }
  return value;
}

export function serializeDocument(format: Format, data: Record<string, unknown>): string {
  const clean = tidy(data);
  if (format === 'yaml') return stringify(clean, { lineWidth: 0 });
  const { body, ...front } = clean;
  const story = typeof body === 'string' ? body.trim() : '';
  return `---\n${stringify(front, { lineWidth: 0 })}---\n${story ? story + '\n' : ''}`;
}

export const textDecoder = new TextDecoder();
export const textEncoder = new TextEncoder();
