# Local and hosted setup

## Local Vite development

Use Node.js `20.19+` or `22.12+`.

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

The `dist/` directory is the static frontend output. Deploy it to Vercel or another static hosting provider. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_CHANGEGRAPH_WORKSPACE_ID` as deployment environment variables. Rebuild after changing them.

## Supabase

Apply `supabase/migrations/202611240001_changegraph_core.sql` to the project. Enable Email provider in Auth for password sign-in. For Microsoft SSO, configure the Azure provider and allowed redirect URLs in Supabase Auth. Create the first Product Owner/Admin and add their workspace membership before inviting other users.

Keep the service-role key only in a trusted server environment or local `.env.admin` for the provisioning script. It must never be added to `VITE_` variables or committed to source control.
