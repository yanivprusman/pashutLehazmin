import * as iconv from 'iconv-lite';

export function decodeBufferToUtf8(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString('utf8');
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return iconv.decode(buf.slice(2), 'utf-16le');
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    return iconv.decode(buf.slice(2), 'utf-16be');
  }

  let zerosInEvens = 0;
  let zerosInOdds = 0;
  const sample = Math.min(buf.length, 512);
  for (let i = 0; i < sample; i++) {
    if (buf[i] === 0) {
      if (i % 2 === 0) zerosInEvens++;
      else zerosInOdds++;
    }
  }
  if (zerosInOdds > sample / 8 && zerosInEvens === 0) {
    return iconv.decode(buf, 'utf-16le');
  }
  if (zerosInEvens > sample / 8 && zerosInOdds === 0) {
    return iconv.decode(buf, 'utf-16be');
  }

  const utf8 = buf.toString('utf8');
  if (!utf8.includes('\ufffd')) return utf8;

  return iconv.decode(buf, 'win1255');
}
