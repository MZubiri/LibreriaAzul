const qs = (s, root = document) => root.querySelector(s);
const qsa = (s, root = document) => [...root.querySelectorAll(s)];
const money = value => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(value);
let token = sessionStorage.getItem('la-admin-token');
let store;
let editingId = null;
const api = async (url, options = {}) => {
  const response = await fetch(url, { ...options, headers: { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}), ...options.headers } });
  if (response.status === 401) { logout(); throw new Error('Sesión vencida'); }
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'No se pudo completar la operación'); }
  return response.status === 204 ? null : response.json();
};
const notice = text => { qs('#notice').textContent = text; qs('#notice').classList.add('show'); setTimeout(() => qs('#notice').classList.remove('show'),2500); };
function logout(){ token=null;sessionStorage.removeItem('la-admin-token');qs('#dashboard').hidden=true;qs('#loginView').hidden=false; }
async function load(){ try { store=await api('/api/admin/store');qs('#loginView').hidden=true;qs('#dashboard').hidden=false;renderProducts();fillSettings(); } catch {} }
function renderProducts(filter=''){
  const products=store.products.filter(p=>`${p.title} ${p.author}`.toLowerCase().includes(filter.toLowerCase()));
  qs('#stats').innerHTML=`<div class="stat"><strong>${store.products.length}</strong><span>Títulos</span></div><div class="stat"><strong>${store.products.reduce((s,p)=>s+Number(p.stock),0)}</strong><span>Unidades</span></div><div class="stat"><strong>${store.products.filter(p=>p.featured).length}</strong><span>Destacados</span></div>`;
  qs('#productCount').textContent=`${products.length} libros`;
  qs('#productTable').innerHTML=products.map(p=>`<article class="product-row" data-id="${p.id}"><div class="thumb">${p.image?`<img src="${p.image}">`:p.title}</div><div><h3>${p.title}</h3><small>${p.author}</small></div><span>${money(p.price)}</span><span class="stock ${p.stock<4?'low':''}">${p.stock} unidades</span><span class="status ${p.active?'':'off'}">${p.active?'Visible':'Oculto'}</span></article>`).join('');
  qsa('.product-row').forEach(row=>row.addEventListener('click',()=>openEditor(store.products.find(p=>p.id===row.dataset.id))));
}
function fillSettings(){ const form=qs('#settingsForm');Object.entries(store.settings).forEach(([key,value])=>{if(form.elements[key])form.elements[key].value=value;}); }
function openEditor(product=null){
  editingId=product?.id||null;const form=qs('#productForm');form.reset();form.elements.active.checked=true;qs('#dialogTitle').textContent=product?'Editar libro':'Nuevo libro';qs('#deleteProduct').hidden=!product;
  if(product)Object.entries(product).forEach(([key,value])=>{const field=form.elements[key];if(!field)return;if(field.type==='checkbox')field.checked=Boolean(value);else field.value=value??'';});
  qs('#productDialog').showModal();
}
qs('#loginForm').addEventListener('submit',async e=>{e.preventDefault();qs('#loginError').textContent='';try{const data=await api('/api/admin/login',{method:'POST',body:JSON.stringify({password:qs('#password').value})});token=data.token;sessionStorage.setItem('la-admin-token',token);await load();}catch(error){qs('#loginError').textContent=error.message;}});
qsa('aside nav button').forEach(button=>button.addEventListener('click',()=>{qsa('aside nav button').forEach(b=>b.classList.remove('active'));button.classList.add('active');const products=button.dataset.tab==='products';qs('#productsTab').hidden=!products;qs('#settingsTab').hidden=products;qs('#newProduct').hidden=!products;qs('#pageTitle').textContent=products?'Libros':'Configuración de tienda';}));
qs('#adminSearch').addEventListener('input',e=>renderProducts(e.target.value));qs('#newProduct').addEventListener('click',()=>openEditor());qs('#closeDialog').addEventListener('click',()=>qs('#productDialog').close());qs('#logout').addEventListener('click',logout);
qs('#settingsForm').addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));data.shippingBase=Number(data.shippingBase);data.freeShippingFrom=Number(data.freeShippingFrom);store.settings=await api('/api/admin/settings',{method:'PUT',body:JSON.stringify(data)});notice('Configuración guardada');});
qs('#productForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const data=Object.fromEntries(new FormData(form));data.price=Number(data.price);data.stock=Number(data.stock);data.featured=form.elements.featured.checked;data.active=form.elements.active.checked;const product=await api(editingId?`/api/admin/products/${editingId}`:'/api/admin/products',{method:editingId?'PUT':'POST',body:JSON.stringify(data)});if(editingId)store.products[store.products.findIndex(p=>p.id===editingId)]=product;else store.products.push(product);qs('#productDialog').close();renderProducts();notice('Libro guardado');});
qs('#deleteProduct').addEventListener('click',async()=>{if(!editingId||!confirm('¿Eliminar este libro del catálogo?'))return;await api(`/api/admin/products/${editingId}`,{method:'DELETE'});store.products=store.products.filter(p=>p.id!==editingId);qs('#productDialog').close();renderProducts();notice('Libro eliminado');});
if(token)load();
