/* Rick Chee Shop V7 — Firebase Spark direct Firestore adapter
   No Cloud Functions required. Works on GitHub Pages + Firebase Spark.
   Security note: public wheel/review/order operations run from the browser and are therefore
   less tamper-resistant than the Cloud Functions version. Firestore Rules still constrain writes.
*/
(function () {
  'use strict';

  const DEFAULT_PRODUCTS = [
    [1,'Netflix Premium 1 DAY','netflix',true,19,'Netflix แท้ รับชมได้ทุกเรื่อง','netflix19.png'],
    [2,'Netflix Premium 3 DAY','netflix',true,39,'Netflix แท้ รับชมได้ทุกเรื่อง','netflix39.png'],
    [3,'Netflix Premium 7 DAY','netflix',true,59,'Netflix แท้ รับชมได้ทุกเรื่อง','netflix59.png'],
    [4,'Netflix Premium 15 DAY','netflix',true,109,'Netflix แท้ รับชมได้ทุกเรื่อง','netflix109.png'],
    [5,'Netflix Premium 30 DAY','netflix',true,169,'Netflix แท้ รับชมได้ทุกเรื่อง','netflix169.png'],
    [6,'Netflix Premium 30 DAY','netflix',true,189,'Netflix [ เมลลูกค้า ]','netflix189.png'],
    [7,'YouTube Premium 30 DAY','other',true,99,'YouTube Premium [ เมลลูกค้า ]','youtube.png'],
    [8,'IQIY Premium 7 DAY','other',false,29,'IQIY รับชมได้ทุกเรื่องแบบ VIP','iqiy.png'],
    [9,'IQIY Premium 30 DAY','other',false,99,'IQIY รับชมได้ทุกเรื่องแบบ VIP','iqiy.png'],
    [10,'WETV Premium 7 DAY','other',false,24,'รับชมซีรีส์แบบ VIP ที่ WETV','wetv.png'],
    [11,'WETV Premium 30 DAY','other',false,59,'รับชมซีรีส์แบบ VIP ที่ WETV','wetv.png']
  ];

  const DEFAULT_WHEEL_RATES = [
    { id:'netflix7', label:'Netflix 7 Day', rate:0 },
    { id:'netflix1', label:'Netflix 1 Day', rate:5.45 },
    { id:'netflix3', label:'Netflix 3 Day', rate:1.82 },
    { id:'discount10', label:'ส่วนลด 10%', rate:1.82 },
    { id:'discount5', label:'ส่วนลด 5%', rate:5.45 },
    { id:'discount20', label:'ส่วนลด 20%', rate:0 },
    { id:'miss', label:'MISS', rate:85.46 }
  ];

  const PREFIX = {
    MOVIE:'__RC_MOVIE__', DISCOUNT:'__RC_DISCOUNT__', ORDER:'__RC_ORDER__', SETTINGS:'__RC_SETTINGS__',
    ADMIN_USER:'__RC_ADMIN_USER__', ADMIN_AUDIT:'__RC_ADMIN_AUDIT__', ADMIN_RESET:'__RC_ADMIN_2FA_RESET__'
  };

  function nowIso(){ return new Date().toISOString(); }
  function asNum(v,f=0){ const n=Number(v); return Number.isFinite(n)?n:f; }
  function asBool(v,f=false){ if(v===undefined||v===null||v==='')return f; if(typeof v==='boolean')return v; return !['false','0','no','off','null','undefined'].includes(String(v).toLowerCase()); }
  function text(v,max=700000){ return String(v??'').trim().slice(0,max); }
  function parse(v,f={}){ try{return typeof v==='object'&&v!==null?v:JSON.parse(String(v||''));}catch(_){return f;} }
  function uid(){ return String(Date.now()) + String(Math.floor(Math.random()*1000)).padStart(3,'0'); }
  function upper(v){ return text(v,80).toUpperCase(); }

  function ready(){ return !!(window.firebase && firebase.firestore && window.RickCheeFirebaseReady); }
  function db(){ if(!ready()) throw new Error('Firebase Firestore ยังไม่พร้อม'); return firebase.firestore(); }
  function currentEmail(){ return String(firebase.auth?.().currentUser?.email || '').toLowerCase(); }
  function configuredAdminEmails(){
    const list = window.RickCheeFirebaseConfig?.adminEmails;
    if (Array.isArray(list) && list.length) return list.map(x=>String(x).toLowerCase());
    return ['admin@rickcheeshop.example','adminbank@rickcheeshop.example'];
  }
  function isAdminClient(){ return !!firebase.auth?.().currentUser; }
  function requireAdmin(){ if(!firebase.auth?.().currentUser) throw new Error('กรุณาเข้าสู่ระบบ Firebase ก่อน'); }

  function mapProductDoc(doc){ const r=doc.data()||{}; return {id:asNum(r.id,asNum(doc.id)),name:r.name||'',category:r.category||'other',available:!!r.available,price:asNum(r.price),desc:r.description||'',image:r.image||'',synced:true}; }
  function mapReviewDoc(doc){ const r=doc.data()||{}; return {id:asNum(r.id,asNum(doc.id)),name:r.name||'',rating:asNum(r.rating,5),comment:r.comment||'',date:r.displayDate||'',imageUrl:r.imageUrl||'',createdAt:r.createdAt||'',synced:true}; }
  function mapPromoDoc(doc){ const r=doc.data()||{}; return {id:r.id ?? doc.id,title:r.title||'',description:r.description||'',image:r.image||'',startAt:r.startAt||null,endAt:r.endAt||null,enabled:r.enabled!==false,createdAt:r.createdAt||'',synced:true}; }
  function pseudoPromo(doc, prefix){ const r=doc.data()||{}; return {id:r.id ?? doc.id,title:r.title || `${prefix}|${r.code||r.orderNo||r.key||doc.id}`,description:r.description || JSON.stringify(r.meta||r),image:r.image||'',startAt:r.startAt||null,endAt:r.endAt||null,enabled:r.enabled!==false,createdAt:r.createdAt||'',updatedAt:r.updatedAt||r.createdAt||'',synced:true}; }

  async function seedDefaults(){
    requireAdmin();
    const marker=db().collection('settings').doc('bootstrapState');
    const snap=await marker.get();
    if(snap.exists)return;
    const batch=db().batch();
    DEFAULT_PRODUCTS.forEach(([id,name,category,available,price,description,image])=>{
      batch.set(db().collection('products').doc(String(id)),{id,name,category,available,price,description,image,sortOrder:id,updatedAt:nowIso()},{merge:true});
    });
    batch.set(db().collection('settings').doc('maintenanceMode'),{value:'false',updatedAt:nowIso()},{merge:true});
    batch.set(marker,{initializedAt:nowIso(),version:7},{merge:true});
    await batch.commit();
  }

  async function getProducts(){
    const s=await db().collection('products').get();
    const rows=s.docs.map(mapProductDoc).sort((a,b)=>asNum(a.id)-asNum(b.id));
    if(rows.length) return rows;
    // First-run fallback: the storefront still shows the starter catalogue before
    // the Admin opens the dashboard for the first time. AdminData will persist
    // these defaults to Firestore through seedDefaults().
    return DEFAULT_PRODUCTS.map(([id,name,category,available,price,description,image])=>({id,name,category,available,price,desc:description,image,synced:false}));
  }
  async function getReviews(){ const s=await db().collection('reviews').get(); return s.docs.map(mapReviewDoc).sort((a,b)=>asNum(b.id)-asNum(a.id)).slice(0,500); }
  async function getPublicPromotions(){ const s=await db().collection('promotions').get(); return s.docs.map(mapPromoDoc).sort((a,b)=>String(b.id).localeCompare(String(a.id),undefined,{numeric:true})); }
  async function getDiscountPromos(){ const s=await db().collection('discounts').get(); return s.docs.map(d=>pseudoPromo(d,PREFIX.DISCOUNT)); }
  async function getSettingsPromos(){ const s=await db().collection('storeSettings').get(); return s.docs.map(d=>pseudoPromo(d,PREFIX.SETTINGS)).sort((a,b)=>{const ta=Date.parse(a.updatedAt||a.createdAt||0)||0,tb=Date.parse(b.updatedAt||b.createdAt||0)||0;if(ta!==tb)return ta-tb;return String(a.id).localeCompare(String(b.id),undefined,{numeric:true});}); }
  async function getAdminRecords(){ requireAdmin(); const s=await db().collection('adminRecords').get(); return s.docs.map(d=>mapPromoDoc(d)); }
  async function getOrderPromosAdmin(){ requireAdmin(); const s=await db().collection('orders').get(); return s.docs.map(d=>{const r=d.data()||{};return{id:d.id,title:`${PREFIX.ORDER}|${r.orderNo||d.id}`,description:JSON.stringify(r),image:'',startAt:String(r.createdAt||'').slice(0,10),endAt:'',enabled:false,createdAt:r.createdAt||'',synced:true};}); }
  async function getLocalOrderPromos(){
    try { const arr=JSON.parse(localStorage.getItem('rickchee_v7_orders')||'[]'); return Array.isArray(arr)?arr.map(r=>({id:r._recordId||r.id||r.orderNo,title:`${PREFIX.ORDER}|${r.orderNo}`,description:JSON.stringify(r),image:'',startAt:String(r.createdAt||'').slice(0,10),endAt:'',enabled:false,createdAt:r.createdAt||'',synced:true})):[]; } catch(_){ return []; }
  }
  function saveLocalOrder(order){ try{let a=JSON.parse(localStorage.getItem('rickchee_v7_orders')||'[]');if(!Array.isArray(a))a=[];a=a.filter(x=>x.orderNo!==order.orderNo);a.unshift(order);localStorage.setItem('rickchee_v7_orders',JSON.stringify(a.slice(0,100)));}catch(_){} }
  function getLocalOrder(id,clientId){ try{const a=JSON.parse(localStorage.getItem('rickchee_v7_orders')||'[]');return Array.isArray(a)?a.find(x=>String(x._recordId||'')===String(id||'')&&String(x.clientId||'')===String(clientId||'')):null;}catch(_){return null;} }
  function removeLocalOrder(id,clientId){ try{let a=JSON.parse(localStorage.getItem('rickchee_v7_orders')||'[]');if(!Array.isArray(a))return;a=a.filter(x=>String(x._recordId||'')!==String(id) || String(x.clientId||'')!==String(clientId||''));localStorage.setItem('rickchee_v7_orders',JSON.stringify(a));}catch(_){} }

  async function getMaintenance(){ const s=await db().collection('settings').doc('maintenanceMode').get(); return s.exists?asBool(s.data().value):false; }
  async function siteData(){
    const [products,reviews,promos,discounts,settings,maintenance,orders]=await Promise.all([getProducts(),getReviews(),getPublicPromotions(),getDiscountPromos(),getSettingsPromos(),getMaintenance(),getLocalOrderPromos()]);
    return {success:true,data:{products,reviews,promotions:[...promos,...discounts,...settings,...orders],maintenanceMode:maintenance}};
  }
  async function adminData(){
    requireAdmin(); await seedDefaults();
    const [products,reviews,promos,discounts,settings,adminRecords,orders,maintenance]=await Promise.all([getProducts(),getReviews(),getPublicPromotions(),getDiscountPromos(),getSettingsPromos(),getAdminRecords(),getOrderPromosAdmin(),getMaintenance()]);
    return {success:true,data:{products,reviews,promotions:[...promos,...discounts,...settings,...adminRecords,...orders],maintenanceMode:maintenance}};
  }

  async function submitReview(p){
    const name=text(p.name,120),comment=text(p.comment,4000); if(!name||!comment)return{success:false,message:'กรุณากรอกชื่อและรีวิว'};
    const id=uid(); const row={id:Number(id),name,rating:Math.min(5,Math.max(1,Math.round(asNum(p.rating,5)))),comment,displayDate:text(p.date,80),imageUrl:text(p.imageUrl||p.image,700000),createdAt:nowIso()};
    await db().collection('reviews').doc(id).set(row); return{success:true,data:{id:row.id,name:row.name,rating:row.rating,comment:row.comment,date:row.displayDate,imageUrl:row.imageUrl,createdAt:row.createdAt}};
  }

  async function createOrder(p){
    const raw=typeof p.order==='object'?p.order:parse(p.order,{}); const orderNo=text(raw.orderNo,80),clientId=text(raw.clientId,160);
    if(!orderNo||!clientId||!Array.isArray(raw.items)||!raw.items.length)return{success:false,message:'ข้อมูลออเดอร์ไม่ครบ'};
    const row={orderNo,clientId,createdAt:text(raw.createdAt,80)||nowIso(),cancelToken:crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`,items:raw.items.slice(0,50).map(i=>({id:text(i.id,80),name:text(i.name,220),price:Math.max(0,asNum(i.price)),quantity:Math.max(1,Math.min(99,Math.floor(asNum(i.quantity,1))))})),subtotal:Math.max(0,asNum(raw.subtotal)),discount:raw.discount||null,discountAmount:Math.max(0,asNum(raw.discountAmount)),total:Math.max(0,asNum(raw.total)),paymentMethod:['qr','bank'].includes(String(raw.paymentMethod))?String(raw.paymentMethod):'qr',status:'confirmed',source:'github-pages-v7'};
    const ref=db().collection('orders').doc(); row._recordId=ref.id; await ref.set(row); saveLocalOrder(row); return{success:true,data:{id:ref.id,orderNo}};
  }
  async function deleteOrder(p){ const id=String(p.id||p.recordId||''), local=getLocalOrder(id,p.clientId); if(local?.cancelToken){ try{await db().collection('orders').doc(id).update({status:'canceled',canceledAt:nowIso(),cancelProof:local.cancelToken});}catch(_){} } removeLocalOrder(id,p.clientId); return{success:true,data:{id}}; }

  async function hashId(value){ const bytes=new TextEncoder().encode(String(value)); const digest=await crypto.subtle.digest('SHA-256',bytes); return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
  async function consumeDiscount(p){
    const code=upper(p.code),clientId=text(p.clientId,160); if(!code||!clientId)return{success:false,message:'ข้อมูลโค้ดส่วนลดไม่ครบ'};
    const qs=await db().collection('discounts').where('code','==',code).limit(1).get(); if(qs.empty)return{success:false,message:'ไม่พบโค้ดส่วนลด'};
    const d=qs.docs[0],r=d.data()||{},meta=r.meta||parse(r.description,{}); if((meta.enabled??r.enabled??true)===false)return{success:false,message:'โค้ดส่วนลดถูกปิดใช้งาน'};
    const now=new Date(); if(meta.startAt&&now<new Date(meta.startAt+'T00:00:00'))return{success:false,message:'โค้ดส่วนลดยังไม่เริ่มใช้งาน'}; if(meta.endAt&&now>new Date(meta.endAt+'T23:59:59'))return{success:false,message:'โค้ดส่วนลดหมดอายุแล้ว'};
    const id=await hashId(`${code}|${clientId}`), ref=db().collection('discountUsages').doc(id);
    const result=await db().runTransaction(async tx=>{const s=await tx.get(ref);const old=s.exists?s.data():{};const uses=asNum(old.uses,0),maxPer=Math.max(0,asNum(meta.maxUsesPerPerson,1));if(maxPer>0&&uses>=maxPer)return{success:false,message:'คุณใช้โค้ดนี้ครบจำนวนครั้งที่กำหนดแล้ว'};tx.set(ref,{code,clientIdHash:await hashId(clientId),uses:uses+1,updatedAt:nowIso(),createdAt:old.createdAt||nowIso()},{merge:true});return{success:true,data:{id:d.id,description:meta,usedCount:uses+1}};});
    return result;
  }

  function routePromo(title){
    title=String(title||'');
    if(title.startsWith(PREFIX.DISCOUNT))return'discounts';
    if(title.startsWith(PREFIX.SETTINGS))return'storeSettings';
    if(title.startsWith(PREFIX.ADMIN_USER)||title.startsWith(PREFIX.ADMIN_AUDIT)||title.startsWith(PREFIX.ADMIN_RESET))return'adminRecords';
    return'promotions';
  }
  function promoRow(p,id){ return{id,title:text(p.title,500),description:text(p.description,700000),image:text(p.image,700000),startAt:text(p.startAt,80),endAt:text(p.endAt,80),enabled:asBool(p.enabled,true),createdAt:p.createdAt||nowIso(),updatedAt:nowIso()}; }
  async function adminCreatePromotion(p){requireAdmin();const id=uid(),col=routePromo(p.title),row=promoRow(p,Number(id));if(col==='discounts'){row.code=String(row.title).split('|').slice(1).join('|').trim().toUpperCase();row.meta=parse(row.description,{});}if(col==='storeSettings'){row.key='main';row.meta=parse(row.description,{});}await db().collection(col).doc(id).set(row);return{success:true,data:{id:Number(id)}};}
  async function findSpecialById(id){ for(const col of ['promotions','discounts','storeSettings','adminRecords']){const ref=db().collection(col).doc(String(id));const s=await ref.get();if(s.exists)return{col,ref,s};}return null; }
  async function adminUpdatePromotion(p){requireAdmin();const found=await findSpecialById(p.id);if(!found)return{success:false,message:'ไม่พบข้อมูล'};const row=promoRow({...found.s.data(),...p},found.s.data().id??p.id);if(found.col==='discounts'){row.code=String(row.title).split('|').slice(1).join('|').trim().toUpperCase();row.meta=parse(row.description,{});}if(found.col==='storeSettings'){row.key='main';row.meta=parse(row.description,{});}await found.ref.set(row,{merge:true});return{success:true,data:{id:p.id}};}
  async function adminDeletePromotion(p){requireAdmin();const found=await findSpecialById(p.id);if(found)await found.ref.delete();else{try{await db().collection('orders').doc(String(p.id)).delete();}catch(_){}}return{success:true,data:{id:p.id}};}

  async function adminCreateProduct(p){requireAdmin();const id=uid();const row={id:Number(id),name:text(p.name,220),category:text(p.category||'other',80),available:asBool(p.available,true),price:asNum(p.price),description:text(p.desc||p.description,8000),image:text(p.image,700000),sortOrder:Math.floor(asNum(p.sortOrder,Number(id))),updatedAt:nowIso()};await db().collection('products').doc(id).set(row);return{success:true,data:{id:row.id}};}
  async function adminUpdateProduct(p){requireAdmin();const id=String(p.id);await db().collection('products').doc(id).set({id:asNum(p.id),name:text(p.name,220),category:text(p.category||'other',80),available:asBool(p.available,true),price:asNum(p.price),description:text(p.desc||p.description,8000),image:text(p.image,700000),sortOrder:Math.floor(asNum(p.sortOrder,asNum(p.id))),updatedAt:nowIso()},{merge:true});return{success:true,data:{id:p.id}};}
  async function adminDeleteProduct(p){requireAdmin();await db().collection('products').doc(String(p.id)).delete();return{success:true,data:{id:p.id}};}
  async function adminDeleteReview(p){requireAdmin();await db().collection('reviews').doc(String(p.id)).delete();return{success:true,data:{id:p.id}};}
  async function adminEditReview(p){requireAdmin();await db().collection('reviews').doc(String(p.id)).set({id:asNum(p.id),name:text(p.name,120),rating:Math.min(5,Math.max(1,Math.round(asNum(p.rating,5)))),comment:text(p.comment,4000),displayDate:text(p.date,80),imageUrl:text(p.imageUrl||p.image,700000)},{merge:true});return{success:true,data:{id:p.id}};}
  async function adminToggleMaintenance(p){requireAdmin();const enabled=asBool(p.enabled);await db().collection('settings').doc('maintenanceMode').set({value:String(enabled),updatedAt:nowIso()},{merge:true});return{success:true,data:{maintenanceMode:enabled}};}

  function wheelRowDoc(doc){const r=doc.data()||{};return{code:r.code||doc.id,spins:asNum(r.spins),maxSpins:asNum(r.maxSpins),history:Array.isArray(r.history)?r.history:[],createdAt:r.createdAt||'',expiresAt:r.expiresAt||'',restoredOnce:!!r.restoredOnce,firstUsedAt:r.firstUsedAt||null,lastUsedAt:r.lastUsedAt||null,movedToTrashAt:r.deletedAt||null,purgedAt:r.purgedAt||null};}
  async function wheelValidate(p){const code=upper(p.code),s=await db().collection('wheelCodes').doc(code).get();if(!s.exists)return{valid:false,error:'not_found'};const r=s.data()||{};if(r.deletedAt)return{valid:false,error:'not_found'};if(r.expiresAt&&new Date(r.expiresAt)<new Date())return{valid:false,error:'expired'};if(asNum(r.spins)<=0)return{valid:false,error:'no_spins',spins:0};return{valid:true,spins:asNum(r.spins)};}
  async function getWheelRates(){try{const s=await db().collection('storeSettings').get();const rows=s.docs.map(d=>({id:d.id,...(d.data()||{})})).sort((a,b)=>{const ta=Date.parse(a.updatedAt||a.createdAt||0)||0,tb=Date.parse(b.updatedAt||b.createdAt||0)||0;if(ta!==tb)return tb-ta;return String(b.id).localeCompare(String(a.id),undefined,{numeric:true});});for(const row of rows){const m=row.meta||parse(row.description,{});if(Array.isArray(m.wheelRates)&&m.wheelRates.length){const rates=m.wheelRates.map((x,i)=>({id:String(x.id||`prize-${i+1}`),label:String(x.label||x.name||`รางวัล ${i+1}`),rate:Math.max(0,asNum(x.rate))}));if(rates.some(x=>x.rate>0))return rates;}}}catch(_){}return DEFAULT_WHEEL_RATES.map(x=>({...x}));}
  function choose(items){const total=items.reduce((s,x)=>s+Math.max(0,asNum(x.rate)),0);if(total<=0)return items.find(x=>String(x.label).toUpperCase()==='MISS')||items[0];let t=Math.random()*total;for(const x of items){t-=Math.max(0,asNum(x.rate));if(t<0)return x;}return items[items.length-1];}
  async function wheelSpin(p){const code=upper(p.code),rates=await getWheelRates(),winner=choose(rates),ref=db().collection('wheelCodes').doc(code),now=nowIso();return await db().runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists)return{ok:false,error:'not_found'};const r=s.data()||{};if(r.deletedAt)return{ok:false,error:'not_found'};if(r.expiresAt&&new Date(r.expiresAt)<new Date())return{ok:false,error:'expired'};const spins=asNum(r.spins);if(spins<=0)return{ok:false,error:'no_spins',spinsLeft:0};const h=Array.isArray(r.history)?r.history.slice():[];h.push({prize:winner.label,prizeId:winner.id,time:now,date:now,result:{prize:winner.label,prizeId:winner.id}});while(h.length>100)h.shift();tx.update(ref,{spins:spins-1,history:h,firstUsedAt:r.firstUsedAt||now,lastUsedAt:now});return{ok:true,spinsLeft:spins-1,prize:winner.label,prizeId:winner.id,serverRecorded:true,directClient:true};});}
  async function wheelRecord(){return{ok:true};}
  function randomCode(n){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<n;i++)s+=chars[Math.floor(Math.random()*chars.length)];return s;}
  async function wheelList(){requireAdmin();const s=await db().collection('wheelCodes').get(),active=[],trash=[];s.docs.forEach(d=>{const r=wheelRowDoc(d);if(r.purgedAt)return;(r.movedToTrashAt?trash:active).push(r);});active.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));trash.sort((a,b)=>new Date(b.movedToTrashAt)-new Date(a.movedToTrashAt));return{success:true,ok:true,codes:active,trash};}
  async function wheelCreate(p){requireAdmin();const spins=Math.max(1,Math.min(999,Math.floor(asNum(p.spins,1)))),count=Math.max(1,Math.min(100,Math.floor(asNum(p.count,1)))),length=Math.max(4,Math.min(24,Math.floor(asNum(p.length,8)))),days=Math.max(1,Math.min(365,Math.floor(asNum(p.expiryDays,7)))),created=[];for(let i=0;i<count;i++){for(let a=0;a<30;a++){const code=randomCode(length),ref=db().collection('wheelCodes').doc(code),s=await ref.get();if(s.exists)continue;const row={code,spins,maxSpins:spins,history:[],createdAt:nowIso(),expiresAt:new Date(Date.now()+days*86400000).toISOString(),restoredOnce:false,firstUsedAt:null,lastUsedAt:null,deletedAt:null};await ref.set(row);created.push(wheelRowDoc({id:code,data:()=>row}));break;}}return{success:true,ok:true,created};}
  async function wheelDelete(p){requireAdmin();await db().collection('wheelCodes').doc(upper(p.code)).set({deletedAt:nowIso()},{merge:true});return{success:true,ok:true};}
  async function wheelRestore(p){requireAdmin();const ref=db().collection('wheelCodes').doc(upper(p.code));return await db().runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists)return{ok:false,error:'not_found'};const r=s.data()||{};if(r.restoredOnce)return{ok:false,error:'already_restored'};tx.update(ref,{deletedAt:null,restoredOnce:true,expiresAt:new Date(Date.now()+7*86400000).toISOString()});return{success:true,ok:true};});}
  async function wheelDeleteTrash(p){requireAdmin();await db().collection('wheelCodes').doc(upper(p.code)).set({purgedAt:nowIso(),archived:true},{merge:true});return{success:true,ok:true,historyPreserved:true};}
  async function wheelPurgeTrash(){requireAdmin();const s=await db().collection('wheelCodes').get(),batch=db().batch(),cut=Date.now()-86400000,stamp=nowIso();s.docs.forEach(d=>{const x=d.data()||{},t=x.deletedAt?new Date(x.deletedAt).getTime():0;if(t&&t<cut&&!x.purgedAt)batch.set(d.ref,{purgedAt:stamp,archived:true},{merge:true});});await batch.commit();return{success:true,ok:true,historyPreserved:true};}

  async function call(action,payload={}){
    if(!ready()) throw new Error('Firebase ยังไม่พร้อม กรุณาตรวจ firebase-config.js');
    switch(String(action||'')){
      case'health':return{success:true,data:{service:'rick-chee-direct',database:'firebase-firestore',plan:'spark',now:nowIso()}};
      case'siteData':return siteData(payload); case'products':return{success:true,data:await getProducts()}; case'reviews':return{success:true,data:await getReviews()}; case'submitReview':return submitReview(payload); case'createOrder':return createOrder(payload); case'deleteOrder':return deleteOrder(payload); case'consumeDiscount':return consumeDiscount(payload);
      case'adminData':return adminData(); case'adminToggleMaintenance':return adminToggleMaintenance(payload); case'adminCreateProduct':return adminCreateProduct(payload); case'adminUpdateProduct':return adminUpdateProduct(payload); case'adminDeleteProduct':return adminDeleteProduct(payload); case'adminDeleteReview':return adminDeleteReview(payload); case'adminEditReview':return adminEditReview(payload); case'adminCreatePromotion':return adminCreatePromotion(payload); case'adminUpdatePromotion':return adminUpdatePromotion(payload); case'adminDeletePromotion':return adminDeletePromotion(payload);
      case'validate':return wheelValidate(payload); case'spin':return wheelSpin(payload); case'record':return wheelRecord(payload); case'list':return wheelList(); case'create':return wheelCreate(payload); case'delete':return wheelDelete(payload); case'restore':return wheelRestore(payload); case'deletetrash':return wheelDeleteTrash(payload); case'purgetrash':return wheelPurgeTrash();
      default:throw new Error(`Unknown direct action: ${action}`);
    }
  }

  window.RickCheeDirectApi={call,ready,isAdminClient,seedDefaults,mode:'firebase-spark-direct'};
})();
