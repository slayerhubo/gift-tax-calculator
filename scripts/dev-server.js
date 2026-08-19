/**
 * 개발용 아주 간단한 웹서버.
 * 브라우저에서 index.html을 열어보려면 필요하다.
 * (파일을 그냥 더블클릭해서 열면 src/*.js 를 못 불러온다)
 *
 * 실행: npm start
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const PORT = 5173;
// 이 파일(scripts/) 기준으로 프로젝트 루트를 찾는다 — 어디서 실행하든 동작하도록
const ROOT = resolve(import.meta.dirname, '..');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
};

createServer(async (req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const filePath = join(ROOT, urlPath === '/' ? 'index.html' : urlPath);

  // 프로젝트 폴더 바깥 파일은 절대 내보내지 않는다
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403');
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 - 파일을 찾을 수 없습니다: ' + urlPath);
  }
}).listen(PORT, () => {
  console.log('증여세 계산기 -> http://localhost:' + PORT);
});
