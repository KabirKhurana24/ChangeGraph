# ChangeGraph role access matrix

| Capability | Admin | Product Owner | Engineer | QA Analyst | Business Stakeholder | Technical Writer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| View overview and requirements | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit business change request | ✓ | ✓ | — | — | ✓ | — |
| Create/edit requirements | ✓ | ✓ | — | — | Draft-only intake | — |
| Create/update backlog | ✓ | ✓ | ✓ | — | — | — |
| Execute QA scenarios | ✓ | ✓ | — | ✓ | — | — |
| Edit document drafts | ✓ | ✓ | — | — | — | ✓ |
| Approve release documentation | ✓ | ✓ | — | — | — | — |
| Export documentation and reports | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reset demo workspace | ✓ | ✓ | — | — | — | — |
| Manage workspace membership | ✓ | — | — | — | — | — |

Demo-role sessions use browser-local role state for quick portfolio demonstrations. Enterprise sessions are mapped from `workspace_members.role`. Client-side controls hide or block unavailable actions, while Supabase Row Level Security independently enforces write permissions at the database boundary.
