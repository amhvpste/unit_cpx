const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = process.cwd();
const port = Number(process.env.PORT || 8000);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.stl': 'model/stl'
};

const USERS = {
  user1: { username: 'user1', password: 'units', role: 1, label: 'Сторона 1' },
  user2: { username: 'user2', password: 'units', role: 2, label: 'Сторона 2' },
  instructor: { username: 'instructor', password: 'units', role: 'instructor', label: 'Інструктор' }
};

const sessions = new Map();
let sharedSessionState = {
  revision: 0,
  updatedAt: new Date().toISOString(),
  updatedBy: null,
  payload: null
};

function publicUser(user) {
  return {
    username: user.username,
    role: user.role,
    label: user.label
  };
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function getSessionUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  return sessions.get(token) || null;
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/login' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const user = USERS[String(body.username || '').trim()];
    if (!user || body.password !== user.password) {
      sendJson(res, 401, { error: 'Invalid credentials' });
      return true;
    }

    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, user);
    sendJson(res, 200, { token, user: publicUser(user), state: sharedSessionState });
    return true;
  }

  if (url.pathname === '/api/logout' && req.method === 'POST') {
    const token = getBearerToken(req);
    if (token) sessions.delete(token);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (url.pathname === '/api/me' && req.method === 'GET') {
    const user = getSessionUser(req);
    if (!user) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return true;
    }
    sendJson(res, 200, { user: publicUser(user), state: sharedSessionState });
    return true;
  }

  if (url.pathname === '/api/session-state' && req.method === 'GET') {
    const user = getSessionUser(req);
    if (!user) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return true;
    }
    sendJson(res, 200, sharedSessionState);
    return true;
  }

  if (url.pathname === '/api/session-state' && req.method === 'POST') {
    const user = getSessionUser(req);
    if (!user) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return true;
    }

    const body = await readJsonBody(req);
    sharedSessionState = {
      revision: sharedSessionState.revision + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: user.username,
      payload: body.payload || null
    };
    sendJson(res, 200, sharedSessionState);
    return true;
  }

  return false;
}

function listReferenceModels() {
  const glbRoot = path.join(root, 'content_glb');
  const contentRoot = path.join(root, 'content');
  const referencesRoot = path.join(root, 'references');
  const modelsRoot = fs.existsSync(glbRoot) ? glbRoot : (fs.existsSync(contentRoot) ? contentRoot : referencesRoot);
  const physicalUnitModels = loadPhysicalUnitModels();
  const hasPhysicalUnits = physicalUnitModels.length > 0;
  const results = [];

  function walk(directory) {
    if (!fs.existsSync(directory)) return;

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (entry.isFile() && (ext === '.glb' || ext === '.stl')) {
        const stat = fs.statSync(fullPath);
        const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');
        if (hasPhysicalUnits && /^content_glb\/units\//i.test(relativePath)) {
          continue;
        }
        if (/^content_glb\/physical_units\//i.test(relativePath)) {
          continue;
        }
        const role = classifyReferenceModel(relativePath);
        results.push({
          name: entry.name,
          path: relativePath,
          category: path.basename(path.dirname(fullPath)),
          role,
          size: stat.size
        });
      }
    }
  }

  walk(modelsRoot);
  results.push(...physicalUnitModels);
  return results.sort((a, b) => a.path.localeCompare(b.path, 'uk'));
}

function loadPhysicalUnitModels() {
  const manifestPath = path.join(root, 'content_glb', 'physical_units', 'manifest.json');
  if (!fs.existsSync(manifestPath)) return [];

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return manifest.map((item) => ({
      id: item.id,
      name: item.name,
      path: item.path,
      category: 'physical_units',
      role: 'unit',
      unitRole: item.role,
      physicalUnit: true,
      sourceFiles: item.sourceFiles || [],
      size: item.size || 0,
      bounds: item.bounds || null
    }));
  } catch (error) {
    console.error(`Physical unit manifest failed: ${error.message}`);
    return [];
  }
}

function classifyReferenceModel(relativePath) {
  const normalized = relativePath.toLowerCase();

  if (/^content_glb\/physical_units\//.test(normalized)) return 'unit';
  if (/^content_glb\/units\//.test(normalized)) return 'unit';
  if (/^content_glb\/arrows\//.test(normalized)) return 'task';
  if (/^content_glb\/terrain\//.test(normalized)) return 'terrain';
  if (/^content_glb\/reference\//.test(normalized)) return 'reference';

  if (/^content\/units\//.test(normalized)) return 'unit';
  if (/^content\/arrows\//.test(normalized)) return 'task';
  if (/^content\/terrain\//.test(normalized)) return 'terrain';
  if (/^content\/reference\//.test(normalized)) return 'reference';

  if (/\/arrows\//.test(normalized) || /08 .*arrows/.test(normalized)) {
    return 'task';
  }

  if (/nastup|ataka|napriam|rubizh|styk|perednii|zasidka|rozvidka boiem|vohnevyi|planuvalnyy/.test(normalized)) {
    return 'task';
  }

  if (/minne|zahorod|drotiane|transhey|blindazh|orientyr|vysota|sposterezhnii|plashka/.test(normalized)) {
    return 'terrain';
  }

  if (/\/machinery\//.test(normalized) || /\/soldiers\//.test(normalized)) {
    return 'unit';
  }

  if (/\/0[1-6] [^/]+\//.test(normalized)) {
    return 'unit';
  }

  if (/\/buildings\//.test(normalized) || /\/environment\//.test(normalized)) {
    return 'terrain';
  }

  return 'reference';
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);

  if (url.pathname === '/api/reference-models') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(listReferenceModels()));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).then((handled) => {
      if (!handled) sendJson(res, 404, { error: 'Not found' });
    }).catch((error) => {
      sendJson(res, 400, { error: error.message || 'Bad request' });
    });
    return;
  }

  const requestedPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.normalize(path.join(root, requestedPath));

  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream'
    });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`UNITS CPX server: http://127.0.0.1:${port}`);
});

setInterval(() => {}, 60 * 60 * 1000);
