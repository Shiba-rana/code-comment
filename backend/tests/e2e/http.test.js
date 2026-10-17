const assert = require('assert');
const http = require('http');
const app = require('../../src/app');

function makeRequest(server, path, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const options = {
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runHttpTests() {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    // 1. Root health check
    const rootRes = await makeRequest(server, '/');
    assert.strictEqual(rootRes.status, 200);
    assert.strictEqual(rootRes.body.status, 'ok');

    // 2. /health endpoint for Render
    const healthRes = await makeRequest(server, '/health');
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.body.status, 'ok');
    assert.ok(typeof healthRes.body.uptime === 'number');

    // 3. /api/health endpoint
    const apiHealthRes = await makeRequest(server, '/api/health');
    assert.strictEqual(apiHealthRes.status, 200);
    assert.strictEqual(apiHealthRes.body.status, 'ok');

    // 4. Unknown route 404
    const notFoundRes = await makeRequest(server, '/api/unknown-endpoint');
    assert.strictEqual(notFoundRes.status, 404);
    assert.strictEqual(notFoundRes.body.success, false);

    // 5. CORS headers verification
    const corsRes = await makeRequest(server, '/health', 'GET', {
      Origin: 'https://my-app.vercel.app',
    });
    assert.strictEqual(corsRes.status, 200);
    assert.ok(corsRes.headers['access-control-allow-origin']);

    return true;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

module.exports = { runHttpTests };
