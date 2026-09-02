/* Rick Chee Shop V7.7 — Firebase Authentication access manager for Spark plan.
   Creates Auth users with a secondary Firebase app so the current manager stays signed in.
   Deleting here revokes Rick Chee Shop access through adminAccess; permanent Auth deletion remains in Firebase Console on Spark. */
(function(){
  'use strict';
  const ROOTS=['admin@rickcheeshop.example','adminbank@rickcheeshop.example'];
  const DOMAIN=String(window.RickCheeFirebaseConfig?.usernameDomain||'rickcheeshop.example').toLowerCase();
  const cfg=window.RickCheeFirebaseConfig||{};
  const cleanCfg={apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId};
  const db=()=>firebase.firestore();
  const auth=()=>firebase.auth();
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const toast=(m,t='success')=>typeof window.showAdminToast==='function'?window.showAdminToast(m,t):alert(m);
  const emailFor=username=>`${String(username||'').trim().toLowerCase()}@${DOMAIN}`;
  const usernameFrom=email=>String(email||'').toLowerCase().replace(new RegExp('@'+DOMAIN.replace(/\./g,'\\.')+'$'),'').split('@')[0];
  const root=email=>ROOTS.includes(String(email||'').toLowerCase());
  let cache=[]; let securityCache=new Map();

  async function loadUsers(){
    const current=auth().currentUser;
    if(!current)return;
    const list=[];
    ROOTS.forEach((email,i)=>list.push({uid:(String(current.email||'').toLowerCase()===email?current.uid:`root-${i}`),email,username:usernameFrom(email),displayName:usernameFrom(email),role:'manager',active:true,isRoot:true,createdAt:null}));
    try{
      securityCache=new Map();
      try{ const ss=await db().collection('adminSecurity').get(); ss.forEach(doc=>securityCache.set(doc.id,doc.data()||{})); }catch(_){}
      const snap=await db().collection('adminAccess').get();
      snap.forEach(doc=>{
        const d=doc.data()||{}; const email=String(d.email||emailFor(d.username||doc.id)).toLowerCase();
        if(root(email))return;
        list.push({uid:doc.id,email,username:d.username||usernameFrom(email),displayName:d.displayName||d.username||usernameFrom(email),role:d.role==='manager'?'manager':'admin',active:d.active!==false,isRoot:false,createdAt:d.createdAt||null,createdBy:d.createdBy||''});
      });
      cache=list.sort((a,b)=>Number(b.isRoot)-Number(a.isRoot)||String(a.username).localeCompare(String(b.username)));
      render();
    }catch(err){
      $('fbAdminUsersList') && ($('fbAdminUsersList').innerHTML=`<div class="v74-auth-loading"><i class="fas fa-triangle-exclamation"></i> ${esc(err.message||'โหลดรายชื่อไม่ได้')}</div>`);
    }
  }

  function render(){
    const list=$('fbAdminUsersList'); if(!list)return;
    const current=auth().currentUser; const currentUid=current?.uid||''; const currentEmail=String(current?.email||'').toLowerCase();
    $('fbAdminStatTotal') && ($('fbAdminStatTotal').textContent=String(cache.length));
    $('fbAdminStatActive') && ($('fbAdminStatActive').textContent=String(cache.filter(x=>x.active).length));
    $('fbAdminStatManagers') && ($('fbAdminStatManagers').textContent=String(cache.filter(x=>x.role==='manager').length));
    $('fbAdminCurrentUser') && ($('fbAdminCurrentUser').textContent=usernameFrom(currentEmail)||'-');
    list.innerHTML=cache.map(u=>{
      const isCurrent=u.uid===currentUid||u.email===currentEmail;
      const roleOptions=`<option value="admin" ${u.role==='admin'?'selected':''}>Admin</option><option value="manager" ${u.role==='manager'?'selected':''}>Manager</option>`;
      return `<article class="v74-auth-user" data-uid="${esc(u.uid)}">
        <div class="v74-auth-user-main">
          <span class="v74-auth-avatar">${esc(String(u.username||'?').slice(0,1).toUpperCase())}</span>
          <div class="v74-auth-user-copy"><strong>${esc(u.displayName||u.username)} <span class="v74-auth-chip">@${esc(u.username)}</span>${u.isRoot?'<span class="v74-auth-chip is-root"><i class="fas fa-crown"></i> ROOT</span>':''}${isCurrent?'<span class="v74-auth-chip">บัญชีปัจจุบัน</span>':''}</strong><small>${esc(u.email)} · ${u.active?'เปิดสิทธิ์':'ปิดสิทธิ์'} · ${securityCache.get(u.uid)?.totpEnabled===true?'2FA เปิดแล้ว':'2FA รอตั้งค่า'}</small></div>
        </div>
        <div class="v74-auth-user-actions">
          <select class="fb-user-role" data-uid="${esc(u.uid)}" ${u.isRoot?'disabled':''}>${roleOptions}</select>
          <button class="fb-user-toggle" data-uid="${esc(u.uid)}" ${u.isRoot?'disabled':''}><i class="fas ${u.active?'fa-user-lock':'fa-user-check'}"></i> ${u.active?'ปิดสิทธิ์':'เปิดสิทธิ์'}</button>
          <button class="fb-user-reset" data-uid="${esc(u.uid)}" ${u.email.endsWith('.example')?'title="บัญชี .example ไม่มีอีเมลรับลิงก์ Reset"':''}><i class="fas fa-key"></i> Reset</button>
          <button class="fb-user-2fa" data-uid="${esc(u.uid)}" ${String(u.uid).startsWith('root-')?'disabled title="UID ของ Root อีกบัญชีจะรู้ได้เมื่อบัญชีนั้นล็อกอิน"':''}><i class="fas fa-shield-halved"></i> กู้คืน 2FA</button>
          <button class="fb-user-delete is-danger" data-uid="${esc(u.uid)}" ${(u.isRoot||isCurrent)?'disabled':''}><i class="fas fa-trash"></i> ลบสิทธิ์</button>
        </div>
      </article>`;
    }).join('')||'<div class="v74-auth-loading">ยังไม่มีบัญชี</div>';
  }

  async function createUser(e){
    e.preventDefault();
    const username=String($('fbAdminUsername')?.value||'').trim().toLowerCase();
    const displayName=String($('fbAdminDisplayName')?.value||username).trim()||username;
    const role=String($('fbAdminRole')?.value||'admin')==='manager'?'manager':'admin';
    const password=String($('fbAdminPassword')?.value||'');
    if(!/^[a-z0-9._-]{3,32}$/.test(username)){toast('Username ใช้ได้เฉพาะ a-z, 0-9, จุด, _ และ -','error');return;}
    if(password.length<6){toast('รหัสผ่านอย่างน้อย 6 ตัวอักษร','error');return;}
    const btn=$('fbAdminCreateBtn'); if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> กำลังสร้าง...';}
    const appName=`rc-create-${Date.now()}`; let app=null; let createdUser=null;
    try{
      // Root accounts and Manager records may create additional administrators.
      const actor=auth().currentUser;
      const actorEmail=String(actor?.email||'').toLowerCase();
      if(!actor) throw new Error('กรุณาเข้าสู่ระบบใหม่ก่อนสร้างผู้ดูแล');
      if(!root(actorEmail)){
        const access=cache.find(x=>x.uid===actor.uid||x.email===actorEmail);
        if(!access || access.role!=='manager' || access.active===false) throw new Error('บัญชีนี้ไม่มีสิทธิ์ Manager สำหรับเพิ่มผู้ดูแล');
      }
      app=firebase.initializeApp(cleanCfg,appName);
      const a=app.auth();
      const cred=await a.createUserWithEmailAndPassword(emailFor(username),password);
      createdUser=cred.user;
      if(displayName)await cred.user.updateProfile({displayName});
      try{
        await db().collection('adminAccess').doc(cred.user.uid).set({username,email:emailFor(username),displayName,role,active:true,createdAt:firebase.firestore.FieldValue.serverTimestamp(),createdBy:actorEmail});
      }catch(accessErr){
        // Avoid leaving an orphan Firebase Authentication account when Firestore Rules reject the grant.
        try{await cred.user.delete(); createdUser=null;}catch(_){}
        if(String(accessErr?.code||'').includes('permission-denied') || /insufficient permissions/i.test(String(accessErr?.message||''))){
          throw new Error('Firestore Rules ยังไม่อนุญาตให้เพิ่มผู้ดูแล กรุณา Publish FIRESTORE_RULES_COPY.txt ของ V7.7 แล้ว Login ด้วย admin หรือ adminbank อีกครั้ง');
        }
        throw accessErr;
      }
      await a.signOut();
      $('fbAdminCreateForm')?.reset();
      toast(`สร้าง @${username} และให้สิทธิ์ ${role==='manager'?'Manager':'Admin'} แล้ว`);
      await loadUsers();
    }catch(err){
      const code=String(err?.code||'');
      const msg=code==='auth/email-already-in-use'
        ? 'Username นี้มีอยู่ใน Firebase Authentication แล้ว หากเป็นบัญชีค้างจากครั้งก่อนให้ลบใน Firebase Console ก่อน'
        : (err.message||'สร้างบัญชีไม่สำเร็จ');
      toast(msg,'error');
    }
    finally{try{if(createdUser && app?.auth?.().currentUser) await app.auth().signOut();}catch(_){} try{if(app)await app.delete();}catch(_){} if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-user-plus"></i> สร้างบัญชีและให้สิทธิ์';}}
  }

  function find(uid){return cache.find(x=>x.uid===uid)}
  async function changeRole(uid,role){const u=find(uid);if(!u||u.isRoot)return;try{await db().collection('adminAccess').doc(uid).update({role:role==='manager'?'manager':'admin',updatedAt:firebase.firestore.FieldValue.serverTimestamp()});toast(`อัปเดตบทบาท @${u.username} แล้ว`);await loadUsers();}catch(e){toast(e.message,'error')}}
  async function toggle(uid){const u=find(uid);if(!u||u.isRoot)return;try{await db().collection('adminAccess').doc(uid).update({active:!u.active,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});toast(`${u.active?'ปิด':'เปิด'}สิทธิ์ @${u.username} แล้ว`);await loadUsers();}catch(e){toast(e.message,'error')}}
  async function remove(uid){const u=find(uid);if(!u||u.isRoot)return;if(!confirm(`ถอนสิทธิ์ @${u.username} ออกจาก Rick Chee Shop หรือไม่?\n\nหมายเหตุ: Spark แบบไม่ใช้ Server สามารถถอนสิทธิ์จากเว็บได้ แต่การลบ Firebase Auth User ถาวรต้องลบต่อใน Firebase Console`))return;try{await db().collection('adminAccess').doc(uid).delete();toast(`ถอนสิทธิ์ @${u.username} แล้ว`);await loadUsers();}catch(e){toast(e.message,'error')}}
  async function reset(uid){const u=find(uid);if(!u)return;if(u.email.endsWith('.example')){toast('บัญชี Username แบบ .example รับอีเมล Reset ไม่ได้ หากต้องเปลี่ยนรหัสให้เจ้าของบัญชี Login แล้วใช้ “เปลี่ยนรหัสบัญชีฉัน” หรือแก้ผู้ใช้ใน Firebase Console','error');return;}try{await auth().sendPasswordResetEmail(u.email);toast(`ส่งอีเมล Reset Password ไป ${u.email} แล้ว`)}catch(e){toast(e.message,'error')}}
  async function reset2fa(uid){
    const u=find(uid);if(!u)return;
    if(typeof window.openAdmin2faRecoveryCenter==='function') window.openAdmin2faRecoveryCenter();
    toast(`เพื่อความปลอดภัย @${u.username} ต้องกดขอรีเซ็ต 2FA จากหน้าล็อกอินก่อน แล้วผู้จัดการจึงอนุมัติและออกโค้ด 8 หลัก`,'error');
  }

  async function reauth(){const u=auth().currentUser;if(!u)return;const pass=prompt('กรอกรหัสผ่านปัจจุบันเพื่อ Re-authenticate');if(!pass)return;try{const c=firebase.auth.EmailAuthProvider.credential(u.email,pass);await u.reauthenticateWithCredential(c);toast('Re-authenticate สำเร็จ')}catch(e){toast('ยืนยันรหัสผ่านไม่สำเร็จ','error')}}
  async function refreshToken(){const u=auth().currentUser;if(!u)return;try{await u.getIdToken(true);toast('Refresh Authentication Token สำเร็จ')}catch(e){toast(e.message,'error')}}
  async function changeOwnPassword(){const u=auth().currentUser;if(!u)return;const current=prompt('กรอกรหัสผ่านปัจจุบัน');if(!current)return;const next=prompt('กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)');if(!next)return;if(next.length<6){toast('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัว','error');return;}try{const c=firebase.auth.EmailAuthProvider.credential(u.email,current);await u.reauthenticateWithCredential(c);await u.updatePassword(next);toast('เปลี่ยนรหัสผ่านบัญชีปัจจุบันสำเร็จ')}catch(e){toast(e.message||'เปลี่ยนรหัสไม่สำเร็จ','error')}}

  function bind(){
    $('fbAdminCreateForm')?.addEventListener('submit',createUser);
    $('fbAdminRefreshBtn')?.addEventListener('click',loadUsers);
    $('fbRefreshTokenBtn')?.addEventListener('click',refreshToken);
    $('fbReauthBtn')?.addEventListener('click',reauth);
    $('fbChangeOwnPasswordBtn')?.addEventListener('click',changeOwnPassword);
    $('fbAdminUsersList')?.addEventListener('change',e=>{const el=e.target.closest('.fb-user-role');if(el)changeRole(el.dataset.uid,el.value)});
    $('fbAdminUsersList')?.addEventListener('click',e=>{const t=e.target.closest('.fb-user-toggle');if(t)return toggle(t.dataset.uid);const r=e.target.closest('.fb-user-reset');if(r)return reset(r.dataset.uid);const f=e.target.closest('.fb-user-2fa');if(f)return reset2fa(f.dataset.uid);const d=e.target.closest('.fb-user-delete');if(d)return remove(d.dataset.uid)});
    document.querySelectorAll('[data-target="adminUsersSection"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(loadUsers,80)));
    auth().onAuthStateChanged(user=>{if(user)setTimeout(loadUsers,250)});
  }
  document.addEventListener('DOMContentLoaded',bind);
  window.RickCheeFirebaseUserManager={loadUsers};
})();
