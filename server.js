const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'catalog.json');
const SEED_FILE = path.join(__dirname, 'data', 'seed.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'LibreriaAzul2026!';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL = 8 * 60 * 60 * 1000;

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.copyFileSync(SEED_FILE, DATA_FILE);

const readStore = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeStore = data => {
  const temp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2));
  fs.renameSync(temp, DATA_FILE);
};
const clean = value => String(value ?? '').trim();
const slugify = value => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sign = payload => {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
};
const verifyToken = token => {
  if (!token || !token.includes('.')) return false;
  const [encoded, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
  return payload.exp > Date.now();
};
const requireAdmin = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!verifyToken(token)) return res.status(401).json({ error: 'Sesión no válida o vencida' });
  next();
};

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json({ limit: '250kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/store', (_req, res) => res.json(readStore()));
app.get('/api/products/:slug', (req, res) => {
  const product = readStore().products.find(item => item.slug === req.params.slug);
  if (!product) return res.status(404).json({ error: 'Libro no encontrado' });
  res.json(product);
});
app.post('/api/newsletter', rateLimit({ windowMs: 60 * 60 * 1000, limit: 5 }), (req, res) => {
  const email = clean(req.body.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Correo no válido' });
  const store = readStore(); store.subscribers ||= [];
  if (!store.subscribers.some(item => item.email === email)) { store.subscribers.push({ email, createdAt: new Date().toISOString() }); writeStore(store); }
  res.status(201).json({ ok: true });
});
app.post('/api/admin/login', (req, res) => {
  const received = Buffer.from(clean(req.body.password));
  const expected = Buffer.from(ADMIN_PASSWORD);
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return res.status(401).json({ error: 'Contraseña incorrecta' });
  res.json({ token: sign({ role: 'admin', exp: Date.now() + TOKEN_TTL }) });
});
app.get('/api/admin/store', requireAdmin, (_req, res) => res.json(readStore()));
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const store = readStore();
  store.settings = { ...store.settings, ...req.body, updatedAt: new Date().toISOString() };
  writeStore(store); res.json(store.settings);
});
app.post('/api/admin/products', requireAdmin, (req, res) => {
  const store = readStore();
  const title = clean(req.body.title);
  if (!title) return res.status(400).json({ error: 'El título es obligatorio' });
  const product = {
    id: crypto.randomUUID(), slug: slugify(req.body.slug || title), title,
    author: clean(req.body.author), category: clean(req.body.category || 'juveniles'), mood: clean(req.body.mood || 'inspirarme'),
    price: Number(req.body.price || 0), stock: Math.max(0, Number(req.body.stock || 0)), image: clean(req.body.image), coverClass: clean(req.body.coverClass || 'cover-blue'),
    badge: clean(req.body.badge), description: clean(req.body.description), pages: clean(req.body.pages), publisher: clean(req.body.publisher), format: clean(req.body.format || 'Tapa blanda'), featured: Boolean(req.body.featured), active: req.body.active !== false
  };
  if (store.products.some(item => item.slug === product.slug)) product.slug += `-${Date.now().toString().slice(-5)}`;
  store.products.push(product); writeStore(store); res.status(201).json(product);
});
app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const store = readStore(); const index = store.products.findIndex(item => item.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Libro no encontrado' });
  const current = store.products[index];
  const updated = { ...current, ...req.body, id: current.id, title: clean(req.body.title ?? current.title), slug: slugify(req.body.slug || req.body.title || current.slug), price: Number(req.body.price ?? current.price), stock: Math.max(0, Number(req.body.stock ?? current.stock)) };
  store.products[index] = updated; writeStore(store); res.json(updated);
});
app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const store = readStore(); const before = store.products.length;
  store.products = store.products.filter(item => item.id !== req.params.id);
  if (store.products.length === before) return res.status(404).json({ error: 'Libro no encontrado' });
  writeStore(store); res.status(204).end();
});

app.use(express.static(__dirname, { extensions: ['html'], maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.get('/libro/:slug', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.use((_req, res) => res.status(404).sendFile(path.join(__dirname, 'index.html')));
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Ocurrió un error inesperado' }); });
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Librería Azul disponible en 0.0.0.0:${PORT}`);
  if (!process.env.ADMIN_PASSWORD) console.log(`Contraseña administrativa temporal: ${ADMIN_PASSWORD}`);
});
