// Test-only static hosting: the cookie selects a build, never simulates an API.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const mimeTypes: Readonly<Record<string, string>> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

createServer((request, response) => {
  const serve = async (): Promise<void> => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    response.setHeader('Cache-Control', 'no-store');
    if (path.startsWith('/api')) {
      response.writeHead(404, { 'Content-Type': 'application/json' });
      response.end('{"message":"No backend configured"}');
      return;
    }
    const remote = request.headers.cookie
      ?.split(';')
      .some((cookie) => cookie.trim() === 'test-build=remote');
    const root = resolve(remote ? 'dist/remote-check/browser' : 'dist/demo-check/browser');
    const relative = path.startsWith('/demo/') ? path.slice('/demo/'.length) : '';
    const file = resolve(root, relative && extname(relative) ? relative : 'index.html');
    if (!file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        'Content-Type': mimeTypes[extname(file)] ?? 'application/octet-stream',
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  };
  serve().catch(() => {
    response.writeHead(500).end();
  });
}).listen(4201, '127.0.0.1');
