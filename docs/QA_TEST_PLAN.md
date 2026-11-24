# QA Test Plan — ChangeGraph Prototype

## Core smoke tests

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| CG-QA-01 | Initial load | Open index.html | Overview loads with seeded release data |
| CG-QA-02 | Navigation | Open each left navigation item | Correct workspace view renders |
| CG-QA-03 | Search requirement | Search for `KYC` | Matching requirements remain visible |
| CG-QA-04 | Filter requirements | Select `In review` | Only In review requirements remain visible |
| CG-QA-05 | Open requirement | Select CG-101 | Detail drawer shows criteria, backlog links and tests |
| CG-QA-06 | Edit requirement | Edit CG-101 status and save | Requirement row and overview readiness update |
| CG-QA-07 | New requirement | Create a requirement with title and description | New ID appears and linked backlog item is created when selected |
| CG-QA-08 | Change intake | Submit a new change request | Draft requirement and backlog item are created |
| CG-QA-09 | Dependency selection | Select KYC Service | Component details and direct dependencies update |
| CG-QA-10 | Impact analysis | Run impact analysis | Modal lists connected components and limitations |
| CG-QA-11 | Backlog status | Open BL-202 and change status | Board grouping updates after save |
| CG-QA-12 | QA filter | Filter by Failed | Seeded QA-104 is visible |
| CG-QA-13 | QA demo run | Run QA-104 | Result is recorded as Passed in prototype state |
| CG-QA-14 | Documentation selection | Open each doc page | Relevant document content renders |
| CG-QA-15 | Markdown export | Download active documentation | A .md file is downloaded |
| CG-QA-16 | Persistence | Change a work item, refresh browser | Local workspace changes remain |
| CG-QA-17 | Reset | Profile menu → Reset demo data | Original seed data returns |

## Manual validation notes

- Test desktop and narrow mobile layouts.
- Confirm horizontal table scrolling on narrow viewports.
- Confirm all modal and drawer close paths work.
- Verify CSV exports open in spreadsheet software.
- Confirm keyboard Escape closes dialogs and Ctrl/⌘ + K opens search.
- Check browser console for errors during the walkthrough.

## Known limitations

Test execution is simulated. The current prototype does not validate API responses, persistence transactions, access controls or backend security.
