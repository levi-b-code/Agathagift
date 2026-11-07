/* Lojinha da Ágatha | login Google + verificação de admin no Supabase.
   ATENÇÃO: produtos, pedidos e configurações continuam no localStorage.
   Autenticação de interface NÃO substitui dados e políticas RLS no backend. */
const SUPABASE_URL = "https://jfseknlktcbcfkmpctzd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_LZfK-itbz6paiKoaKP-G-Q_a4uIggJL";
const SITE_URL = "https://levi-b-code.github.io/Agathagift/";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let adminAuthorized = false;

const STORE_KEY = "lojinha_agatha_v1";
const money = n => Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const seed = {
  products:[
    {id:"p1",name:"Pulseira arco-íris",category:"Pulseiras",price:12,stock:8,image:"🌈",description:"Pulseirinha colorida para deixar o dia mais alegre."},
    {id:"p2",name:"Pulseira de coração",category:"Pulseiras",price:15,stock:5,image:"💗",description:"Um detalhe delicado feito com carinho."},
    {id:"p3",name:"Kit de pulseirinhas",category:"Kits",price:20,stock:4,image:"🎀",description:"Um conjuntinho especial para combinar e presentear."},
    {id:"p4",name:"Gloss brilhante",category:"Acessórios",price:10,stock:6,image:"💄",description:"Um acessório divertido para completar a coleção."}
  ],
  orders:[],
  settings:{whatsapp:"",pixKey:"",pixOwner:"",paymentMessage:"Faça o Pix usando a chave informada e envie o comprovante pelo WhatsApp do responsável. O pagamento será conferido manualmente."}
};
let data = loadData(), cart = {}, activeCategory = "Todos";
function loadData(){try{return {...seed,...JSON.parse(localStorage.getItem(STORE_KEY)||"{}")}}catch{return structuredClone(seed)}}
function save(){localStorage.setItem(STORE_KEY,JSON.stringify(data))}
function el(id){return document.getElementById(id)}
function toast(msg){const t=el("toast");t.textContent=msg;t.classList.remove("hidden");setTimeout(()=>t.classList.add("hidden"),2600)}
function show(id){el(id).classList.remove("hidden")}
function hide(id){el(id).classList.add("hidden")}
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>hide(b.dataset.close)));
["cartOverlay","checkoutOverlay","adminOverlay"].forEach(id=>el(id).addEventListener("click",e=>{if(e.target.id===id)hide(id)}));
el("cartOpen").onclick=()=>{renderCart();show("cartOverlay")};
el("adminOpen").onclick=async()=>{show("adminOverlay");await refreshAdminAccess()};
function categories(){return ["Todos",...new Set(data.products.map(p=>p.category).filter(Boolean))]}
function renderFilters(){el("filters").innerHTML=categories().map(c=>`<button class="filter ${c===activeCategory?"active":""}" data-category="${esc(c)}">${esc(c)}</button>`).join("");document.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{activeCategory=b.dataset.category;renderFilters();renderProducts()})}
function mediaMarkup(p,videoControls=false){if(!p.mediaUrl)return esc(p.image||"🎁");const src=esc(p.mediaUrl);return p.mediaType==="video"?`<video src="${src}" ${videoControls?"controls":"muted autoplay loop playsinline"}></video>`:`<img src="${src}" alt="${esc(p.name)}">`}
function renderProducts(){const list=data.products.filter(p=>(activeCategory==="Todos"||p.category===activeCategory)&&p.stock>0);el("productGrid").innerHTML=list.map(p=>`<article class="product-card"><div class="product-art">${mediaMarkup(p)}</div><h3>${esc(p.name)}</h3><p>${esc(p.description||"Feito com carinho!")}</p><div class="product-meta"><span class="price">${money(p.price)}</span><span class="stock">${p.stock} disponível(is)</span></div><button class="add-button" data-add="${p.id}">Adicionar à sacola</button></article>`).join("");el("emptyState").classList.toggle("hidden",list.length>0);document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>addToCart(b.dataset.add))}
function addToCart(id){const p=data.products.find(x=>x.id===id);if(!p||((cart[id]||0)>=p.stock))return toast("Quantidade máxima disponível atingida.");cart[id]=(cart[id]||0)+1;renderCartCount();toast("Adicionado à sacolinha! 💗")}
function renderCartCount(){el("cartCount").textContent=Object.values(cart).reduce((a,b)=>a+b,0)}
function renderCart(){const entries=Object.entries(cart).filter(([id,q])=>q>0);el("cartItems").innerHTML=entries.length?entries.map(([id,q])=>{const p=data.products.find(x=>x.id===id);if(!p)return "";return `<div class="cart-row"><div class="cart-emoji">${esc(p.image||"🎁")}</div><div><b>${esc(p.name)}</b><small>${money(p.price)} cada</small></div><div class="qty"><button data-qty="${id}" data-delta="-1">−</button><b>${q}</b><button data-qty="${id}" data-delta="1">+</button></div></div>`}).join(""):`<p class="empty">Sua sacolinha ainda está vazia. 💕</p>`;const total=entries.reduce((s,[id,q])=>s+(data.products.find(p=>p.id===id)?.price||0)*q,0);el("cartTotal").textContent=money(total);document.querySelectorAll("[data-qty]").forEach(b=>b.onclick=()=>{const id=b.dataset.qty,next=(cart[id]||0)+Number(b.dataset.delta),p=data.products.find(x=>x.id===id);if(next<=0)delete cart[id];else if(next<=p.stock)cart[id]=next;else toast("Não temos essa quantidade em estoque.");renderCart();renderCartCount()});el("checkoutOpen").disabled=!entries.length;el("checkoutOpen").style.opacity=entries.length?1:.5}
el("checkoutOpen").onclick=()=>{if(!Object.keys(cart).length)return;hide("cartOverlay");show("checkoutOverlay")};
el("checkoutForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),phone=String(f.get("adultPhone")).replace(/\D/g,"");if(phone.length<10)return toast("Confira o WhatsApp informado.");const items=Object.entries(cart).map(([id,q])=>{const p=data.products.find(x=>x.id===id);return p?{id,name:p.name,price:p.price,quantity:q}:null}).filter(Boolean);if(items.some(i=>data.products.find(p=>p.id===i.id).stock<i.quantity))return toast("Estoque atualizado. Revise sua sacola.");const total=items.reduce((s,i)=>s+i.price*i.quantity,0),order={id:"AG"+Date.now().toString().slice(-7),date:new Date().toISOString(),adultName:f.get("adultName"),adultPhone:phone,items,total,status:"Aguardando confirmação"};data.orders.unshift(order);items.forEach(i=>{data.products.find(p=>p.id===i.id).stock-=i.quantity});save();cart={};renderAll();hide("checkoutOverlay");const lines=items.map(i=>`• ${i.quantity}x ${i.name} - ${money(i.price*i.quantity)}`).join("\n");const msg=`Olá! Sou ${order.adultName}, responsável pelo pedido ${order.id} da Lojinha da Ágatha.\n${lines}\nTotal: ${money(total)}\n\nChave Pix: ${data.settings.pixKey||"A combinar com o responsável"}\nTitular: ${data.settings.pixOwner||"A informar"}\n${data.settings.paymentMessage||""}`;const target=data.settings.whatsapp||phone;window.open(`https://wa.me/${target}?text=${encodeURIComponent(msg)}`,"_blank","noopener");toast("Pedido registrado! O responsável precisa conferir o pagamento.");e.target.reset()};
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function setAdminUI(authorized, message="") {
  adminAuthorized = Boolean(authorized);
  el("adminLogin").classList.toggle("hidden",adminAuthorized);
  el("adminPanel").classList.toggle("hidden",!adminAuthorized);
  el("authStatus").textContent=message;
  if(adminAuthorized)renderAdmin();
}
async function refreshAdminAccess() {
  setAdminUI(false,"Verificando acesso...");
  if(!supabaseClient){setAdminUI(false,"Não foi possível carregar a autenticação. Verifique a conexão.");return}
  const {data:{user},error:userError}=await supabaseClient.auth.getUser();
  if(userError||!user){setAdminUI(false,"");return}
  const {data:admin,error}=await supabaseClient.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();
  if(error){setAdminUI(false,"Não foi possível verificar a permissão administrativa. Confira as políticas RLS de admin_users.");return}
  if(!admin){setAdminUI(false,"Esta conta Google não tem permissão administrativa.");return}
  setAdminUI(true,"");
}
el("loginButton").onclick=async()=>{
  if(!supabaseClient)return toast("Serviço de autenticação indisponível.");
  const {error}=await supabaseClient.auth.signInWithOAuth({provider:"google",options:{redirectTo:SITE_URL}});
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
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".tab-content").forEach(x=>x.classList.add("hidden"));el("tab-"+b.dataset.tab).classList.remove("hidden");renderAdmin()});
function renderAdmin(){if(!adminAuthorized)return;el("adminProducts").innerHTML=data.products.map(p=>`<div class="admin-item">${p.mediaUrl?(p.mediaType==="video"?`<span class="mini-media">🎬</span>`:`<img class="mini-media" src="${esc(p.mediaUrl)}" alt="">`):`<span>${esc(p.image||"🎁")}</span>`}<div class="grow"><b>${esc(p.name)}</b><small>${money(p.price)} · estoque: ${p.stock}${p.mediaUrl?" · mídia cadastrada":""}</small></div><button data-edit="${p.id}">Editar</button><button data-delete="${p.id}">Excluir</button></div>`).join("")||"<p class='empty'>Nenhum produto cadastrado.</p>";document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{if(confirm("Excluir este produto?")){data.products=data.products.filter(p=>p.id!==b.dataset.delete);save();renderAll();renderAdmin()}});el("adminOrders").innerHTML=data.orders.map(o=>`<div class="admin-item"><div class="grow"><b>Pedido ${esc(o.id)} · ${money(o.total)}</b><small>${esc(o.adultName)} · ${new Date(o.date).toLocaleString("pt-BR")}<br>${o.items.map(i=>`${i.quantity}x ${esc(i.name)}`).join(", ")}</small><span class="order-status">${esc(o.status)}</span></div><button data-order="${o.id}">Confirmar</button></div>`).join("")||"<p class='empty'>Ainda não há pedidos.</p>";document.querySelectorAll("[data-order]").forEach(b=>b.onclick=()=>{const o=data.orders.find(x=>x.id===b.dataset.order);if(o){o.status="Pagamento conferido pelo responsável";save();renderAdmin();toast("Status atualizado.")}});const f=el("settingsForm");f.whatsapp.value=data.settings.whatsapp||"";f.pixKey.value=data.settings.pixKey||"";f.pixOwner.value=data.settings.pixOwner||"";f.paymentMessage.value=data.settings.paymentMessage||""}
let pendingMedia=null;
const mediaInput=el("mediaFile"),mediaPreview=el("mediaPreview");
function previewMedia(media){if(!media){mediaPreview.classList.add("hidden");mediaPreview.innerHTML="";return}mediaPreview.classList.remove("hidden");mediaPreview.innerHTML=media.type==="video"?`<video src="${esc(media.url)}" controls playsinline></video><small>Prévia do vídeo</small>`:`<img src="${esc(media.url)}" alt="Prévia da foto"><small>Prévia da foto</small>`}
mediaInput.addEventListener("change",()=>{const file=mediaInput.files&&mediaInput.files[0];if(!file){pendingMedia=null;previewMedia(null);return}const isImage=file.type.startsWith("image/"),isVideo=["video/mp4","video/webm","video/quicktime"].includes(file.type);if(!isImage&&!isVideo){mediaInput.value="";return toast("Formato não suportado. Use uma foto ou vídeo MP4, WebM ou MOV.")}if(file.size>1024*1024){mediaInput.value="";return toast("Arquivo acima de 1 MB. Reduza o tamanho para esta versão de demonstração.")}const reader=new FileReader();reader.onload=()=>{pendingMedia={url:reader.result,type:isVideo?"video":"image"};previewMedia(pendingMedia)};reader.onerror=()=>toast("Não foi possível ler esse arquivo.");reader.readAsDataURL(file)});
function editProduct(id){const p=data.products.find(x=>x.id===id),f=el("productForm");Object.keys(p).forEach(k=>{if(f.elements[k]&&k!=="mediaUrl"&&k!=="mediaType")f.elements[k].value=p[k]});pendingMedia=null;previewMedia(p.mediaUrl?{url:p.mediaUrl,type:p.mediaType}:null);f.scrollIntoView({behavior:"smooth",block:"start"})}
el("productForm").onsubmit=e=>{e.preventDefault();if(!adminAuthorized)return toast("Acesso não autorizado.");const f=new FormData(e.target),id=f.get("id")||"p"+Date.now(),old=data.products.find(x=>x.id===id),p={id,name:f.get("name").trim(),category:f.get("category").trim(),price:Number(f.get("price")),stock:Number(f.get("stock")),image:f.get("image").trim()||"🎁",mediaUrl:pendingMedia?pendingMedia.url:(old?.mediaUrl||""),mediaType:pendingMedia?pendingMedia.type:(old?.mediaType||""),description:f.get("description").trim()};if(!p.name||p.price<=0||p.stock<0)return toast("Confira os dados do produto.");const index=data.products.findIndex(x=>x.id===id);if(index>=0)data.products[index]=p;else data.products.push(p);save();e.target.reset();pendingMedia=null;previewMedia(null);renderAll();renderAdmin();toast("Produto salvo!");};
el("clearProduct").onclick=()=>{el("productForm").reset();pendingMedia=null;previewMedia(null)};
el("settingsForm").onsubmit=e=>{e.preventDefault();if(!adminAuthorized)return toast("Acesso não autorizado.");const f=new FormData(e.target);data.settings={whatsapp:String(f.get("whatsapp")).replace(/\D/g,""),pixKey:f.get("pixKey").trim(),pixOwner:f.get("pixOwner").trim(),paymentMessage:f.get("paymentMessage").trim()};save();toast("Configurações salvas.")};
function renderAll(){renderFilters();renderProducts();renderCartCount()}
renderAll();
