/* Agatha Gifts: catálogo e reservas no Supabase; pagamento somente presencial. */
const SUPABASE_URL = "https://jfseknlktcbcfkmpctzd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_LZfK-itbz6paiKoaKP-G-Q_a4uIggJL";
const TURNSTILE_SITE_KEY = "0x4AAAAAAF4LQeSsgqK7vdK9";
const ADMIN_AUTH_REDIRECT_URL = "https://agathagift.iamjohnlevi.workers.dev/";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let adminAuthorized = false;

const money = n => Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const data = {products:[]};
let cart = {}, activeCategory = "Todos", catalogReady = false;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function safeMediaUrl(value){
  if(typeof value!=="string")return "";
  try {const u=new URL(value);return u.protocol==="https:" && u.hostname===new URL(SUPABASE_URL).hostname && u.pathname.startsWith("/storage/v1/object/public/product-media/") ? u.href : ""}catch{return ""}
}
function el(id){return document.getElementById(id)}
function toast(msg){const t=el("toast");t.textContent=msg;t.classList.remove("hidden");setTimeout(()=>t.classList.add("hidden"),2600)}
function show(id){el(id).classList.remove("hidden")}
function hide(id){el(id).classList.add("hidden")}
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>hide(b.dataset.close)));
["cartOverlay","checkoutOverlay","adminOverlay"].forEach(id=>el(id).addEventListener("click",e=>{if(e.target.id===id)hide(id)}));
el("cartOpen").onclick=()=>{renderCart();show("cartOverlay")};
el("adminOpen").onclick=async()=>{show("adminOverlay");await refreshAdminAccess();if(adminAuthorized)await loadCatalog()};
function categories(){return ["Todos",...new Set(data.products.map(p=>p.category).filter(Boolean))]}
function renderFilters(){el("filters").innerHTML=categories().map(c=>`<button class="filter ${c===activeCategory?"active":""}" data-category="${esc(c)}">${esc(c)}</button>`).join("");document.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{activeCategory=b.dataset.category;renderFilters();renderProducts()})}
function mediaMarkup(p,videoControls=false){if(!p.mediaUrl)return esc(p.image||"🎁");const src=esc(safeMediaUrl(p.mediaUrl));if(!src)return "🎁";return p.mediaType==="video"?`<video src="${src}" ${videoControls?"controls":"muted autoplay loop playsinline"}></video>`:`<img src="${src}" alt="${esc(p.name)}">`}
function renderProducts(){if(!catalogReady){el("productGrid").innerHTML="<p class='empty'>Carregando produtos...</p>";el("emptyState").classList.add("hidden");return}const list=data.products.filter(p=>p.is_active&&(activeCategory==="Todos"||p.category===activeCategory)&&p.stock>0);el("productGrid").innerHTML=list.map(p=>`<article class="product-card"><div class="product-art">${mediaMarkup(p)}</div><h3>${esc(p.name)}</h3><p>${esc(p.description||"Feito com carinho!")}</p><div class="product-meta"><span class="price">${money(p.price)}</span><span class="stock">${p.stock} disponível(is)</span></div><button class="add-button" data-add="${p.id}">Adicionar à reserva</button></article>`).join("");el("emptyState").classList.toggle("hidden",list.length>0);document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>addToCart(b.dataset.add))}
function addToCart(id){const p=data.products.find(x=>x.id===id);if(!p||!p.is_active||((cart[id]||0)>=p.stock))return toast("Quantidade máxima disponível atingida.");cart[id]=(cart[id]||0)+1;renderCartCount();toast("Adicionado à reserva! 💗")}
function renderCartCount(){el("cartCount").textContent=Object.values(cart).reduce((a,b)=>a+b,0)}
function renderCart(){const entries=Object.entries(cart).filter(([id,q])=>q>0);el("cartItems").innerHTML=entries.length?entries.map(([id,q])=>{const p=data.products.find(x=>x.id===id);if(!p)return "";return `<div class="cart-row"><div class="cart-emoji">${esc(p.image||"🎁")}</div><div><b>${esc(p.name)}</b><small>${money(p.price)} cada</small></div><div class="qty"><button data-qty="${id}" data-delta="-1">−</button><b>${q}</b><button data-qty="${id}" data-delta="1">+</button></div></div>`}).join(""):`<p class="empty">Sua lista de reservas está vazia. 💕</p>`;const total=entries.reduce((s,[id,q])=>s+(data.products.find(p=>p.id===id)?.price||0)*q,0);el("cartTotal").textContent=money(total);document.querySelectorAll("[data-qty]").forEach(b=>b.onclick=()=>{const id=b.dataset.qty,next=(cart[id]||0)+Number(b.dataset.delta),p=data.products.find(x=>x.id===id);if(next<=0)delete cart[id];else if(next<=p.stock)cart[id]=next;else toast("Não temos essa quantidade em estoque.");renderCart();renderCartCount()});el("checkoutOpen").disabled=!entries.length;el("checkoutOpen").style.opacity=entries.length?1:.5}
el("checkoutOpen").onclick=()=>{if(!Object.keys(cart).length)return;hide("cartOverlay");el("checkoutForm").classList.remove("hidden");el("reservationResult").classList.add("hidden");show("checkoutOverlay");initializeReservationChallenge()};
let reservationSubmitting = false;
let reservationWidgetId = null;
let reservationChallengeInitializing = false;
function initializeReservationChallenge(){
  if(reservationWidgetId !== null || reservationChallengeInitializing)return;
  if(!window.turnstile || typeof window.turnstile.render !== "function")return;
  if(TURNSTILE_SITE_KEY.startsWith("CONFIGURE_"))return;
  const container=el("reservationCaptcha");
  if(!container || el("checkoutOverlay").classList.contains("hidden"))return;
  reservationChallengeInitializing=true;
  try{
    reservationWidgetId=window.turnstile.render(container,{
      sitekey:TURNSTILE_SITE_KEY,
      action:"reservation",
      "error-callback":()=>{console.warn("Turnstile: falha ao verificar desafio.");},
      "expired-callback":()=>{console.info("Turnstile: token expirado.");}
    });
  }catch(error){
    console.error("Não foi possível inicializar o Turnstile:",error);
    reservationWidgetId=null;
  }finally{reservationChallengeInitializing=false;}
}
function resetReservationChallenge(){
  if(window.turnstile && reservationWidgetId !== null){
    try{window.turnstile.reset(reservationWidgetId)}catch(error){console.warn("Falha ao reiniciar Turnstile",error)}
  }
}
window.onAgathaTurnstileReady=function(){
  // O script pode carregar antes de o formulário estar visível.
  // Inicializamos somente quando o modal estiver aberto.
  initializeReservationChallenge();
};
el("checkoutForm").onsubmit=async e=>{
  e.preventDefault();if(!supabaseClient)return toast("Conexão indisponível.");
  if(reservationSubmitting)return;
  if(!window.turnstile || reservationWidgetId === null)return toast("Verificação de segurança indisponível. Tente novamente.");
  const captchaToken=window.turnstile.getResponse(reservationWidgetId);
  if(!captchaToken)return toast("Conclua a verificação de segurança antes de reservar.");
  const form=e.target,button=form.querySelector('[type="submit"]'),f=new FormData(form);
  if(!f.get("adultConfirm"))return;
  const items=Object.entries(cart).filter(([,q])=>q>0).map(([id,quantity])=>({id,quantity}));
  if(!items.length)return toast("Sua sacola está vazia.");
  if(items.some(i=>!uuidPattern.test(i.id)||!Number.isInteger(i.quantity)||i.quantity<1))return toast("Itens inválidos.");
  button.disabled=true;reservationSubmitting=true;
  try{
    const response=await fetch(SUPABASE_URL+"/functions/v1/reserve-product",{
      method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_PUBLISHABLE_KEY},
      body:JSON.stringify({adultName:String(f.get("adultName")||"").trim(),adultPhone:String(f.get("adultPhone")||"").trim(),items,turnstileToken:captchaToken})
    });
    const order=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(order.error||"Falha ao registrar a reserva.");
    cart={};renderCartCount();await loadCatalog();
    el("checkoutForm").classList.add("hidden");
    el("reservationResult").innerHTML=`<h3>Reserva registrada!</h3><p>Número da reserva: <b>${esc(order.id)}</b></p><p>Valor dos produtos: <b>${money(order.total)}</b></p><p><b>Pagamento exclusivamente presencial, na retirada.</b></p><p>Guarde o número da reserva para combinar a retirada com o responsável pela loja.</p><p>Esta reserva não é um comprovante de pagamento.</p>`;
    el("reservationResult").classList.remove("hidden");
    form.reset();
  }catch(err){toast("Não foi possível registrar a reserva: "+err.message)}finally{button.disabled=false;reservationSubmitting=false;resetReservationChallenge()}
};
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function setAdminUI(authorized, message="") {
  adminAuthorized = Boolean(authorized);
  el("adminLogin").classList.toggle("hidden",adminAuthorized);
  el("adminPanel").classList.toggle("hidden",!adminAuthorized);
  el("authStatus").textContent=message;
  if(adminAuthorized){loadCatalog();loadOrders();renderAdmin();}
}
async function refreshAdminAccess() {
  setAdminUI(false,"Verificando acesso...");
  if(!supabaseClient){setAdminUI(false,"Não foi possível carregar a autenticação. Verifique a conexão.");return}
  const {data:{user},error:userError}=await supabaseClient.auth.getUser();
  if(userError||!user){setAdminUI(false,"");return}
  const {data:allowed,error}=await supabaseClient.rpc("is_store_admin");
  if(error){setAdminUI(false,"Não foi possível verificar a permissão administrativa. Confira as políticas RLS de admin_users.");return}
  if(allowed!==true){setAdminUI(false,"Esta conta Google não tem permissão administrativa.");return}
  setAdminUI(true,"");
}
el("loginButton").onclick=async()=>{
  if(!supabaseClient)return toast("Serviço de autenticação indisponível.");
  const {error}=await supabaseClient.auth.signInWithOAuth({provider:"google",options:{redirectTo:ADMIN_AUTH_REDIRECT_URL}});
  if(error)toast("Não foi possível iniciar o login: "+error.message);
};
el("logoutButton").onclick=async()=>{
  setAdminUI(false,"");
  if(supabaseClient)await supabaseClient.auth.signOut();
  toast("Sessão encerrada.");
};
if(supabaseClient){
  supabaseClient.auth.onAuthStateChange(()=>{
    // Aguarda o processamento da sessão fora do callback de autenticação.
    Promise.resolve().then(()=>setTimeout(()=>refreshAdminAccess(),0));
  });
  refreshAdminAccess();
}
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".tab-content").forEach(x=>x.classList.add("hidden"));el("tab-"+b.dataset.tab).classList.remove("hidden");renderAdmin();if(b.dataset.tab==="orders")loadOrders()});
function renderAdmin(){if(!adminAuthorized)return;el("adminProducts").innerHTML=data.products.map(p=>`<div class="admin-item">${p.mediaUrl?(p.mediaType==="video"?`<span class="mini-media">🎬</span>`:`<img class="mini-media" src="${esc(p.mediaUrl)}" alt="">`):`<span>${esc(p.image||"🎁")}</span>`}<div class="grow"><b>${esc(p.name)}</b><small>${money(p.price)} · estoque: ${p.stock}${p.mediaUrl?" · mídia cadastrada":""}</small></div><button data-edit="${p.id}">Editar</button><button data-delete="${p.id}">Excluir</button></div>`).join("")||"<p class='empty'>Nenhum produto cadastrado.</p>";document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("Excluir este produto? Produtos vinculados a reservas podem não permitir exclusão; nesse caso, desative o produto no banco."))return;const {error}=await supabaseClient.from("products").delete().eq("id",b.dataset.delete);if(error)return toast("Erro ao excluir: "+error.message);await loadCatalog();toast("Produto excluído.")})}
let pendingMedia=null;
const mediaInput=el("mediaFile"),mediaPreview=el("mediaPreview");
function previewMedia(media){if(!media){mediaPreview.classList.add("hidden");mediaPreview.innerHTML="";return}mediaPreview.classList.remove("hidden");mediaPreview.innerHTML=media.type==="video"?`<video src="${esc(media.url)}" controls playsinline></video><small>Prévia do vídeo</small>`:`<img src="${esc(media.url)}" alt="Prévia da foto"><small>Prévia da foto</small>`}
mediaInput.addEventListener("change",()=>{const file=mediaInput.files&&mediaInput.files[0];if(!file){pendingMedia=null;previewMedia(null);return}const isImage=["image/jpeg","image/png","image/webp","image/gif"].includes(file.type),isVideo=["video/mp4","video/webm"].includes(file.type);if(!isImage&&!isVideo){mediaInput.value="";return toast("Formato não suportado. Use JPG, PNG, WebP, GIF, MP4 ou WebM.")}if(file.size>10*1024*1024){mediaInput.value="";return toast("Arquivo acima de 10 MB.")}const reader=new FileReader();reader.onload=()=>{pendingMedia={url:reader.result,type:isVideo?"video":"image"};previewMedia(pendingMedia)};reader.onerror=()=>toast("Não foi possível ler esse arquivo.");reader.readAsDataURL(file)});
function editProduct(id){const p=data.products.find(x=>x.id===id),f=el("productForm");if(!p)return;f.reset();f.elements["id"].value=p.id;Object.keys(p).forEach(k=>{if(f.elements[k]&&k!=="mediaUrl"&&k!=="mediaType")f.elements[k].value=p[k]});pendingMedia=null;previewMedia(p.mediaUrl?{url:p.mediaUrl,type:p.mediaType}:null);f.scrollIntoView({behavior:"smooth",block:"start"})}
async function loadCatalog(){
  if(!supabaseClient){catalogReady=true;renderAll();toast("Supabase indisponível.");return}
  const {data:rows,error}=await supabaseClient.from("products")
    .select("id,name,description,category,price,stock,media_urls,is_active")
    .order("created_at",{ascending:false});
  if(error){catalogReady=false;el("productGrid").innerHTML="<p class='empty'>Não foi possível carregar a vitrine. Tente novamente mais tarde.</p>";toast("Falha ao consultar produtos: "+error.message);return}
  data.products=(rows||[]).map(p=>{
    const url=safeMediaUrl(p.media_urls?.[0]||"");
    return {...p,price:Number(p.price),image:"🎁",mediaUrl:url,
      mediaType:/\.(mp4|webm|mov)(\?|$)/i.test(url)?"video":"image"};
  });
  catalogReady=true;
  for(const id of Object.keys(cart)){
    const p=data.products.find(x=>x.id===id);
    if(!p||!p.is_active)delete cart[id];else cart[id]=Math.min(cart[id],p.stock);
  }
  renderAll();if(adminAuthorized)renderAdmin();
}
async function uploadProductMedia(file){
  if(!file)return null;
  const allowed={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif","video/mp4":"mp4","video/webm":"webm"};
  if(!allowed[file.type]||file.size>10*1024*1024)throw new Error("Arquivo inválido (JPG, PNG, WebP, GIF, MP4 ou WebM; máximo 10 MB).");
  const path=`products/${crypto.randomUUID()}.${allowed[file.type]}`;
  const {error}=await supabaseClient.storage.from("product-media").upload(path,file,{contentType:file.type,upsert:false});
  if(error)throw new Error("Falha no envio da mídia: "+error.message);
  return supabaseClient.storage.from("product-media").getPublicUrl(path).data.publicUrl;
}
el("productForm").onsubmit=async e=>{
  e.preventDefault();if(!adminAuthorized)return toast("Acesso não autorizado.");
  const form=e.target,f=new FormData(form),id=f.get("id"),old=data.products.find(x=>x.id===id);
  const price=Number(f.get("price")),stock=Number(f.get("stock")),name=String(f.get("name")||"").trim();
  if(!name||!Number.isFinite(price)||price<=0||!Number.isInteger(stock)||stock<0|| (id && !uuidPattern.test(id)))return toast("Confira os dados do produto.");
  const button=form.querySelector('[type="submit"]');if(button)button.disabled=true;
  try{
    const uploaded=await uploadProductMedia(mediaInput.files?.[0]);
    const payload={name,category:String(f.get("category")||"Outros").trim()||"Outros",
      description:String(f.get("description")||"").trim(),price,stock,
      media_urls:uploaded?[uploaded]:old?.media_urls||[]};
    const result=id?await supabaseClient.from("products").update(payload).eq("id",id):
      await supabaseClient.from("products").insert(payload);
    if(result.error)throw result.error;
    form.reset();pendingMedia=null;previewMedia(null);await loadCatalog();toast("Produto salvo no Supabase!");
  }catch(err){toast("Não foi possível salvar: "+err.message)}finally{if(button)button.disabled=false}
};
el("clearProduct").onclick=()=>{el("productForm").reset();pendingMedia=null;previewMedia(null)};
async function loadOrders(){
  if(!adminAuthorized)return;
  const {data:orders,error}=await supabaseClient.from("orders").select("id,adult_name,adult_phone,status,total,created_at,order_items(product_name,quantity,unit_price)").order("created_at",{ascending:false}).limit(100);
  if(error){el("adminOrders").textContent="Não foi possível carregar pedidos: "+error.message;return}
  el("adminOrders").innerHTML=(orders||[]).map(o=>`<div class="admin-item"><div class="grow"><b>Reserva ${esc(o.id.slice(0,8))} · ${money(o.total)}</b><small>${esc(o.adult_name)} · ${esc(o.adult_phone)} · ${new Date(o.created_at).toLocaleString("pt-BR")}</small><small>Status: ${esc(o.status)}</small><small>${(o.order_items||[]).map(i=>esc(i.product_name)+" × "+i.quantity).join("; ")}</small></div>${['pending','confirmed'].includes(o.status)?`<button data-paid="${o.id}">Confirmar retirada</button><button data-cancel="${o.id}">Cancelar</button>`:""}</div>`).join("")||"<p class='empty'>Nenhum pedido recebido.</p>";
  document.querySelectorAll("[data-paid],[data-cancel]").forEach(b=>b.onclick=async()=>{
    const status=b.dataset.paid?"completed":"cancelled",id=b.dataset.paid||b.dataset.cancel;
    if(!confirm(status==="completed"?"Confirmar que o produto foi retirado e pago presencialmente?":"Cancelar pedido e devolver estoque?"))return;
    b.disabled=true;
    const {error}=await supabaseClient.rpc("set_reservation_status",{p_order_id:id,p_status:status});
    if(error)toast("Erro: "+error.message);else{await loadOrders();await loadCatalog();toast("Pedido atualizado.")}
    b.disabled=false;
  });
}
function renderAll(){renderFilters();renderProducts();renderCartCount()}
renderAll();
loadCatalog();
