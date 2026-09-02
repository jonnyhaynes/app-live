# Claude Code context for app-live

This file orients Claude Code on this repo. Keep it lean -- it points, it doesn't
explain. Substantive design and rationale live in `/docs`; read those before any
non-trivial change. A bloated CLAUDE.md is a smell: if a section wants more than a
few lines, move it to its own doc under `/docs` and link it.

## What this is

`build_and_install(project, profile, device)` builds an Expo app locally with
`eas build --local`, then installs the resulting `.ipa`/`.apk` onto the device you
name. Routing is automatic: if the device is connected to this machine it installs
locally (`ios-deploy` / `devicectl` / `simctl` / `adb`); otherwise it uploads to
**BrowserStack App Live** and opens a session. Ships as **both** an MCP server
(`dist/mcp.js`) and a CLI (`app-live`, `dist/cli.js`) over the same `core/`.

See `README.md` for the flow diagram and `docs/dev-workflow.md` for how we build here.

## Stack

**Node ≥ 22 / TypeScript (ESM, `NodeNext`).** No app framework -- a plain library +
CLI + MCP server. Deps: `@modelcontextprotocol/sdk` and `zod`. Built with `tsc`
(`npm run build`). Strict TypeScript (avoid `any`). No test/lint/format tooling is
wired up yet -- add it before relying on the test-guard hook.

Layout: `src/core/` holds the platform logic (`build`, `devices`, `localInstall`,
`browserstack`, `exec`, `types`), re-exported from `core/index.ts`. `src/cli.ts` and
`src/mcp.ts` are the two thin entrypoints.

## Load-bearing principles

These shape the code. Don't change them without a deliberate, flagged decision.

- **The CLI and MCP server are thin wrappers over `core/`.** New behaviour goes in
  `core/`, exposed identically to both entrypoints -- never fork logic into one.
- **Device routing is automatic and single-path.** A local match installs locally;
  everything else falls back to BrowserStack. Don't add a mode flag that makes the
  caller choose.
- **External tools are invoked, not reimplemented.** Builds/installs shell out to
  `eas`, `devicectl`/`simctl`/`ios-deploy`/`adb` via `core/exec.ts`.
- **Credentials come from the environment** (`BROWSERSTACK_USERNAME` /
  `BROWSERSTACK_ACCESS_KEY`, `eas login`) -- never hard-coded or committed.

## Scope boundaries

What this project is **not**, and shouldn't drift towards. Push back before building
if a request drifts here.

- Not an EAS/Expo replacement -- it orchestrates `eas`, it doesn't reimplement builds.
- Not a full BrowserStack client -- just enough App Live to upload and open a session.
- Not a device farm / test runner -- it builds and installs; it doesn't run test suites.

## How we work (the short version)

Full process: `docs/dev-workflow.md`. The non-negotiables:

- **Plan first.** For non-trivial work, produce an implementation plan saved to
  `docs/plans/<ticket>.md` and have a human approve it before writing code. The
  plan is what gets reviewed, not the first code.
- **A human reviews and merges every PR.** Claude opens the PR and gets CI green; a
  named person reviews the diff against the plan and merges. Claude never merges.
- **Never put secrets, credentials, or client data into the model.** If unsure,
  it's out of bounds until you've asked.
- **Mark AI-assisted work.** Prefix AI-assisted PR titles `[ai-assisted]`, reference
  the approved plan doc, and end the description with a `Manually reviewed by <name>`
  line. Keep the `Co-Authored-By` trailer on commits.

## Documents

Source of truth lives in `/docs`. Read the relevant doc before responding:

- `docs/dev-workflow.md` -- how we build (the loop + standing conventions)
- _Add requirements, tech design, and policy docs here as they appear._

## Working style

- Push back where appropriate rather than agreeing reflexively.
- When changing a load-bearing principle or scope boundary, flag it explicitly
  rather than slipping it in.
- Prefer pointing at a doc section over reproducing its content here.

## Raising pull requests

This project uses **GitHub**. Raise PRs with the `gh` CLI (or the REST API):

- Repo: `jonnyhaynes/app-live` · Target branch: `main`.
- Push the branch (`git push -u origin <branch>`), then `gh pr create`.
- **Mark AI-assisted PRs:** prefix the title `[ai-assisted]` (or add an `ai-assisted`
  label), reference the approved plan doc (`docs/plans/<ticket>.md`) in the body, and
  end it with a `Manually reviewed by <name>` line confirming the diff was read.
- Keep the `Co-Authored-By` trailer on commits. **A human merges** once CI is green
  and the diff has been reviewed against the plan.
**Issue tracker: GitHub Issues.** One issue = one unit of work; acceptance criteria
are the test contract. Reference the issue in the branch name and PR, and close it from
the PR (`Closes #NN`) once merged.
