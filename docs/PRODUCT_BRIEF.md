# ChangeGraph — Product Brief

## Product statement

ChangeGraph is a product-delivery workspace that makes enterprise change easier to reason about. It gives product owners a connected view of the intent behind a change, the system components it touches, the work needed to deliver it, the evidence needed to validate it and the documentation needed to release it.

## Problem

Enterprise product changes often enter through fragmented channels: stakeholder conversations, tickets, spreadsheets, architecture notes and email. Requirements can lose context as they move from business to product, engineering, QA and operations. A change to one component can also affect several downstream services, but the impact is not always visible during refinement.

Common failure modes include:

- Ambiguous requests reaching engineering without a shared business outcome.
- User stories that lack observable acceptance criteria or edge cases.
- Dependencies being discovered late, after implementation has started.
- QA cases that are not traceable to the requirement they validate.
- Release notes, user guides and training materials becoming stale.
- Product owners having no single view of readiness and unresolved risks.

## Target users

- Product owners and product analysts responsible for requirement quality and delivery coordination.
- Business analysts translating stakeholder needs into functional requirements.
- Engineering leads reviewing component impact, dependencies and implementation scope.
- QA leads maintaining acceptance tests and release evidence.
- Technical writers and operations teams preparing user-facing documentation and enablement.

## Primary jobs to be done

1. Capture a change request with its business context and expected outcome.
2. Turn the request into structured requirements and testable acceptance criteria.
3. Identify the services, APIs, data stores and teams potentially affected.
4. Break approved scope into prioritised, owned backlog items.
5. Trace requirements through implementation and QA validation.
6. Prepare reviewable release documentation and training content.
7. Understand what is ready, blocked or still needs a decision.

## MVP scope

- Release dashboard and readiness summary.
- Requirements register with details, status, priority, owner and acceptance criteria.
- Explicit component dependency map and change-impact preview.
- Lightweight backlog board with work-item status changes.
- QA matrix connected to requirement IDs.
- Release notes, user guide, integration overview and demo script.
- Local data persistence and downloadable reports.

## Out of scope for this prototype

- Production authentication, permissions, multi-tenant isolation and audit-grade event storage.
- Automatic source-code dependency discovery.
- Live Jira, Azure DevOps, GitHub or CI/CD integrations.
- Actual automated test execution or production release approvals.
- Real customer information or regulated data processing.

## Success measures for a production pilot

- Percentage of change requests with an explicit business outcome.
- Percentage of stories meeting a defined acceptance-criteria checklist before sprint entry.
- Percentage of requirements connected to component owners and QA scenarios.
- Number of dependency issues found before implementation versus during QA/release.
- Time from approved request to refinement-ready backlog.
- Release documentation completeness at the release gate.

## Product principles

- Keep the chain of evidence visible: request → requirement → component → work item → test → release artefact.
- Treat AI output as a proposal, never as an approval.
- Make uncertainty explicit: inferred impact must be distinguishable from verified dependency.
- Preserve human ownership for priority, risk acceptance and release decisions.
- Prefer clear, reviewable workflows over opaque automation.
