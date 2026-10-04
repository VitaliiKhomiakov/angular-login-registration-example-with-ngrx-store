# Project instructions

## Language and scope

Use English for reasoning, analysis, working notes, specifications and plans,
including progress/handoff records, unless the user explicitly requests another
artifact language. Write explanations, questions, progress updates and results
in the user's language (currently Russian). Preserve technical literals.

This is an English-language Angular + NgRx frontend teaching demo, not a complete
production authentication system or task-management product. It demonstrates
registration/login, session restoration, a guarded profile and task list/completion
flows using local Signal Forms, Angular Material and Store + functional Effects.
The browser MSW API uses public fixtures and page-local accounts/tasks; only the
session token persists in sessionStorage. Reload resets registered accounts and
task changes. Remote mode requires an external backend; no backend/database is
implemented here. Do not describe mock tokens or guards as server-side security.

[ARCHITECTURE.md](ARCHITECTURE.md) describes the current structure and boundaries.
Independent application sections auth and core live under app/features. Future
home/landing sections are examples only. Keep the demonstration small and explicit;
new product features, infrastructure or architecture require task-specific scope.

features/auth owns public auth pages and shared authentication data-access/Store/
guard. features/core owns the private layout/routes, pages/profile-page and the
cohesive tasks domain. Its lazy route group inherits canActivateChild protection;
physical nesting is not access control. Keep config/http/session at app root.
Auth must not import core; other sections must not import auth UI. Core pages/tasks
must not import parent core.routes/layout composition. Infrastructure must not
import sections. Root routing composes independent section entries; public future
home/landing must not accidentally inherit the core guard or layout.

features/auth and features/core/tasks use data-access/ for HTTP/contracts/validation
and a flat store/ for actions, Effects, reducers, selectors and feature/state files.
app.config.ts calls provideRootStore() from app/store/root-store.providers.ts once.
This root entry owns Store configuration/DevTools and eager auth state/Effects;
auth remains a feature. Task state/Effects register lazily in its tasks.routes.ts.
Keep root wiring out of features and lazy implementations out of root composition.
Do not add a features barrel that eagerly imports protected UI or Store code.

Routed leaf pages use feature-local pages/ and Page-suffixed classes/files:
LoginPage/SignUpPage in features/auth/pages, ProfilePage in features/core/pages,
TasksPage in features/core/tasks/pages. TaskItem stays in features/core/tasks/components.
Shared DOM/form test helpers live in src/testing; the auth state fixture stays in
features/auth/testing. Keep templates/styles/specs with their components.
SessionTokenStorage is the token-only persistence adapter. Feature API methods use
fresh apiRequestContext('public' | 'authenticated') metadata; shared HTTP validates
canonical unprefixed paths and applies the configured base/token policy. Unmarked
requests stay unchanged. Add endpoint validation/decoding in its feature, not a
central endpoint allowlist. ARCHITECTURE.md documents the extension contract.
Do not create a Store or empty layer folders automatically for each component.
Simple screens belong to section pages/; substantial domains keep their own
pages/components/data-access/store under the section. Do not scaffold home/landing
or split shared auth state before a real requirement. ARCHITECTURE.md describes section and domain growth.
Store + Effects remains the running example. SignalStore is a separate documented
comparison, without a second auth store or @ngrx/signals dependency. Local Signal
Forms and Angular Material are the selected UI. No Ionic/mobile runtime is used.

## Versions and Git

Choose the latest stable mutually compatible releases at implementation time,
when dependency changes are in scope, including Angular/CLI, NgRx, TypeScript,
RxJS, Node.js and tooling. For documentation-only work, describe the actual pinned
versions without upgrading them. Check official compatibility tables, release
status and package peers before upgrades.
Record exact versions in the lockfile, runtime/package-manager configuration and
the architecture documentation when implementing. Do not bypass incompatibility with forced installs.

Keep private working records and recovery copies outside the repository; do not
publish them through tracked files.
Work in the current checkout. No staging, commits, branches, stashes or worktrees
as automatic workflow steps. Finish the authorized logical stage, check it and
report for user review; further progression follows the user's authorization.
A skill or plan grants no Git permissions. Preserve existing user work.

## Planning and checkpoints

For substantive work, state the outcome, authorized scope, affected files,
contracts to preserve, logical steps and relevant checks. Keep the short plan in
the conversation unless the user requests a file. Reuse a user-supplied task record
instead of creating another. Do not add process artifacts to the repository by default.

Complete the authorized logical stage, report the result and stop for user review.
Do not infer authorization for unrelated follow-up work. Preserve original contents
or prior absence before edits, including local changes; keep recovery copies outside
the repository. Existing tests should be reused when they cover the changed contract.
Add tests for meaningful uncovered behavior, not every file or mechanical edit.

## Engineering and verification

- Read task-relevant code and project documentation. Keep changes within the agreed scope.
- Use strict TypeScript and strict Angular templates, named public boundary
  contracts, runtime validation of unknown input, and no `any`/`$any` or type-check
  bypasses. Node.js server rules apply only to actual server code; this app is CSR.
- Preserve original contents or prior absence before writing, including user edits.
  Reuse valid coverage/evidence; batch checks at the logical phase boundary.
  Intermediate checks require a concrete uncertainty, regression, selected TDD or gate.
  Preserve required project checks, report concise results and retain failure details.
  Documentation-only changes normally need artifact checks, not application tests.
- Review scoped changes and relevant interactions before claiming completion.
  Do not repeat reviews or broad suites without changed inputs, a required gate
  or a concrete concern. Report the actual checks and any limitations.

## Project map and skills

- [README.md](README.md): demo purpose, structure and launch commands.
- [ARCHITECTURE.md](ARCHITECTURE.md): owners, state, boundaries, extension rules and verification.
- `eslint.config.mjs` and `scripts/check-architecture.mjs`: executable import boundaries.

Use installed skills when relevant or requested. Project instructions override
skill defaults for automatic commits/worktrees, universal TDD, unconditional
reviewers and continuous progression. Work inline unless delegation is explicitly
requested. A skill does not authorize extra features, Git operations or model setup.
Reuse existing evidence for unchanged inputs, and stop after the authorized stage.
