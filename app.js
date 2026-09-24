const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = value => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
const escapeHtml = value => String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const refreshIcons = () => window.lucide && lucide.createIcons();

let store = { settings: { whatsapp: '573045427219', shippingBase: 12000, freeShippingFrom: 120000 }, products: [], reviews: [] };
let books = [];
let cart = JSON.parse(localStorage.getItem('libreria-azul-cart') || '[]');
let activeFilter = 'all';
let quizIndex = 0;
let quizChoices = {};

const toast = message => {
  qs('#toastText').textContent = message;
  qs('#toast').classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => qs('#toast').classList.remove('show'), 2600);
};
const setModal = (element, state, overlay = false) => {
  element.classList.toggle('open', state);
  element.setAttribute('aria-hidden', String(!state));
  qs('#overlay').classList.toggle('open', state && overlay);
  document.body.style.overflow = state ? 'hidden' : '';
};

function coverMarkup(book, compact = false) {
  const image = book.image ? `<img src="${escapeHtml(book.image)}" alt="Portada de ${escapeHtml(book.title)}">` : `<div class="generated-cover"><small>${escapeHtml(book.author)}</small><b>${escapeHtml(book.title)}</b><span>LIBRERÍA AZUL</span></div>`;
  return `<div class="book-art ${book.image ? 'photo-cover' : ''} ${escapeHtml(book.coverClass || 'cover-blue')} ${compact ? 'compact-cover' : ''}">${book.badge && !compact ? `<span class="badge">${escapeHtml(book.badge)}</span>` : ''}${image}${!compact ? `<button class="quick-add" data-add="${book.id}" aria-label="Agregar ${escapeHtml(book.title)}"><i data-lucide="plus"></i></button>` : ''}</div>`;
}

function renderCatalog() {
  const visible = books.filter(book => activeFilter === 'all' || book.category === activeFilter || book.mood === activeFilter);
  qs('#bookGrid').innerHTML = visible.map(book => `<article class="book-card" data-id="${book.id}"><button class="product-open" data-open="${book.slug}" aria-label="Ver ${escapeHtml(book.title)}">${coverMarkup(book)}</button><p class="book-category">${escapeHtml(book.category)} · ${book.stock > 0 ? `${book.stock} disponibles` : 'Agotado'}</p><h3><button data-open="${book.slug}">${escapeHtml(book.title)}</button></h3><p class="author">${escapeHtml(book.author)}</p><div class="price-row"><strong>${money(book.price)}</strong><span>★★★★★</span></div></article>`).join('');
  qs('#emptyState').style.display = visible.length ? 'none' : 'block';
  bindCatalogEvents(); refreshIcons();
}

function bindCatalogEvents() {
  qsa('[data-add]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); addToCart(button.dataset.add); }));
  qsa('[data-open]').forEach(button => button.addEventListener('click', () => openProduct(button.dataset.open)));
}

function openProduct(slug) {
  const book = books.find(item => item.slug === slug);
  if (!book) return;
  const related = books.filter(item => item.id !== book.id && (item.category === book.category || item.mood === book.mood)).slice(0, 3);
  qs('#productContent').innerHTML = `<div class="product-layout"><div class="product-cover-large">${coverMarkup(book, true)}</div><div class="product-info"><p class="book-category">${escapeHtml(book.category)} · ${escapeHtml(book.format)}</p><h2>${escapeHtml(book.title)}</h2><p class="product-author">${escapeHtml(book.author)}</p><div class="product-price">${money(book.price)}</div><p class="product-description">${escapeHtml(book.description)}</p><dl><div><dt>Editorial</dt><dd>${escapeHtml(book.publisher || 'Consultar')}</dd></div><div><dt>Páginas</dt><dd>${escapeHtml(book.pages || 'Consultar')}</dd></div><div><dt>Disponibilidad</dt><dd>${book.stock ? `${book.stock} unidades` : 'Agotado'}</dd></div></dl><button class="button button-primary" id="modalAdd" ${book.stock ? '' : 'disabled'}>${book.stock ? 'Agregar a mi bolsa' : 'Consultar disponibilidad'} <i data-lucide="shopping-bag"></i></button></div></div>${related.length ? `<div class="related"><h3>También podría gustarte</h3><div>${related.map(item => `<button data-related="${item.slug}">${item.title}<span>${item.author}</span></button>`).join('')}</div></div>` : ''}`;
  setModal(qs('#productModal'), true, true); refreshIcons();
  qs('#modalAdd').addEventListener('click', () => book.stock ? addToCart(book.id) : window.open(whatsappUrl(`Hola Librería Azul, quiero consultar disponibilidad de ${book.title}.`), '_blank'));
  qsa('[data-related]').forEach(button => button.addEventListener('click', () => openProduct(button.dataset.related)));
  history.replaceState({}, '', `/libro/${book.slug}`);
}

function addToCart(id) {
  const book = books.find(item => item.id === id);
  if (!book) return;
  const line = cart.find(item => item.id === id);
  if (line) {
    if (line.quantity >= book.stock) return toast('No hay más unidades disponibles');
    line.quantity++;
  } else cart.push({ id, quantity: 1 });
  persistCart(); renderCart(); toast(`${book.title} se agregó a tu bolsa`);
}
const persistCart = () => localStorage.setItem('libreria-azul-cart', JSON.stringify(cart));
const cartDetails = () => cart.map(line => ({ ...line, book: books.find(book => book.id === line.id) })).filter(line => line.book);
const whatsappUrl = message => `https://wa.me/${store.settings.whatsapp}?text=${encodeURIComponent(message)}`;

function renderCart() {
  const lines = cartDetails();
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  qs('#cartCount').textContent = count; qs('#mobileCartCount').textContent = count;
  if (!lines.length) {
    qs('#cartItems').innerHTML = '<div class="cart-empty"><span>♡</span><p>Tu bolsa está esperando<br>una buena historia.</p></div>';
    qs('#cartFooter').classList.remove('active'); return;
  }
  qs('#cartItems').innerHTML = lines.map(line => `<div class="cart-line">${coverMarkup(line.book, true)}<div><h4>${escapeHtml(line.book.title)}</h4><p>${money(line.book.price)}</p><div class="quantity"><button data-qty="-1" data-id="${line.id}">−</button><span>${line.quantity}</span><button data-qty="1" data-id="${line.id}">+</button></div></div><button class="remove-item" data-remove="${line.id}" aria-label="Quitar ${escapeHtml(line.book.title)}">×</button></div>`).join('');
  qsa('[data-qty]').forEach(button => button.addEventListener('click', () => changeQuantity(button.dataset.id, Number(button.dataset.qty))));
  qsa('[data-remove]').forEach(button => button.addEventListener('click', () => { cart = cart.filter(item => item.id !== button.dataset.remove); persistCart(); renderCart(); }));
  qs('#cartFooter').classList.add('active'); updateTotals();
}
function changeQuantity(id, delta) {
  const line = cart.find(item => item.id === id); const book = books.find(item => item.id === id);
  if (!line || !book) return; line.quantity = Math.max(0, Math.min(book.stock, line.quantity + delta));
  if (!line.quantity) cart = cart.filter(item => item.id !== id); persistCart(); renderCart();
}
function updateTotals() {
  const subtotal = cartDetails().reduce((sum, line) => sum + line.book.price * line.quantity, 0);
  const city = qs('#shippingCity').value.trim();
  const shipping = subtotal >= store.settings.freeShippingFrom ? 0 : city ? Number(store.settings.shippingBase) : null;
  qs('#cartSubtotal').textContent = money(subtotal);
  qs('#shippingTotal').textContent = shipping === null ? 'Por calcular' : shipping === 0 ? 'Gratis' : money(shipping);
  qs('#cartTotal').textContent = money(subtotal + (shipping || 0));
  const order = cartDetails().map(line => `• ${line.book.title} × ${line.quantity} — ${money(line.book.price * line.quantity)}`).join('\n');
  const message = `Hola Librería Azul 💙 Quiero confirmar este pedido:\n\n${order}\n\nSubtotal: ${money(subtotal)}\nEnvío estimado: ${shipping === null ? 'por calcular' : shipping === 0 ? 'gratis' : money(shipping)}\nCiudad: ${city || 'por confirmar'}\nPago: ${qs('#paymentMethod').value}\nEmpaque para regalo: ${qs('#giftWrap').checked ? 'sí' : 'no'}`;
  qs('#checkoutLink').href = whatsappUrl(message);
}

const quiz = [
  { key: 'mood', question: '¿Cómo quieres sentirte?', answers: [['enamorarme','Quiero suspirar'],['desvelarme','Quiero tensión'],['sentir-bonito','Quiero algo reconfortante']] },
  { key: 'pace', question: '¿Qué ritmo prefieres?', answers: [['rapido','Que me atrape de inmediato'],['pausado','Que se cocine lentamente']] },
  { key: 'length', question: '¿Cuánto quieres leer?', answers: [['corto','Algo breve'],['largo','Una historia para quedarme']] },
  { key: 'ending', question: '¿Qué final toleras hoy?', answers: [['luminoso','Necesito esperanza'],['intenso','Sorpréndeme, puedo con todo']] }
];
function renderQuiz() {
  const step = quiz[quizIndex];
  qs('#quizStep').textContent = `Pregunta ${quizIndex + 1} de ${quiz.length}`; qs('#quizQuestion').textContent = step.question;
  qs('#quizProgress').style.width = `${((quizIndex + 1) / quiz.length) * 100}%`;
  qs('#quizAnswers').innerHTML = step.answers.map(([value,label]) => `<button data-answer="${value}">${label}</button>`).join('');
  qs('#quizBack').style.visibility = quizIndex ? 'visible' : 'hidden';
  qsa('[data-answer]').forEach(button => button.addEventListener('click', () => { quizChoices[step.key] = button.dataset.answer; quizIndex++; quizIndex < quiz.length ? renderQuiz() : finishQuiz(); }));
}
function finishQuiz() {
  let matches = books.filter(book => book.mood === quizChoices.mood);
  if (!matches.length) matches = books;
  if (quizChoices.length === 'corto') matches.sort((a,b) => Number(a.pages || 999) - Number(b.pages || 999));
  if (quizChoices.ending === 'intenso') matches.sort((a,b) => Number(b.category === 'misterio') - Number(a.category === 'misterio'));
  const result = matches.slice(0, 3);
  qs('#quizStep').textContent = 'Tu match literario'; qs('#quizProgress').style.width = '100%'; qs('#quizQuestion').textContent = 'Estas historias tienen algo para ti';
  qs('#quizAnswers').innerHTML = `<div class="quiz-results">${result.map(book => `<button data-match="${book.slug}"><strong>${book.title}</strong><span>${book.author} · ${money(book.price)}</span></button>`).join('')}</div><button id="restartQuiz">Repetir el test</button>`;
  qsa('[data-match]').forEach(button => button.addEventListener('click', () => openProduct(button.dataset.match)));
  qs('#restartQuiz').addEventListener('click', () => { quizIndex = 0; quizChoices = {}; renderQuiz(); });
}

function filterBooks(category) {
  activeFilter = category; renderCatalog();
  qsa('.filter').forEach(button => button.classList.toggle('active', button.dataset.filter === category));
  qsa('.mood-card').forEach(button => button.classList.toggle('active', button.dataset.filter === category));
}

async function initStore() {
  try { const response = await fetch('/api/store'); if (!response.ok) throw new Error(); store = await response.json(); }
  catch { qs('#bookGrid').innerHTML = '<p>No pudimos cargar el catálogo. Escríbenos por WhatsApp para ayudarte.</p>'; return; }
  books = store.products.filter(book => book.active);
  if (store.settings.announcement) {
    const parts = store.settings.announcement.split('·').map(part => part.trim());
    qs('#announcement').innerHTML = parts.map((part, index) => `${index ? '<span class="announcement-dot">✦</span>' : ''}<span>${escapeHtml(part)}</span>`).join('');
  }
  if (store.settings.heroImage) qs('#heroImage').src = store.settings.heroImage;
  if (store.settings.storyImage) qs('#storyImage').src = store.settings.storyImage;
  if (store.settings.logoUrl) qsa('.brand-mark').forEach(mark => { mark.innerHTML = `<img src="${escapeHtml(store.settings.logoUrl)}" alt="">`; mark.classList.add('has-logo'); });
  qs('#weeklyTitle').textContent = store.settings.recommendation;
  qs('#weeklyText').textContent = store.settings.recommendationText;
  qs('#reviews').innerHTML = store.reviews.map(review => `<blockquote><span>${'★'.repeat(review.rating)}</span><p>“${escapeHtml(review.text)}”</p><cite>${escapeHtml(review.name)}</cite></blockquote>`).join('');
  renderCatalog(); renderCart();
  const routeSlug = location.pathname.match(/^\/libro\/([^/]+)/)?.[1]; if (routeSlug) openProduct(routeSlug);
}

qs('#cartButton').addEventListener('click', () => setModal(qs('#cartDrawer'), true, true));
qs('#mobileCart').addEventListener('click', () => setModal(qs('#cartDrawer'), true, true));
qs('#closeCart').addEventListener('click', () => setModal(qs('#cartDrawer'), false));
qs('#closeProduct').addEventListener('click', () => { setModal(qs('#productModal'), false); history.replaceState({}, '', '/'); });
qs('#overlay').addEventListener('click', () => { setModal(qs('#cartDrawer'), false); setModal(qs('#productModal'), false); });
['shippingCity','paymentMethod','giftWrap'].forEach(id => qs(`#${id}`).addEventListener('input', updateTotals));
qsa('.filter').forEach(button => button.addEventListener('click', () => filterBooks(button.dataset.filter)));
qsa('.mood-card').forEach(button => button.addEventListener('click', () => { filterBooks(button.dataset.filter); qs('#catalogo').scrollIntoView({ behavior: 'smooth' }); }));

const searchModal = qs('#searchModal');
const openSearch = () => { setModal(searchModal, true); setTimeout(() => qs('#searchInput').focus(), 200); };
qs('#searchButton').addEventListener('click', openSearch); qs('#mobileSearch').addEventListener('click', openSearch); qs('#closeSearch').addEventListener('click', () => setModal(searchModal, false));
qs('#searchInput').addEventListener('input', event => {
  const term = event.target.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const hits = books.filter(book => `${book.title} ${book.author} ${book.category} ${book.mood}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term));
  qs('#searchResults').innerHTML = !term ? '<p>Prueba con “romance”, “Damián” o “clásicos”.</p>' : hits.length ? hits.map(book => `<button class="search-hit" data-search="${book.slug}"><span><strong>${book.title}</strong><small>${book.author}</small></span><b>${money(book.price)}</b></button>`).join('') : '<p>No encontramos ese título. Escríbenos y lo buscamos por ti 💙</p>';
  qsa('[data-search]').forEach(hit => hit.addEventListener('click', () => { setModal(searchModal, false); openProduct(hit.dataset.search); }));
});

qs('#quizButton').addEventListener('click', () => { quizIndex = 0; quizChoices = {}; renderQuiz(); qs('#quizOptions').classList.add('open'); });
qs('#quizBack').addEventListener('click', () => { if (quizIndex) { quizIndex--; renderQuiz(); } else qs('#quizOptions').classList.remove('open'); });
qs('#weeklyButton').addEventListener('click', () => window.open(whatsappUrl(`Hola Librería Azul 💙 Quiero una recomendación personalizada. Me gustaría leer algo que…`), '_blank'));
qs('#newsletterForm').addEventListener('submit', async event => {
  event.preventDefault(); const input = qs('#emailInput');
  try { const response = await fetch('/api/newsletter', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:input.value}) }); if (!response.ok) throw new Error(); qs('#formMessage').textContent = '¡Ya estás dentro! Revisa tu correo 💙'; input.value = ''; }
  catch { qs('#formMessage').textContent = 'No pudimos guardarlo. Intenta nuevamente.'; }
});

const mobileMenu = qs('#mobileMenu');
qs('#menuButton').addEventListener('click', () => { mobileMenu.classList.add('open'); document.body.style.overflow = 'hidden'; });
qs('#closeMenu').addEventListener('click', () => { mobileMenu.classList.remove('open'); document.body.style.overflow = ''; });
qsa('a', mobileMenu).forEach(link => link.addEventListener('click', () => { mobileMenu.classList.remove('open'); document.body.style.overflow = ''; }));
document.addEventListener('keydown', event => { if (event.key === 'Escape') { setModal(qs('#cartDrawer'), false); setModal(searchModal, false); setModal(qs('#productModal'), false); mobileMenu.classList.remove('open'); } });

const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .1 });
qsa('.reveal').forEach(element => observer.observe(element));
refreshIcons(); initStore();
