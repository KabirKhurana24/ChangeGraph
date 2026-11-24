# ChangeGraph 2.0 — Architecture

## Runtime architecture

```text
Browser
  ├── Vite dev server / production bundle
  ├── ChangeGraph workspace SPA (existing view and workflow modules)
  ├── Sign-in gateway and role-aware interaction controls
  └── Supabase JS client (public key only)
          ├── Supabase Auth (email/password, optional Azure OAuth)
          └── Supabase Data API
                  └── PostgreSQL + row-level security
```

The current UI has been retained as a lightweight JavaScript single-page workspace and moved behind a Vite build and development server. It is intentionally not represented as a React application: Vite does not require React, and preserving the existing working workflows avoids an unnecessary rewrite. React/TypeScript can be introduced incrementally when the component model and test coverage justify it.

## Roles

- `workspace_admin`: workspace membership and full access.
- `product_owner`: requirements, change intake, backlog, QA administration, release approval and workspace preferences.
- `engineer`: backlog creation and updates.
- `qa_analyst`: QA test execution and updates.
- `business_stakeholder`: submit new Draft requirements/change requests; read the workspace.
- `technical_writer`: maintain technical and release document drafts.

The front end hides or blocks actions for the current role. PostgreSQL RLS is the enforcement layer; client-side role checks are not a security boundary.

## Data model

- Workspace and membership scope: `workspaces`, `workspace_members`.
- Component catalogue and directional links: `components`, `component_dependencies`.
- Product definition: `requirements` with structured acceptance criteria and linked test IDs.
- Delivery planning: `backlog_items` linked to requirements.
- Quality evidence: `qa_test_cases` linked to requirements and components.
- Release controls: `workspace_preferences`, `workspace_documents`.
- Workspace activity: `activity_events`.

## Persistence strategy

Without Supabase environment variables, demo roles use browser local storage. With Supabase configured, enterprise users load and persist their role-authorised data to relational PostgreSQL tables. The Product Owner/Admin seeds the initial demo data into the shared database on first sign-in. A real production implementation should move complex multi-table operations behind a transactional server-side API or Postgres RPCs, and should use immutable audit and version records for regulated delivery.

## Security notes

- Use the public anon/publishable key in the Vite client.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- Enable RLS on every exposed table; the migration creates role-scoped policies.
- Create enterprise memberships through an administrator workflow.
- Microsoft OAuth requires Azure provider setup in Supabase Auth.
