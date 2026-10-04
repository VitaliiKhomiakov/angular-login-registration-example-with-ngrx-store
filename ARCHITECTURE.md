# Angular + NgRx demonstration

## Purpose and scope

This standalone CSR demo teaches Angular and NgRx Store + Effects through login,
registration, profile and task flows. Local Signal Forms and Angular Material
provide the UI. The example favors explicit state transitions and clear ownership
over a complete product feature set. SignalStore remains a documentation-only
comparison; it is not a dependency or a second state implementation.

Independent application sections live under features/: auth and core. Core owns
protected routes/layout, its profile page and the nested tasks domain. Future
home/landing sections can be siblings with their own access policies. The private
route group inherits canActivateChild protection.

features/core/tasks owns DTOs/HTTP adapter, feature Store/Effects, smart TasksPage
and presentational TaskItem. tasksRoutes registers its slice/Effects lazily;
CoreLayout owns private navigation/outlet/logout. The root component hosts the
router outlet; section navigation belongs to the private layout.

The active application is standalone CSR with local Signal Forms and one auth
Store/Effects owner at root. Lazy routes provide `/auth/login`, `/auth/sign-up`
and `/profile` / `/tasks` inside a lazy private group guarded with canActivateChild; `/core/my-day` redirects to `/profile`, root/fallback to
login. Views read Store selectors through selectSignal, retain drafts after errors,
block pending submits and reset drafts when destroyed on navigation. Profile shows
validated user data; CoreLayout owns logout. My tasks shows confirmed completion
commands, local filters and derived counts; restoration error/retry remains on login.
Bootstrap restores once after Effects registration. MSW starts before bootstrap;
there are no private-config requests, active Ionic/mobile dependencies or Zone.js.
Angular 22 defaults to OnPush and zoneless. One global Material theme uses the
public Sass API; component SCSS remains colocated with emulated encapsulation.

## Project map

| Path                                                                                                                | Responsibility                                                                                            |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/main.ts`, `src/app/app.ts`                                                                                     | Standalone bootstrap and root component                                                                   |
| `src/app/app.config.ts`, `src/app/app.routes.ts`                                                                    | Application providers and routing                                                                         |
| `src/app/store/root-store.providers.ts`, colocated spec                                                             | Root Store composition, eager auth registration, runtime checks and development diagnostics               |
| `src/app/features/auth/pages/login-page/`, `features/auth/pages/sign-up-page/`, `features/core/pages/profile-page/` | Signal Forms, Material views and colocated DOM/integration tests                                          |
| `src/app/features/core/core.routes.ts`, `features/core/layout/`                                                     | Authenticated child routes and shared private navigation/outlet/logout; root retains canActivateChild     |
| `src/styles.scss`, component SCSS                                                                                   | Single Material theme/base styles and scoped presentation                                                 |
| `public/`                                                                                                           | Static assets, including the generated MSW worker                                                         |
| `src/app/config/`                                                                                                   | Validated shared demo/remote settings and DI token                                                        |
| `src/app/http/`, `session/`                                                                                         | Explicit API request policy/interceptor and token-only storage adapter                                    |
| `src/app/features/auth/data-access/`                                                                                | AuthApi, readonly DTO contracts and runtime decoders/validation                                           |
| `src/app/features/auth/store/`                                                                                      | Flat actions/effects/reducer/selectors, AuthState/authFeature, DevTools sanitizer and colocated tests     |
| `src/app/features/auth/routing/`, `features/auth/testing/`                                                          | Session guard and reusable test-only helpers                                                              |
| `src/app/features/core/tasks/data-access/`                                                                          | Task DTOs/unknown decoders and stateless root-injectable TasksApi                                         |
| `src/app/features/core/tasks/store/`                                                                                | Flat actions/effects/reducer/selectors, TasksState/tasksFeature and real HTTP concurrency/reset tests     |
| `src/app/features/core/tasks/tasks.routes.ts`                                                                       | Lazy-route provideState/provideEffects in the one root Store; explicit page/session reset                 |
| `src/app/features/core/tasks/pages/tasks-page/`, `tasks/components/task-item/`                                      | Direct selectSignal + local filter, smart page and typed presentational row                               |
| `src/mocks/`                                                                                                        | Worker startup, isolated fixtures and HTTP handlers                                                       |
| `e2e/mock-api.spec.ts`, `e2e/tasks-api.spec.ts`, `e2e/build-modes.spec.ts`                                          | Real-worker API contracts, task ownership/update checks, optimized demo and remote lifecycle              |
| `src/app/app.spec.ts`                                                                                               | Real router/provider component checks under zoneless Vitest                                               |
| `e2e/shell.spec.ts`, `forms.spec.ts`, `tasks.spec.ts`                                                               | Ordinary-bootstrap session/routing, tasks/account switching and keyboard/forms/focus/mobile checks        |
| `e2e/auth.spec.ts`, `auth-bootstrap.ts`, `auth-browser-contracts.ts`                                                | Real Store/Effects/MSW acceptance with test-only response gates/logout handle                             |
| `playwright.config.ts`, `tsconfig.acceptance.json`, acceptance Angular configuration                                | Separate test entry on port 4202; regular dev remains 4200, optimized checks 4201; isolated trace outputs |

There is no backend in this repository. Browser MSW supplies demo HTTP responses;
e2e/serve-builds.ts only serves static artifacts for lifecycle tests.

## Runtime and demo boundaries

Exact versions are recorded in package.json/package-lock.json. The configured runtime is Node 26.10.0/npm 12.2.0 via
.nvmrc, packageManager and .npmrc. Angular/CLI are 22.2.1, NgRx 22.0.1,
Material/CDK 22.2.1, TypeScript 6.0.3 and RxJS 7.8.2. These are project pins;
this document does not claim they are the latest available versions.

Both ordinary development and the default optimized build use demo mode. MSW
starts before Angular and intercepts browser HTTP; it exposes no standalone API
server. DemoAccounts/DemoTasks in src/mocks own page-local records. Reload resets
registered accounts and task changes. sessionStorage contains only the token:
the seeded account can restore, while a removed page-local account receives 401.
The mocks demonstrate request contracts and account isolation, not production
authentication, durable storage or a backend authorization service.

Remote configuration replaces app-settings.ts with app-settings.remote.ts and
starts no mocks. Its default /api requires an external backend or reverse proxy.
Frontend guards and request context do not replace server authorization. The
static e2e server selects built artifacts for browser checks; it is not that backend.

Task scope is deliberately limited to list/filter/completion updates. There is no
task creation/deletion, title editing, durable database or cross-tab session sync.
Home/landing are possible independent sections, not current features. Do not add
extra Stores, service wrappers or empty layers solely to resemble a larger system.

## Checks and evidence boundary

`npm run typecheck` checks all active application, component-test and browser-test
TypeScript. `npm run lint` uses typed ESLint and Angular template rules.
`npm run format:check` checks the Prettier convention without edits;
`npm run format` applies it. EditorConfig supplies common editor settings.
`npm test -- --watch=false` runs Angular's Vitest builder; `npm run build` compiles
production templates/bundles; `npm run e2e` starts a dev server and Chromium smoke.
Tests cover API contracts, state transitions, request cancellation, restoration,
route protection, account isolation and lazy task registration/reentry. Browser
scenarios exercise ordinary UI/worker flows and deterministic auth acceptance.
`npm run e2e:builds` checks optimized demo/remote builds at a subpath, including
demo-to-remote reload and startup failure. Install the browser with
`npx playwright install chromium` before running browser tests; Linux may also
require `npx playwright install-deps chromium`. Node/npm setup is in README.
The generated public/mockServiceWorker.js is included in the project; run
`npm run msw:init` to refresh it after an MSW upgrade.
The acceptance entry exposes a test handle only in its explicit Angular configuration;
normal start/build use src/main.ts and contain no test API. Dev and optimized
Playwright runs write to .cache/playwright/dev and .cache/playwright/builds.
Screenshots use per-test output paths under the corresponding run directory.

## Dependency boundaries

Features are independent application sections: auth and core, with home/landing
as future examples rather than placeholder directories. Core denotes the private
application, not shared infrastructure. Each section owns its routes, optional
layout and simple pages. ProfilePage is in features/core/pages/profile-page;
auth pages are in features/auth/pages. A complex domain stays cohesive under its
section: features/core/tasks owns pages, components, data-access and Store.
Pages compose selectors/local UI state/intent; task components use typed inputs/
outputs without Store/HTTP. Leaf pages use Page-suffixed names and colocated assets/
specs. Add shared UI or role folders only for actual needs. Root/feature Store
ownership is independent of section nesting. New independent sections use
features/<section> and root route entries with an explicit access policy. Simple
screens use section pages/; domains with related API/state/UI use a named subfolder,
as core/tasks demonstrates. This is a project convention, not a mandated Angular tree.

Auth and the task domain keep a flat store/ beside data-access/. Data-access owns injectable
HTTP adapters, readonly contracts, decoding and boundary validation; Store owns
events, transitions, async orchestration and derived values. There is one global
Store, initialized by provideRootStore in store/root-store.providers.ts, called from
app.config.ts. Auth is an eager feature; tasks registers lazily in its route.
Feature folders are code ownership boundaries, not separate component stores.
Only create domain-policy modules or additional subfolders for actual complexity.

Configuration, HTTP and session infrastructure live directly under src/app/
and import Angular/browser capabilities or each other, without feature imports. Auth API owns transport contracts and runtime decoding, independently of
Store/UI. Store Effects call API/infrastructure adapters; pure reducers depend on events and
contracts. authFeature composes authReducer and supplies generated selectors;
auth-selectors.ts binds the five public base selectors and defines the two derived
selectors. The selector module imports the feature, never the reverse. Profile and
auth views consume public events/selectors. features/core composes its private
routes/layout and consumes public auth contracts. Core pages and nested domains
must not import parent core.routes/layout; other sections must not import auth UI. Public forms and shared auth
API/Store/guard belong to features/auth/. Root config/http/session remain infrastructure.
The private group renders CoreLayout for shared navigation, its nested outlet
and logout. The child guard rechecks session
settlement on sibling navigation; /profile and /core/my-day compatibility remain. Ordinary specs stay colocated; reusable
helpers are test-only: generic DOM/form helpers live in src/testing/ui-test-helpers.ts
and the authState fixture in features/auth/testing/auth-state-fixture.ts. Folder moves do not
change DI scope or provider lifetime.

| Component             | Role and owner                                              |
| --------------------- | ----------------------------------------------------------- |
| App                   | Root outlet host in app/                                    |
| CoreLayout            | Protected navigation/outlet/logout in features/core/layout/ |
| LoginPage, SignUpPage | Public screens in features/auth/pages/                      |
| ProfilePage           | Session view in features/core/pages/                        |
| TasksPage             | Task screen in features/core/tasks/pages/                   |
| TaskItem              | Presentational row in features/core/tasks/components/       |

ESLint rejects auth Store-to-UI, task component-to-page/layout, auth-to-core,
other-section-to-auth-UI and child-to-core-composition imports, plus root boundaries. Shared test helpers cannot
import application features or NgRx. npm run lint includes the dependency check in
scripts/check-architecture.mjs against effective merged configs; specs retain their
integration composition exceptions. These checks cover selected architectural
contracts, not every possible import form or future folder layout.

## HTTP transport extension contract

SessionTokenStorage in app/session/session-token-storage.ts reads/writes only the
saved session token. SESSION_STORAGE represents the browser Storage adapter.
Auth Effects own session workflows, not this adapter.

Feature APIs create per-request apiRequestContext('public' | 'authenticated') from
app/http/api-request-context.ts. A null API_REQUEST_ACCESS default leaves unmarked
requests untouched. The interceptor validates canonical unprefixed endpoint paths,
composes APP_CONFIG.apiBaseUrl and owns Authorization only for marked requests.
Public calls never read token storage and remove Authorization; authenticated calls
attach a saved nonblank token or remove Authorization when it is absent. Other
headers, query parameters and bodies remain intact. Unsafe marked paths fail before
storage/transport. The canonical path contract rejects trailing/empty/dot segments,
encoded separators/nested percent escapes, fragments and control/whitespace paths.
The configured backend is trusted; server authentication/authorization remains
mandatory. HTTP context is client metadata, not a security permission.

AuthApi marks login/sign-up public and profile authenticated; TasksApi marks both
operations authenticated. No endpoint allowlist remains in shared HTTP code.
Domain-specific ID/body/response validation stays in each feature adapter. For a
new endpoint, add the typed adapter and response decoder, select an explicit API
request context and add a mock handler when needed by the demo. The shared
interceptor needs no endpoint-specific change. api-interceptor.spec.ts covers
generic policy behavior in demo and remote modes.

## State and session architecture

Keep one auth-state owner in Store, selectors for view state and functional Effects
for async orchestration. Validate unknown HTTP data at adapters; do not store
credentials in reducer state. Use strict TypeScript/strictTemplates and meaningful
integration/DOM cases. Do not enable strictActionWithinNgZone in the zoneless app.
`app.config.ts` invokes `provideRootStore()` from `store/root-store.providers.ts`.
The root entry composes `provideStore`, eager `provideState(authFeature)` and auth
Effects. Session restoration stays in the app initializer. Lazy task registration
stays in tasks.routes.ts; root composition must not import protected features/UI.
Features and config/http/session must not import app.config or root Store wiring.
Root registration/runtime/DevTools checks live in the colocated root provider spec;
auth transitions, HTTP integration and redaction tests remain auth-owned.
Development enables state/action immutability, serializability and action-type
uniqueness checks; NgRx disables them in production. Functional Effects are
registered once. DevTools are development-only, logOnly with maxAge 25, and redact
login/signup credentials and personal request fields without mutating actions. Session loading is derived by `selectIsLoading`; registration has
its own status. Logout/expired reset to anonymous with idle registration and no
errors. The reducer owns no HTTP, storage or navigation. Login/restore share one
exhaustMap owner; registration has an independent owner. Logout/expired cancel
pending auth/profile/registration requests, clear storage and navigate to login.
Profile 401 expires the session; temporary restore failure retains the token for
explicit retry. New-login failure clears its token. Guards wait for a terminal
status and return a login UrlTree for anonymous/error. Navigation Promises are
observed, rejection is reported safely and expected Router skips settle normally.
Observable-valued fields use `$`; signals and functional effect factories do not.
This is a project convention, not a compiler requirement.

## Documentation and contribution

[README.md](README.md) summarizes the demo, structure and launch commands.
This file describes architecture, responsibilities, extension rules and verification. [AGENTS.md](AGENTS.md) contains self-contained contributor-agent
rules. Executable import boundaries live in eslint.config.mjs and
scripts/check-architecture.mjs. Private working records stay outside the repository.
