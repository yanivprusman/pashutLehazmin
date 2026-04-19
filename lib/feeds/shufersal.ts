import { gunzipSync } from 'node:zlib';
import { decodeBufferToUtf8 } from './decode';
import { parsePriceFullXml } from './xml-parser';
import type { NormalizedProduct } from './types';

const PORTAL = 'https://prices.shufersal.co.il';
const CAT_PRICE_FULL = 2;

function parseListingForLatestGzUrl(html: string, storeId: string): string | null {
  const matches = [...html.matchAll(/href="([^"]*PriceFull[^"]*\.gz[^"]*)"/g)].map(m =>
    m[1].replace(/&amp;/g, '&'),
  );
  const needle = `-${storeId.padStart(3, '0')}-`;
  const filtered = matches.filter(url => url.includes(needle));
  if (filtered.length === 0) return null;
  filtered.sort();
  return filtered[filtered.length - 1];
}

export async function fetchShufersalPriceFull(storeId: string): Promise<{
  products: NormalizedProduct[];
  sourceFilename: string;
}> {
  const paddedStoreId = storeId.padStart(3, '0');
  const listingUrl = `${PORTAL}/FileObject/UpdateCategory?catID=${CAT_PRICE_FULL}&storeId=${paddedStoreId}`;
  const listingRes = await fetch(listingUrl, {
    headers: { 'User-Agent': 'pashutLehazmin/0.1 (+personal-project)' },
  });
  if (!listingRes.ok) {
    throw new Error(`Shufersal listing fetch failed: HTTP ${listingRes.status}`);
  }
  const listing = await listingRes.text();

  const gzUrl = parseListingForLatestGzUrl(listing, paddedStoreId);
  if (!gzUrl) {
    throw new Error(`No PriceFull file found for store ${paddedStoreId} in Shufersal listing`);
  }

  const gzRes = await fetch(gzUrl);
  if (!gzRes.ok) {
    throw new Error(`Shufersal gz download failed: HTTP ${gzRes.status}`);
  }
  const gzBuf = Buffer.from(await gzRes.arrayBuffer());
  const xmlBuf = gunzipSync(gzBuf);
  const xml = decodeBufferToUtf8(xmlBuf);

  const sourceFilename = gzUrl.split('/').pop()?.split('?')[0] ?? 'unknown.gz';
  const defaultUpdated = new Date();

  const products = parsePriceFullXml(xml, 'shufersal', paddedStoreId, defaultUpdated);
  return { products, sourceFilename };
}
