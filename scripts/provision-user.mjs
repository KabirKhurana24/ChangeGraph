import { createClient } from '@supabase/supabase-js';

const required = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','USER_EMAIL','USER_PASSWORD','USER_ROLE'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
const allowedRoles = ['workspace_admin','product_owner','engineer','qa_analyst','business_stakeholder','technical_writer'];
if (!allowedRoles.includes(process.env.USER_ROLE)) {
  console.error(`USER_ROLE must be one of: ${allowedRoles.join(', ')}`);
  process.exit(1);
}
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken:false, persistSession:false }
});
const email = process.env.USER_EMAIL.trim().toLowerCase();
const workspaceId = '11111111-1111-4111-8111-111111111111';
let user;
const { data: found, error: listError } = await admin.auth.admin.listUsers({ page:1, perPage:1000 });
if (listError) throw listError;
user = found.users.find(x => x.email?.toLowerCase() === email);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password:process.env.USER_PASSWORD,
    email_confirm:true,
    user_metadata:{ full_name:process.env.USER_DISPLAY_NAME || email.split('@')[0] }
  });
  if (error) throw error;
  user = data.user;
} else {
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password:process.env.USER_PASSWORD,
    user_metadata:{ ...user.user_metadata, full_name:process.env.USER_DISPLAY_NAME || user.user_metadata?.full_name || email.split('@')[0] }
  });
  if (error) throw error;
}
const { error: membershipError } = await admin.from('workspace_members').upsert({
  workspace_id:workspaceId,
  user_id:user.id,
  role:process.env.USER_ROLE,
  display_name:process.env.USER_DISPLAY_NAME || user.user_metadata?.full_name || email.split('@')[0]
},{ onConflict:'workspace_id,user_id' });
if (membershipError) throw membershipError;
console.log(`Provisioned ${email} as ${process.env.USER_ROLE} in Retail Banking workspace.`);
console.log('Password is set from USER_PASSWORD. Share it securely and ask the user to change it after first sign-in.');
