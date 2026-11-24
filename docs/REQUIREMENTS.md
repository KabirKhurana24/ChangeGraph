# Functional Requirements — ChangeGraph MVP

## CG-FR-01 · Change intake

The system shall allow a user to create a change request with a title, business problem, requester, proposed impacted component and business priority.

**Acceptance criteria**
- Title and business problem are mandatory.
- A new request receives a unique identifier.
- The request creates a draft requirement and a linked backlog work item.
- The requester and initial notes are retained in the local prototype state.

## CG-FR-02 · Requirements management

The system shall allow users to create, view, search, filter and edit requirements.

**Acceptance criteria**
- Each requirement has an ID, title, description, component, priority, status and owner.
- Acceptance criteria are stored as individually reviewable statements.
- Users can filter by status and priority.
- A requirement detail view shows linked backlog work and QA test cases.
- Changes to title, description, priority and status are persisted locally.

## CG-FR-03 · Dependency exploration

The system shall present the known component relationships for the selected initiative.

**Acceptance criteria**
- The graph displays all seven seeded components and their explicit relationships.
- Selecting a component displays its owner, type, description, dependency list and risk considerations.
- Users can navigate directly to a connected component.
- Impact preview identifies the selected source and connected components.
- The UI identifies the impact preview as an illustrative result based on the maintained map.

## CG-FR-04 · Backlog management

The system shall support work items linked to product requirements.

**Acceptance criteria**
- A work item includes an ID, title, linked requirement, owner, priority, estimate and status.
- Users can create work items.
- Users can update a work item's status.
- The board groups work by To do, In progress and In review / Done.

## CG-FR-05 · QA traceability

The system shall maintain test cases linked to requirement IDs.

**Acceptance criteria**
- Each test case includes an ID, name, linked requirement, component, owner, result and last-run label.
- Users can filter test cases by result.
- Users can record a simulated test pass.
- Users can export the test matrix as CSV.

## CG-FR-06 · Documentation

The system shall expose draft release notes, an operations guide, an integration overview and a demo/training script.

**Acceptance criteria**
- Documentation pages can be selected from a document library.
- Release notes reflect the current requirement statuses and recorded QA failures.
- Users can copy or download the active document as Markdown.
- Users can toggle the documentation approval state.

## CG-FR-07 · Workspace persistence

The system shall persist prototype changes in browser local storage.

**Acceptance criteria**
- Requirements, backlog items, tests, activity and user-selected view persist after refresh.
- Reset demo data restores the original seed state.
- Export functions create local JSON or CSV files.

## Non-functional considerations for production

- Accessibility: keyboard access, focus states, semantic controls and status text that does not rely on colour alone.
- Security: role-based access, server-side validation, secure session management and PII minimisation.
- Reliability: versioned change records, transaction-safe writes and recoverable integrations.
- Performance: virtualised tables for large workspaces and asynchronous graph rendering for large dependency maps.
- Auditability: immutable history for approvals, requirement changes, test evidence and release decisions.
