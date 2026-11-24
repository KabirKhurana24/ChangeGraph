# 12-Minute Product Demonstration Script

## Audience

Ascendion-style technical product owner / product analyst interview panel: product, engineering, QA and business stakeholders.

## Scenario

A retail bank wants to introduce joint-account onboarding. The primary applicant must add a second applicant. Both applicants need independent KYC and document handling, while the final account must be created with the correct ownership structure.

## Walkthrough

### 1. Start with the release overview — 2 minutes

- Explain the business objective and release target.
- Show requirement count, QA state, dependency map and open attention items.
- Explain that readiness is an illustrative prototype indicator, not a production release gate.

### 2. Inspect a requirement — 2 minutes

- Open CG-101.
- Explain the business context, scope, owner, status and acceptance criteria.
- Show how the requirement links to backlog work and QA scenarios.
- Highlight that acceptance criteria should be observable and testable.

### 3. Walk the dependency graph — 2 minutes

- Select Onboarding UI.
- Navigate to KYC Service and Customer Profile.
- Explain the applicant identity boundary and why KYC retries must be idempotent.
- Select Core Banking API and discuss duplicate account creation and contract validation risks.
- Run the impact preview and clarify that it uses the prototype's maintained dependency map.

### 4. Review delivery work — 2 minutes

- Open the backlog.
- Show To do, In progress, In review and Done groupings.
- Open BL-202 and update its status.
- Explain how the linked requirement gives engineering context.

### 5. Demonstrate QA traceability — 2 minutes

- Open QA-104 and explain the seeded KYC retry failure.
- Discuss the expected idempotency behaviour and the engineering follow-up.
- Use Run test to record a simulated pass and show the readiness indicator update.

### 6. Close with documentation — 2 minutes

- Open release notes, the operations guide and integration overview.
- Explain how docs should be validated by technical writers and business owners.
- Download the release notes as Markdown.
- Close with next steps: real API contracts, CI test integration, access controls and formal release approvals.

## Interview positioning

Describe the work as a product prototype built to demonstrate the delivery chain from stakeholder intent to requirements, dependency analysis, backlog, QA evidence and documentation. Be explicit that the current build uses local demo data and simulated QA actions.
