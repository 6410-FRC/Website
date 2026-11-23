/** Bridge between Node's http request/response objects and the fetch-style API handler. */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { AdminError } from '../types';

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[a-z0-9-]+\.local)(:\d+)?$/i;

export function toRequest(req: IncomingMessage): Request {
  const host = req.headers.host ?? 'localhost';
  if (!LOOPBACK.test(host)) throw new AdminError(403, 'The local admin only answers on this computer or your home network.');
  const url = `http://${host}${req.url ?? '/'}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v); else if (Array.isArray(v)) headers.set(k, v.join(', '));
  const method = req.method ?? 'GET';
  const body = method === 'GET' || method === 'HEAD' ? undefined : (Readable.toWeb(req) as unknown as ReadableStream<Uint8Array>);
  return new Request(url, { method, headers, body, duplex: 'half' } as RequestInit);
}

export async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
}
