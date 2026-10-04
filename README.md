# Angular + NgRx demo

**Demo login:** `demo@example.test`

**Password:** `demo-password`

A teaching application with login, registration, a protected profile and a task
list with filters and completion updates. Built with Angular, NgRx Store + Effects,
Angular Material and Signal Forms.

MSW simulates the API in the browser; no backend is required for demo mode.
Registered accounts and task changes reset on reload.

## Structure

```text
src/app/
  features/
    auth/                 Login, registration, auth API, Store and guard
    core/                 Protected application section
      layout/             Navigation and logout
      pages/profile-page/ Profile screen
      tasks/              Task pages, components, API and feature Store
  store/                  Global Store initialization and eager auth registration
  config/                 Demo/remote settings
  http/                   API request context and interceptor
  session/                Session token storage
src/mocks/                Browser API fixtures and handlers
src/testing/              Shared test helpers
e2e/                      Browser tests
```

Architecture and implementation details: [ARCHITECTURE.md](ARCHITECTURE.md).

## Run

Requires **Node.js 26.10.0** and **npm 12.2.0**. With nvm installed:

```sh
nvm install
nvm use
npm install --global npm@12.2.0
npm ci
npm start
```

Open **http://localhost:4200**.

| Command                               | Purpose                       |
| ------------------------------------- | ----------------------------- |
| `npm start`                           | Run locally with the mock API |
| `npm run build`                       | Build the optimized demo      |
| `npm start -- --configuration remote` | Run against an external API   |
| `npm run build:remote`                | Build without starting mocks  |

Remote mode requires a backend or proxy at `/api`; configure it in
`src/app/config/app-settings.remote.ts`. Build output is in
`dist/angular-ngrx-demo/browser`.
