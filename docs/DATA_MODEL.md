# Core Data Model (Conceptual)

| Entity | Important attributes | Relationship |
|---|---|---|
| Workspace | id, name, timezone | Owns projects and members |
| Project | id, workspace_id, name, product_area | Contains releases and components |
| Release | id, project_id, version, target_date, gate_state | Groups requirements and work |
| ChangeRequest | id, project_id, title, business_problem, requester, priority, state | May create one or more requirements |
| Requirement | id, change_request_id, title, description, priority, status, owner, version | Links to components, stories and tests |
| AcceptanceCriterion | id, requirement_id, statement, sort_order | Belongs to one requirement |
| Component | id, project_id, name, type, owner_team, criticality | Participates in dependency edges |
| DependencyEdge | id, source_component_id, target_component_id, relation, evidence, confidence | Connects two components |
| WorkItem | id, requirement_id, title, owner, status, estimate, sprint_id | Implements requirement scope |
| TestCase | id, requirement_id, component_id, title, steps, expected_result | Validates one or more requirements |
| TestRun | id, test_case_id, environment, result, executed_at, evidence_ref | Records one execution |
| Defect | id, test_run_id, severity, owner, resolution_state | Can be linked to a requirement and component |
| Document | id, release_id, type, title, version, approval_state | Captures release knowledge |
| Approval | id, entity_type, entity_id, reviewer_id, decision, timestamp | Records human decision |
| ActivityEvent | id, actor_id, action, entity_type, entity_id, occurred_at | Audit/event history |

## Data integrity rules

- A requirement ID must be unique within its project.
- A work item must reference an existing requirement or an explicitly declared programme-level scope item.
- A test case may validate multiple requirements in a production system; the link should be represented by a junction table.
- A test case and test run must be separate records.
- Dependency edges must support direction and evidence provenance.
- Requirement and document revisions should be immutable versions, not destructive overwrites.
- Approvals must capture the exact entity version that was reviewed.
