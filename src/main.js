import '../styles.css';
import './auth.css';
import { createClient } from '@supabase/supabase-js';

const env = import.meta.env;
const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';
const WORKSPACE_ID = env.VITE_CHANGEGRAPH_WORKSPACE_ID || '11111111-1111-4111-8111-111111111111';
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

const roleConfig = {
  product_owner: { label: 'Product Owner', name: 'Kabir Khurana', email: 'kabir@changegraph.demo', initials: 'KK', description: 'Full product delivery ownership', color: 'blue', permissions: ['requirements.write','change.create','backlog.write','qa.execute','docs.approve','docs.export','workspace.admin'] },
  engineer: { label: 'Software Engineer', name: 'Arjun Mehta', email: 'arjun@changegraph.demo', initials: 'AM', description: 'Engineering backlog and delivery execution', color: 'violet', permissions: ['backlog.write','docs.export'] },
  qa_analyst: { label: 'QA Analyst', name: 'Priya Nair', email: 'priya@changegraph.demo', initials: 'PN', description: 'Test execution and quality validation', color: 'green', permissions: ['qa.execute','docs.export'] },
  business_stakeholder: { label: 'Business Stakeholder', name: 'Maya Kapoor', email: 'maya@changegraph.demo', initials: 'MK', description: 'Business visibility and change requests', color: 'amber', permissions: ['change.create','docs.export'] },
  technical_writer: { label: 'Technical Writer', name: 'Nina Shah', email: 'nina@changegraph.demo', initials: 'NS', description: 'Release and technical documentation', color: 'cyan', permissions: ['docs.export','docs.write'] },
  workspace_admin: { label: 'Workspace Admin', name: 'Alex Morgan', email: 'alex@changegraph.demo', initials: 'AM', description: 'Workspace administration and full access', color: 'slate', permissions: ['requirements.write','change.create','backlog.write','qa.execute','docs.approve','docs.export','docs.write','workspace.admin'] }
};
const currentUser = () => window.CG_SESSION || null;
const can = (permission) => !!currentUser()?.permissions?.includes(permission);
window.CG_AUTH = { roleConfig, can, get user() { return currentUser(); }, get isConnected() { return !!supabase; } };

// Local demo is deliberately isolated from real enterprise authentication.
// When Supabase credentials exist, user identity and membership come from Supabase Auth + RLS.
let saveTimer;
const persistedStakeholderRequests = new Set();
const persistedActivityIds = new Set();
const mapReqFromDb = r => ({ id:r.id, title:r.title, description:r.description, component:r.component_key, priority:r.priority, status:r.status, owner:r.owner, criteria:r.criteria || [], tests:r.test_ids || [], created:r.created_label || '', requester:r.requester || '', notes:r.notes || '' });
const mapTaskFromDb = t => ({ id:t.id, title:t.title, requirement:t.requirement_id, status:t.status, priority:t.priority, owner:t.owner, points:t.points });
const mapTestFromDb = t => ({ id:t.id, name:t.name, requirement:t.requirement_id, component:t.component_key, result:t.result, owner:t.owner, lastRun:t.last_run || 'Not run' });
const mapActivityFromDb = a => ({ id:a.id, initials:a.initials || 'CG', text:a.content || '', time:a.display_time || 'Recently' });

async function loadWorkspaceState() {
  if (!supabase || currentUser()?.isDemo) return null;
  const [reqs,tasks,tests,activities,prefs,documents] = await Promise.all([
    supabase.from('requirements').select('*').eq('workspace_id',WORKSPACE_ID).order('created_at',{ascending:false}),
    supabase.from('backlog_items').select('*').eq('workspace_id',WORKSPACE_ID).order('created_at',{ascending:false}),
    supabase.from('qa_test_cases').select('*').eq('workspace_id',WORKSPACE_ID).order('created_at',{ascending:false}),
    supabase.from('activity_events').select('*').eq('workspace_id',WORKSPACE_ID).order('created_at',{ascending:false}).limit(20),
    supabase.from('workspace_preferences').select('*').eq('workspace_id',WORKSPACE_ID).maybeSingle(),
    supabase.from('workspace_documents').select('*').eq('workspace_id',WORKSPACE_ID)
  ]);
  for (const result of [reqs,tasks,tests,activities,prefs,documents]) if (result.error) throw result.error;
  (reqs.data || []).forEach(r => persistedStakeholderRequests.add(r.id));
  (activities.data || []).forEach(a => persistedActivityIds.add(a.id));
  if (!reqs.data?.length && !tasks.data?.length && !tests.data?.length) return null;
  return {
    requirements:(reqs.data || []).map(mapReqFromDb), tasks:(tasks.data || []).map(mapTaskFromDb),
    tests:(tests.data || []).map(mapTestFromDb), activities:(activities.data || []).map(mapActivityFromDb),
    docsApproved:prefs.data?.docs_approved || false, doc:prefs.data?.selected_doc || 'release',
    docOverrides:Object.fromEntries((documents.data || []).map(d => [d.document_key,d.markdown]))
  };
}

async function saveWorkspaceState(state) {
  const user = currentUser();
  if (!supabase || !user || user.isDemo) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const role = user.role;
    const isOwner = ['workspace_admin','product_owner'].includes(role);
    const requirements = (state.requirements || []).map(r => ({
      workspace_id:WORKSPACE_ID,id:r.id,title:r.title,description:r.description,component_key:r.component,priority:r.priority,status:r.status,owner:r.owner,
      criteria:r.criteria || [],test_ids:r.tests || [],created_label:r.created || '',requester:r.requester || null,notes:r.notes || null,created_by:user.id
    }));
    const tasks = (state.tasks || []).map(t => ({ workspace_id:WORKSPACE_ID,id:t.id,title:t.title,requirement_id:t.requirement,status:t.status,priority:t.priority,owner:t.owner,points:t.points,created_by:user.id }));
    const tests = (state.tests || []).map(t => ({ workspace_id:WORKSPACE_ID,id:t.id,name:t.name,requirement_id:t.requirement,component_key:t.component,result:t.result,owner:t.owner,last_run:t.lastRun || 'Not run',created_by:user.id }));
    const activities = (state.activities || []).slice(0,20).map(a => { a.id ||= `evt-${crypto.randomUUID()}`; return { workspace_id:WORKSPACE_ID,id:a.id,initials:a.initials || 'CG',content:a.text || '',display_time:a.time || 'Recently',actor_id:user.id }; });
    const check = (result) => { if(result?.error) throw result.error; };
    try {
      // Parent rows are saved before child rows to respect the relational foreign keys.
      if (isOwner) {
        check(await supabase.from('requirements').upsert(requirements,{onConflict:'workspace_id,id'}));
        check(await supabase.from('backlog_items').upsert(tasks,{onConflict:'workspace_id,id'}));
        check(await supabase.from('qa_test_cases').upsert(tests,{onConflict:'workspace_id,id'}));
        check(await supabase.from('workspace_preferences').upsert({workspace_id:WORKSPACE_ID,docs_approved:!!state.docsApproved,selected_doc:state.doc || 'release'},{onConflict:'workspace_id'}));
      } else if (role === 'engineer') {
        check(await supabase.from('backlog_items').upsert(tasks,{onConflict:'workspace_id,id'}));
      } else if (role === 'qa_analyst') {
        check(await supabase.from('qa_test_cases').upsert(tests,{onConflict:'workspace_id,id'}));
      } else if (role === 'business_stakeholder') {
        // Stakeholders may create new Draft requests, never update existing requirements.
        const pending = requirements.filter(r => Number(String(r.id).split('-')[1]) > 110 && r.status === 'Draft' && !persistedStakeholderRequests.has(r.id));
        if (pending.length) {
          check(await supabase.from('requirements').insert(pending));
          pending.forEach(r => persistedStakeholderRequests.add(r.id));
        }
      }
      if (role === 'technical_writer' || isOwner) {
        for (const [key,markdown] of Object.entries(state.docOverrides || {})) {
          check(await supabase.from('workspace_documents').upsert({workspace_id:WORKSPACE_ID,document_key:key,title:key,markdown,version:1,updated_by:user.id},{onConflict:'workspace_id,document_key'}));
        }
      }
      const newActivities = activities.filter(a => !persistedActivityIds.has(a.id));
      if (newActivities.length) {
        check(await supabase.from('activity_events').insert(newActivities));
        newActivities.forEach(a => persistedActivityIds.add(a.id));
      }
    } catch (error) {
      console.error('ChangeGraph database save failed:',error.message);
      showWorkspaceNotice(`Database save failed: ${error.message}`);
    }
  },700);
}

window.CGDB = { enabled:!!supabase, load:loadWorkspaceState, save:saveWorkspaceState, workspaceId:WORKSPACE_ID };

const roles = Object.entries(roleConfig);
const authRoot = document.getElementById('auth-root');
const appRoot = document.getElementById('app');

function renderLogin(error = '') {
  const configured = !!supabase;
  authRoot.innerHTML = `
    <div class="auth-page">
      <div class="auth-ambient auth-ambient-one"></div><div class="auth-ambient auth-ambient-two"></div>
      <section class="auth-brand-panel">
        <div class="auth-brand-lockup"><div class="brand-mark"><svg viewBox="0 0 32 32"><path d="M8 8.5 16 4l8 4.5v9L16 28l-8-4.5z"/><path d="m8 8.5 8 4.7 8-4.7M16 13.2V28M8 17l8 4.5 8-4.5"/></svg></div><div><div class="brand-name">ChangeGraph</div><div class="brand-caption">PRODUCT DELIVERY OS</div></div></div>
        <div class="auth-hero-copy"><div class="auth-eyebrow"><span></span> ENTERPRISE PRODUCT OPERATIONS</div><h1>Turn every change<br>into a <em>clear path</em><br>to delivery.</h1><p>Connect business intent, requirements, engineering dependencies, QA evidence and release decisions in one governed workspace.</p>
          <div class="auth-proof-grid"><div><strong>01</strong><span>Requirements<br>to delivery</span></div><div><strong>02</strong><span>Change impact<br>visibility</span></div><div><strong>03</strong><span>Release evidence<br>and controls</span></div></div>
        </div>
        <div class="auth-brand-footer"><span>CHANGEGRAPH / 2.0</span><span>SECURE WORKSPACE ACCESS</span></div>
      </section>
      <section class="auth-form-panel"><div class="auth-form-wrap">
        <div class="auth-mobile-brand"><div class="brand-mark"><svg viewBox="0 0 32 32"><path d="M8 8.5 16 4l8 4.5v9L16 28l-8-4.5z"/><path d="m8 8.5 8 4.7 8-4.7M16 13.2V28"/></svg></div><b>ChangeGraph</b></div>
        <div class="auth-kicker">WELCOME TO YOUR WORKSPACE</div><h2>Sign in to ChangeGraph</h2><p class="auth-intro">Access your team's product delivery workspace.</p>
        <div class="auth-tabs"><button class="auth-tab active" data-auth-tab="demo">Explore demo</button><button class="auth-tab" data-auth-tab="enterprise">Enterprise sign in</button></div>
        <div id="auth-error" class="auth-error" ${error?'':'hidden'}>${escapeHtml(error)}</div>
        <div id="demo-panel" class="auth-panel-content">
          <div class="demo-callout"><span class="demo-shield">✓</span><div><strong>Sandbox environment</strong><span>Choose a role to explore the product with role-specific access.</span></div></div>
          <div class="demo-role-grid">${roles.map(([key,r])=>`<button class="demo-role-card" data-demo-role="${key}"><span class="role-avatar ${r.color}">${r.initials}</span><span class="role-copy"><strong>${r.label}</strong><small>${r.description}</small></span><span class="role-arrow">↗</span></button>`).join('')}</div>
          <div class="auth-footnote"><span class="footnote-dot"></span>Demo data is synthetic and changes are saved in this browser only.</div>
        </div>
        <div id="enterprise-panel" class="auth-panel-content" hidden>
          ${configured ? `<form id="enterprise-login-form" class="enterprise-form"><label>Work email</label><input name="email" type="email" placeholder="you@company.com" required autocomplete="username"/><label>Password</label><input name="password" type="password" placeholder="Enter your password" required autocomplete="current-password"/><button class="auth-primary" type="submit">Sign in securely <span>→</span></button></form><div class="auth-divider"><span>OR</span></div><button class="auth-sso" id="microsoft-sso"><span class="microsoft-mark"><i></i><i></i><i></i><i></i></span>Continue with Microsoft</button><p class="auth-config-note">Enterprise authentication is connected to your Supabase Auth project. Workspace membership and permissions are checked after sign-in.</p>` : `<div class="setup-required"><div class="setup-icon">⌁</div><strong>Enterprise identity not connected yet</strong><p>Add your Supabase project URL and anon key to <code>.env.local</code>, run the included database migration and invite your team. Demo roles are available now.</p><div class="setup-check"><span>1</span> Configure Supabase Auth</div><div class="setup-check"><span>2</span> Apply database migrations</div><div class="setup-check"><span>3</span> Add workspace memberships</div><button class="auth-primary" data-auth-tab="demo">Explore demo roles instead <span>→</span></button></div>`}
        </div>
        <div class="auth-legal"><span>© 2026 ChangeGraph</span><span>Privacy · Security · Help</span></div>
      </div></section>
    </div>`;
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function showAuthError(message){const el=document.getElementById('auth-error');if(el){el.textContent=message;el.hidden=false;}}
function setActiveTab(tab){document.querySelectorAll('.auth-tab').forEach(x=>x.classList.toggle('active',x.dataset.authTab===tab));document.getElementById('demo-panel').hidden=tab!=='demo';document.getElementById('enterprise-panel').hidden=tab!=='enterprise';}

async function enterWorkspace(user, isDemo = false) {
  window.CG_SESSION = { ...user, isDemo };
  if (isDemo) localStorage.setItem('changegraph-demo-session',JSON.stringify(window.CG_SESSION));
  else localStorage.removeItem('changegraph-demo-session');
  authRoot.innerHTML = '';
  appRoot.hidden = false;
  document.body.classList.add('workspace-active');
  const identity = window.CG_SESSION;
  const role = roleConfig[identity.role] || roleConfig.product_owner;
  document.getElementById('sidebar-user-avatar').textContent = identity.initials || role.initials;
  document.getElementById('sidebar-user-name').textContent = identity.displayName || identity.name || role.name;
  document.getElementById('sidebar-user-role').textContent = role.label;
  document.getElementById('top-user-avatar').textContent = identity.initials || role.initials;
  document.getElementById('environment-chip').textContent = isDemo ? 'DEMO ENVIRONMENT' : 'ENTERPRISE WORKSPACE';
  document.getElementById('environment-chip').classList.toggle('enterprise',!isDemo);
  try {
    const dbState = await window.CGDB.load();
    if (dbState && window.hydrateChangeGraphState) window.hydrateChangeGraphState(dbState);
    else if (!isDemo && window.CGDB.enabled && window.saveCurrentChangeGraphState) window.saveCurrentChangeGraphState();
  } catch (err) { console.error(err); showWorkspaceNotice('Database sync unavailable. Your current session is active, but edits may not be saved to the server.'); }
  window.applyChangeGraphRole?.();
  const landing={product_owner:'overview',workspace_admin:'overview',engineer:'backlog',qa_analyst:'qa',business_stakeholder:'overview',technical_writer:'documentation'};
  if (window.setChangeGraphView) window.setChangeGraphView(landing[identity.role] || 'overview');
}
function showWorkspaceNotice(message){const host=document.getElementById('toast-root');if(!host)return;const el=document.createElement('div');el.className='toast';el.textContent=message;host.appendChild(el);setTimeout(()=>el.remove(),5200);}
function signOut(){const isDemo=window.CG_SESSION?.isDemo;window.CG_SESSION=null;localStorage.removeItem('changegraph-demo-session');if(!isDemo&&supabase)supabase.auth.signOut().catch(err=>console.error('Sign-out failed',err));appRoot.hidden=true;document.body.classList.remove('workspace-active');renderLogin();}
window.CG_SIGN_OUT = signOut;

// Run the existing rich workspace inside Vite; the sign-in gate stays visible until access is granted.
await import('../app.js');

// Role enforcement is both a UI affordance and an interaction guard. The production database applies RLS too.
const actionPermissions = {
  'new-change':'change.create','add-requirement':'requirements.write','add-task':'backlog.write',
  'approve-docs':'docs.approve','run-all-tests':'qa.execute','export-qa':'docs.export','edit-doc':'docs.write','save-doc':'docs.write','reset-demo':'workspace.admin'
};
function permissionForTarget(target){
  const action = target.closest('[data-action]')?.dataset.action;
  if (action && actionPermissions[action]) return actionPermissions[action];
  if (target.closest('[data-edit-req]')) return 'requirements.write';
  if (target.closest('[data-save-task]')) return 'backlog.write';
  if (target.closest('[data-run-test]')) return 'qa.execute';
  const formBtn = target.closest('[data-submit-form]');
  if (formBtn) return ({'requirement-form':'requirements.write','change-form':'change.create','task-form':'backlog.write','edit-req-form':'requirements.write'})[formBtn.dataset.submitForm];
  return null;
}
function applyRoleUI(){
  const user=currentUser(); if(!user)return;
  document.querySelectorAll('[data-action]').forEach(el=>{const p=actionPermissions[el.dataset.action];if(p)el.hidden=!can(p)});
  document.querySelectorAll('[data-edit-req]').forEach(el=>el.hidden=!can('requirements.write'));
  document.querySelectorAll('[data-run-test]').forEach(el=>el.hidden=!can('qa.execute'));
  document.querySelectorAll('[data-save-task]').forEach(el=>el.hidden=!can('backlog.write'));
  document.querySelectorAll('[data-action="edit-doc"],[data-action="save-doc"]').forEach(el=>el.hidden=!can('docs.write'));
  document.querySelectorAll('[data-submit-form]').forEach(el=>{const p=({'requirement-form':'requirements.write','change-form':'change.create','task-form':'backlog.write','edit-req-form':'requirements.write'})[el.dataset.submitForm];if(p)el.hidden=!can(p)});
  // Landing pages are selected to make each role's demo immediately relevant.
  document.querySelectorAll('.nav-item[data-view]').forEach(el=>{el.disabled=false;el.title=''});
  if(window.CG_SESSION?.role==='business_stakeholder') document.querySelectorAll('[data-action="new-change"]').forEach(el=>{el.textContent='Submit change request';});
}
window.applyChangeGraphRole=applyRoleUI;

document.addEventListener('click',e=>{
  const target=e.target.closest('button,[data-action],[data-edit-req],[data-run-test],[data-save-task],[data-submit-form]');
  if(!target)return;
  if(target.dataset.authTab){setActiveTab(target.dataset.authTab);return;}
  if(target.dataset.demoRole){const role=roleConfig[target.dataset.demoRole];if(!role)return;enterWorkspace({id:`demo-${target.dataset.demoRole}`,displayName:role.name,name:role.name,email:role.email,initials:role.initials,role:target.dataset.demoRole,permissions:role.permissions,workspaceName:'Retail Banking'},true);return;}
  if(target.id==='microsoft-sso'){if(!supabase){showAuthError('Connect Supabase and configure the Azure provider to enable Microsoft SSO.');return;}supabase.auth.signInWithOAuth({provider:'azure',options:{redirectTo:window.location.origin,scopes:'email openid profile'}}).then(({error})=>{if(error)showAuthError(error.message)});return;}
  if(target.dataset.action==='logout'){signOut();return;}
  const permission=permissionForTarget(target);
  if(permission && !can(permission)){e.preventDefault();e.stopImmediatePropagation();showWorkspaceNotice(`This action requires ${permission.replace('.',' ')} access. Current role: ${roleConfig[currentUser()?.role]?.label || 'Viewer'}.`);return;}
},true);

document.addEventListener('submit',async e=>{
  if(e.target.id!=='enterprise-login-form')return;
  e.preventDefault();if(!supabase){showAuthError('Connect Supabase to enable enterprise sign-in.');return;}
  const fd=new FormData(e.target);const submit=e.target.querySelector('button[type="submit"]');if(submit){submit.disabled=true;submit.textContent='Signing in…';}
  const {data,error}=await supabase.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});
  if(error){showAuthError(error.message);if(submit){submit.disabled=false;submit.innerHTML='Sign in securely <span>→</span>';}return;}
  await finishEnterpriseSignIn(data.user);
});

async function finishEnterpriseSignIn(authUser){
  if(!authUser)return;
  const {data:membership,error}=await supabase.from('workspace_members').select('role,display_name').eq('workspace_id',WORKSPACE_ID).eq('user_id',authUser.id).maybeSingle();
  if(error || !membership){await supabase.auth.signOut();renderLogin('Your account is not a member of the ChangeGraph workspace. Ask a workspace administrator for access.');return;}
  const role = roleConfig[membership.role] ? membership.role : 'business_stakeholder';
  const name=membership.display_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Workspace user';
  await enterWorkspace({id:authUser.id,displayName:name,email:authUser.email,initials:name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase(),role,permissions:roleConfig[role].permissions,workspaceName:'Retail Banking'},false);
}

if(supabase){
  const {data:{session}}=await supabase.auth.getSession();
  if(session?.user) await finishEnterpriseSignIn(session.user);
  supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN' && session?.user && !currentUser()) finishEnterpriseSignIn(session.user);});
}
if(!currentUser()){
  const saved=localStorage.getItem('changegraph-demo-session');
  if(saved){try{const parsed=JSON.parse(saved);if(roleConfig[parsed.role]) await enterWorkspace({...parsed,permissions:roleConfig[parsed.role].permissions},true);else renderLogin();}catch{renderLogin();}}
  else renderLogin();
}
