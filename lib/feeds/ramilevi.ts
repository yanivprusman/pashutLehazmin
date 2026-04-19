import { gunzipSync } from 'node:zlib';
import { Agent } from 'undici';
import { decodeBufferToUtf8 } from './decode';
import { parsePriceFullXml } from './xml-parser';
import type { NormalizedProduct } from './types';

const PORTAL = 'https://url.retail.publishedprices.co.il';

const insecureDispatcher = new Agent({
  connect: { rejectUnauthorized: false },
});

function rlFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, dispatcher: insecureDispatcher } as RequestInit & {
    dispatcher: Agent;
  });
}

function extractCsrfToken(html: string): string | null {
  const m = html.match(/csrftoken"[^>]*content="([^"]+)"/);
  return m ? m[1] : null;
}

function serializeCookies(jar: Map<string, string>): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function mergeSetCookies(headers: Headers, jar: Map<string, string>) {
  const raw = headers.get('set-cookie');
  if (!raw) return;
  for (const c of raw.split(/,(?=\s*\w+=)/)) {
    const [nameValue] = c.split(';');
    const eq = nameValue.indexOf('=');
    if (eq === -1) continue;
    const name = nameValue.slice(0, eq).trim();
    const value = nameValue.slice(eq + 1).trim();
    if (name) jar.set(name, value);
  }
}

async function login(jar: Map<string, string>): Promise<void> {
  const res1 = await rlFetch(`${PORTAL}/login`, {
    headers: { 'User-Agent': 'pashutLehazmin/0.1' },
  });
  mergeSetCookies(res1.headers, jar);
  const html1 = await res1.text();
  const token = extractCsrfToken(html1);
  if (!token) throw new Error('Could not extract Rami Levi CSRF token from /login');

  const body = new URLSearchParams({
    username: 'RamiLevi',
    password: '',
    csrftoken: token,
  });

  const res2 = await rlFetch(`${PORTAL}/login/user`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: serializeCookies(jar),
      'User-Agent': 'pashutLehazmin/0.1',
      'X-CSRFToken': token,
    },
    body: body.toString(),
  });
  mergeSetCookies(res2.headers, jar);
  if (res2.status !== 302 && res2.status !== 200) {
    throw new Error(`Rami Levi login failed: HTTP ${res2.status}`);
  }

  const res3 = await rlFetch(`${PORTAL}/file`, {
    headers: { Cookie: serializeCookies(jar), 'User-Agent': 'pashutLehazmin/0.1' },
  });
  mergeSetCookies(res3.headers, jar);
}

async function getCsrfFromFilePage(jar: Map<string, string>): Promise<string> {
  const res = await rlFetch(`${PORTAL}/file`, {
    headers: { Cookie: serializeCookies(jar), 'User-Agent': 'pashutLehazmin/0.1' },
  });
  mergeSetCookies(res.headers, jar);
  const html = await res.text();
  const token = extractCsrfToken(html);
  if (!token) throw new Error('Could not extract CSRF token from Rami Levi /file page');
  return token;
}

interface ListingEntry {
  fname: string;
  time: string;
  size: number;
}

async function listFiles(
  jar: Map<string, string>,
  token: string,
  search: string,
): Promise<ListingEntry[]> {
  const body = new URLSearchParams({
    sEcho: '1',
    iColumns: '5',
    iDisplayStart: '0',
    iDisplayLength: '50',
    sSearch: search,
    cd: '/',
    csrftoken: token,
  });
  const res = await rlFetch(`${PORTAL}/file/json/dir`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: serializeCookies(jar),
      'User-Agent': 'pashutLehazmin/0.1',
      'X-CSRFToken': token,
    },
    body: body.toString(),
  });
  mergeSetCookies(res.headers, jar);
  if (!res.ok) throw new Error(`Rami Levi listing failed: HTTP ${res.status}`);
  const json = (await res.json()) as { aaData?: ListingEntry[] };
  return json.aaData ?? [];
}

export async function fetchRamiLeviPriceFull(storeId: string): Promise<{
  products: NormalizedProduct[];
  sourceFilename: string;
}> {
  const paddedStoreId = storeId.padStart(3, '0');
  const jar = new Map<string, string>();
  await login(jar);
  const token = await getCsrfFromFilePage(jar);

  const needle = `PriceFull7290058140886-${paddedStoreId}-`;
  const entries = await listFiles(jar, token, needle);
  if (entries.length === 0) {
    throw new Error(`No Rami Levi PriceFull for store ${paddedStoreId}`);
  }
  entries.sort((a, b) => (a.time < b.time ? 1 : -1));
  const latest = entries[0];

  const downloadUrl = `${PORTAL}/file/d/${latest.fname}`;
  const res = await rlFetch(downloadUrl, {
    headers: { Cookie: serializeCookies(jar), 'User-Agent': 'pashutLehazmin/0.1' },
  });
  if (!res.ok) throw new Error(`Rami Levi download failed: HTTP ${res.status}`);

  let buf = Buffer.from(await res.arrayBuffer());
  if (latest.fname.endsWith('.gz') || (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b)) {
    buf = gunzipSync(buf);
  }
  const xml = decodeBufferToUtf8(buf);

  const defaultUpdated = new Date();
  const products = parsePriceFullXml(xml, 'ramilevi', paddedStoreId, defaultUpdated);
  return { products, sourceFilename: latest.fname };
}
