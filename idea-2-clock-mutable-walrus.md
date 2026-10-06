# Clock-in/out on Azure — full DevOps pipeline

## Context

Lenka is preparing for **AZ-900** (target: pass in ~6 weeks) and wants a project that teaches
cloud by building, not just reading. Of four candidate ideas, the clock-in/out tracker was chosen
because it is small enough that **the cloud becomes the project** rather than the app competing
for attention.

The goal is not really the app. The app is a vehicle for: multi-stage CI/CD with gated approvals,
infrastructure as code, secrets that never touch the repo, security gates that can block a build,
real monitoring, and a zero-downtime deploy with instant rollback.

Personal motivation is real too: she works from home and wants to stop over- and under-working.
She will use this daily, which matters — it means Application Insights and Log Analytics will hold
real data instead of being empty demos.

**Prior art:** `canvas-backend` (Spring Boot 3 / Java 17 / Maven / JPA / Postgres, deployed to
Railway). Patterns to carry over: env-var-driven config in `application.properties`. Patterns to
deliberately *not* carry over: hand-rolled JWT (replaced by Entra ID), `ddl-auto=update`
(replaced by Flyway — this exact setting already caused a production incident on Supabase),
secrets as plain env vars (replaced by Key Vault + managed identity).

---

## Honest framing: this project is not an efficient way to pass AZ-900

Read this before committing to the 6-week target.

AZ-900 is a **concepts and memorization exam** — three domains, no coding, no hands-on labs:
cloud concepts (25–30%), Azure architecture and services (35–40%), management and governance
(30–35%). Most people pass it with 15–20 hours of focused study.

This project is roughly **20% AZ-900 and 80% AZ-104/AZ-400**. Building a Bicep-provisioned,
canary-deployed, quality-gated pipeline will teach a great deal, but it will not efficiently cover
region pairs, ExpressRoute vs VPN Gateway, Purview, Azure Arc, or storage redundancy tiers — all
of which are on the exam and none of which this app needs.

**Therefore: run two tracks in parallel.**

- **Track A — pass the exam.** Book AZ-900 *now* for end of week 4. Booking creates the deadline.
  Work the free Microsoft Learn AZ-900 path, then hammer the free practice assessment until
  scoring 85%+ consistently. ~18 hours total.
- **Track B — build the thing.** Runs weeks 1–10, continues past the exam and feeds AZ-104 → AZ-400.

The phases below mark which AZ-900 domain each one reinforces, so Track B makes Track A stick.

---

## Decisions locked

| Decision | Choice | Why |
|---|---|---|
| Budget | ~$0/month | Hard constraint; drives everything below |
| Compute | **Azure Container Apps** (Consumption) | At $0, App Service slots are impossible — they need Standard tier (~$70/mo); Basic and Free have no slots at all. Container Apps revisions give *better* canary (real traffic splitting) inside the free grant, and scale to zero |
| IaC | **Bicep** | Azure-native, no state file to babysit solo, and ARM/Bicep is literally on the AZ-900 syllabus |
| App stack | **Spring Boot 4.1 / Java 25 (LTS) / Maven** | Latest free LTS JDK (Temurin). Note this is newer than `canvas-backend` (Boot 3.5 / Java 17), so less copy-paste — chosen deliberately over reuse |
| Database | **Azure SQL serverless, free offer** | Up to 10 free DBs per subscription, lifetime of the subscription |
| Registry | **ghcr.io** | Azure Container Registry has no free tier (Basic ≈ $5/mo) |
| Repo | **GitHub public; Azure DevOps project private** | A public GitHub repo still unlocks free SonarCloud and secret scanning. Azure DevOps public projects are retired — new ones cannot be created |
| App scope | Clock in/out + breaks + corrections + weekly view | Moderate — enough test surface for a meaningful quality gate. Frontend shipped 2026-10-05; backend follows the exam |
| Pace | Heavy, weekends included | ~10 weeks for Track B |

### The $0 arithmetic (verified against Microsoft docs, Sept 2026)

- **Container Apps**: first 180,000 vCPU-seconds, 360,000 GiB-seconds, and 2M HTTP requests free
  per subscription per calendar month. Scaled to zero = no consumption charges at all. Health
  probe requests are not billable. At 0.25 vCPU that grant is ~200 hours/month of running time
  shared across all three environments — comfortable for a personal app.
- **Azure SQL**: each free database gets 100,000 vCore-seconds + 32 GB data + 32 GB backup per
  month, free for the lifetime of the subscription, up to 10 databases per subscription. Set
  *"Auto-pause the database until next month"* so it pauses rather than billing on overrun.
- **Key Vault** Standard: ~$0.03 per 10,000 operations — effectively free at this volume.
- **Log Analytics / App Insights**: 5 GB/month ingestion free.
- **Azure DevOps**: free tier is 1 Microsoft-hosted parallel job and 1,800 min/month for private
  projects, unlocked by linking an Azure subscription under Organization settings → Billing.
- **SonarCloud**: free for public repositories.

**Realistic total: $0–1/month.**

---

## Architecture

```
React SPA ──▶ Azure Static Web Apps (Free)  ──calls──▶  the API below

GitHub (public)  ──push──▶  Azure Pipelines (multi-stage YAML)
                                  │
                   build ▸ test ▸ scan ▸ image ▸ ghcr.io
                                  │
                    ┌─────────────┼─────────────┐
                  dev          staging         prod
               (auto)       (approval)     (approval + canary)
                    └─────────────┼─────────────┘
                                  ▼
                    Azure Container Apps Environment
                     dev / staging / prod container apps
                        min replicas 0 (scale to zero)
                                  │
              Key Vault (per env) ─┴─ Azure SQL serverless (per env)
                  accessed via user-assigned managed identity
                                  │
                    App Insights ──▶ shared Log Analytics
```

**Resource groups**

- `rg-clockin-shared` — Log Analytics workspace, Container Apps Environment
- `rg-clockin-dev` / `rg-clockin-staging` / `rg-clockin-prod` — container app, SQL server + DB,
  Key Vault, App Insights, user-assigned managed identity

**Named trade-off:** one Container Apps Environment is shared across all three environments to stay
free. In production you would isolate each environment completely. Write this down — "why did you
share the environment and what would you change with a budget" is exactly the kind of question
AZ-400 asks, and having a real answer from a real decision is worth more than the textbook one.

---

## Phase 0 — Unblock first (day 1, ~2h)

**Update 2026-09-27: the parallelism request form no longer exists.** Microsoft replaced it. The
free grant now applies automatically once you link an Azure subscription to the Azure DevOps
organization — no request, no approval, no two-day wait. Because that link needs a subscription
to point at, the Azure account has to come *first*, which reorders this list.

1. ✅ **Azure free account + subscription.** **Decide the region now and write it down** — once a
   free SQL database is created in a region, every free database in that subscription is pinned
   to that region and it cannot be changed. **East US 2** (Virginia) — she is on the US East Coast.
   *Done. Subscription id is in the portal and in Organization settings → Billing — deliberately not written here, since this repo is public.*
2. Set a **$5 budget with an email alert** on the subscription, before creating any resource. Not
   because you expect to spend it — because the alert firing is how you learn you misconfigured
   something. Note that it notifies; it does not cap.
3. ✅ **Azure DevOps organization + project.** The project must be **private**; public is no longer
   offered. *Done: org `litovko89`.*
4. ✅ **Link billing to unlock the free grant.** Organization settings → Billing
   (`/{org}/_settings/billing` — note the missing project segment) → Set up billing → pick the
   subscription. Confirm the table reads **MS Hosted CI/CD: 1800 minutes** and **Self-Hosted: 1**.
   Leave both "Paid parallel jobs" boxes at `0` and the GitHub-hosted agents toggle **Off** — both
   bill to the subscription you just linked. *Done: grant active.*
5. GitHub **public** repo `clockin`. This is the repo that stays public, and it is what actually
   unlocks free SonarCloud and secret scanning.
6. SonarCloud account, linked to the GitHub org.
7. Local tooling: Azure CLI, Bicep CLI (`az bicep install`), Docker Desktop, Eclipse Temurin JDK 25.

---

## Resequenced 2026-10-05 — frontend first

The original order put a Spring Boot weekend *before* any Azure work, which delayed the
thing AZ-900 actually tests. New order:

- **Phase 1a — done 2026-10-05.** React 19 + Tailwind 4 frontend, state in `localStorage`,
  deployed to Azure Static Web Apps. Lives in `web/`; see the README. The hours math is
  pure and unit-tested (including both DST transitions) precisely so it ports to Java
  cleanly later.
- **Phase 1b — below, after the exam.** The Spring Boot backend. The frontend swaps
  `localStorage` for API calls and gains an import path from its own JSON export.

Phases 2–8 are unchanged. One addition to the architecture: **Azure Static Web Apps**
(Free plan) now fronts everything — the original plan had no frontend at all.

---

## Phase 1b — The backend (one weekend, after AZ-900)

Java 25 (Temurin LTS) + Spring Boot 4.1 + Maven, package `com.clockin`.

**Domain model** — deliberately more than one table, because corrections need an audit trail:

- `WorkSession` — id, userId, startedAt (`Instant`), endedAt (`Instant`, nullable), note
- `BreakInterval` — id, sessionId, startedAt, endedAt
- `SessionAudit` — id, sessionId, changedAt, changedBy, field, oldValue, newValue, reason
- `DayTarget` — userId, dayOfWeek, targetMinutes

**Store every timestamp as UTC `Instant`; render in the user's zone.** Timezone handling is where
time-tracking apps die, and DST transitions are the best unit-test material in the whole project.

**Endpoints**

```
POST   /api/sessions/clock-in
POST   /api/sessions/clock-out
POST   /api/sessions/{id}/break/start
POST   /api/sessions/{id}/break/end
PATCH  /api/sessions/{id}              # correction — requires a reason, writes SessionAudit
GET    /api/sessions?from=&to=
GET    /api/summary/{day|week|month}   # worked, target, delta, over/under flag
GET    /actuator/health                # liveness + readiness for Container Apps probes
```

**Tests — this is a new skill; `canvas-backend` has exactly one test.**

- Unit tests on the hours calculation: break subtraction, overnight sessions, DST spring-forward
  and fall-back, open session at midnight, corrections that change a total. Pure functions, no
  Spring context, fast — this is where the real coverage comes from.
- Integration tests with **Testcontainers** (`mcr.microsoft.com/mssql/server`) so CI runs against
  a real SQL Server, not H2.

**Flyway from commit one.** `spring.jpa.hibernate.ddl-auto=validate`, never `update`. Migrations in
`src/main/resources/db/migration/V1__initial_schema.sql`. This is the direct fix for the Supabase
incident: schema changes become versioned, reviewable, and promotable across environments.

**Dockerfile** — multi-stage, layered Spring Boot jar (`java -Djarmode=layertools -jar`) so image
layers cache well and pipeline builds stay fast.

*AZ-900 reinforcement: none — this is pure app work, which is exactly why it moved to after the exam.*

---

## Phase 2 — Bicep (week 2, ~8h)

Write the infrastructure before the pipeline, and deploy it by hand exactly once to understand what
the pipeline will be doing.

```
infra/
  main.bicep                 # subscription-scope, creates RGs, calls modules
  modules/
    logAnalytics.bicep
    containerAppEnv.bicep
    containerApp.bicep       # ingress, probes, scale 0..N, managed identity, KV refs
    sqlServer.bicep          # + free-offer serverless DB, auto-pause
    keyVault.bicep           # RBAC auth mode, not access policies
    appInsights.bicep
    identity.bicep           # user-assigned MI + role assignments
  params/
    dev.bicepparam
    staging.bicepparam
    prod.bicepparam
```

Deploy dev by hand: `az deployment sub create --template-file infra/main.bicep --parameters infra/params/dev.bicepparam`

**Then stop using the portal for changes.** From here the portal is read-only — for looking at
metrics, costs, and logs. Every change goes through Bicep. This rule is the entire point of the
phase, and breaking it once undermines the habit.

Tag every resource: `project=clockin`, `env=dev|staging|prod`, `owner=lenka`, `managedBy=bicep`.

*AZ-900 reinforcement: resource groups and hierarchy, subscriptions, IaC and ARM templates, tags,
PaaS vs IaaS, regions.*

---

## Phase 3 — Pipeline: build and dev deploy (week 3, ~8h)

`azure-pipelines.yml`, multi-stage YAML.

**Service connection using workload identity federation (OIDC), not a service principal secret.**
This is the modern pattern and it means there is no credential to rotate or leak — it directly
answers "no passwords in code."

Stages:

1. **Build** — `mvn verify`, publish JUnit results + JaCoCo coverage to the pipeline UI
2. **Package** — build image, tag with `$(Build.BuildId)` *and* the git SHA, push to ghcr.io
3. **Deploy_Dev** — `az deployment group create` (Bicep), then update the container app to the new
   image, then smoke-test `/actuator/health`

**The principle that matters most here: build the image once, promote the same image.** Never
rebuild per environment. Dev, staging, and prod must run the byte-identical artifact, referenced by
digest. This is the single most important idea in the whole pipeline and a recurring AZ-400 theme.

The app reads its DB connection string from Key Vault via the container app's **user-assigned
managed identity** — no secret in the repo, the pipeline, or the container's environment.

*AZ-900 reinforcement: Entra ID, RBAC, authentication vs authorization, defense in depth.*

---

## Phase 4 — Staging, prod, and gates (week 4, ~8h)

1. Create Azure DevOps **Environments** for `dev`, `staging`, `prod`.
2. Add a **manual approval check** on staging and prod. Approve your own deployments — it feels
   silly solo, and it is still the correct shape.
3. **Flyway migration stage**, run before each app deploy. Microsoft-hosted agents have dynamic
   IPs, so the stage must add the agent's public IP to the SQL firewall, run the migration, then
   remove the rule in an `always()` cleanup step. Do not leave "allow all Azure services" on.
4. Add a post-deploy integration smoke test against staging.

**Take AZ-900 at the end of this week.**

*AZ-900 reinforcement: governance, resource locks (put one on `rg-clockin-prod`), Azure Policy
(try: deny any resource outside your chosen region, require the `project` tag).*

---

## Phase 5 — DevSecOps gates (week 5, ~8h)

Each of these must be able to **fail the build** — a gate that only warns is not a gate.

- **SonarCloud** analysis + quality gate. Set the gate on *new code*, not the whole codebase —
  start at 60% coverage on new code rather than an unreachable global 80%.
- **OWASP Dependency-Check** (Maven plugin) or Dependabot for vulnerable dependencies.
- **Trivy** container image scan, failing on HIGH and CRITICAL.
- **GitHub push protection** for secret scanning (free on public repos).
- **Branch policy** on `main`: PR required, build must pass, quality gate must pass. No direct
  pushes — including yours.

Prove each gate works by deliberately breaking it: commit a vulnerable dependency version, commit a
fake API key, commit an untested method. Watch each one get blocked. A gate you have never seen
fire is a gate you do not know is wired up.

---

## Phase 6 — Monitoring (week 6, ~8h)

- Attach the **Application Insights Java agent** to the container (no code change required).
- Custom telemetry for clock-in/clock-out events.
- Learn **KQL** against the shared Log Analytics workspace — and here the app pays you back,
  because the queries are about your own real data: *when did I actually start last Tuesday?*
- Build an **Azure Workbook** dashboard: daily hours, weekly total vs target, 5xx rate, p95 latency.
- **Alerts** → action group → email: HTTP 5xx spike, p95 response time, availability test failure.
- The app's own over/under-hours warning, as a scheduled job.

**The rhyme worth noticing:** you are building a threshold-alert system ("I have worked 9 hours,
stop") while configuring Azure's threshold-alert system. Same shape, two levels. Notice it while
you are doing it — it is why this project was chosen over the others.

*AZ-900 reinforcement: Azure Monitor, Log Analytics, Application Insights, alerts, Service Health,
Advisor.*

---

## Phase 7 — Canary deploy and rollback (week 7, ~6h)

1. Put the prod container app into **multiple-revision mode**.
2. Pipeline deploys the new revision with a **label** and **10% traffic**.
3. Bake period — verify error rate in App Insights against the labelled revision.
4. Shift to 100%, or roll back by shifting traffic to the previous revision. Rollback is a traffic
   weight change, so it is effectively instant and does not need a rebuild.
5. **Rehearse the failure.** Ship a deliberately broken revision, watch the alert fire, roll back,
   and time yourself. An untested rollback is a hope, not a plan.

---

## Phase 8 — Hardening and what comes next (ongoing)

- Cost Management: budget alerts, cost analysis by tag, act on Azure Advisor recommendations.
- Azure Policy assignments; resource lock on prod.
- Document the architecture decisions in the repo README, including the shared-environment
  trade-off — this becomes a portfolio piece.
- **Then: AZ-104** (the real learning, and the prerequisite), then AZ-400. Note that AZ-204 has been
  retired, so AZ-104 is now the path to the DevOps Engineer Expert badge.

---

## Landmines (each one will cost an evening if hit blind)

| Landmine | Mitigation |
|---|---|
| ~~Azure DevOps parallelism needs a request form~~ — **obsolete, 2026-09-27** | No form exists. Link an Azure subscription under Organization settings → Billing; the grant applies at once. Cap is 1,800 min/month, not unlimited |
| "Project settings" and "Organization settings" look nearly identical, and Billing is only in the latter | Organization settings is the gear at the very *bottom* of the left rail, or `/{org}/_settings/` with no project segment |
| Free SQL databases are **pinned to one region per subscription**, permanently | Verified 2026-10-05 in Microsoft's docs: *"once a region is selected for a free database under a subscription, the same region applies to all free databases in that subscription, and cannot be changed."* Region is **East US 2** |
| Private endpoints or a custom VNet trigger a **Dedicated plan management fee** | Stay on Consumption with public ingress; revisit only with a budget |
| Scale-to-zero container + auto-paused SQL = **double cold start**, and the first DB connection after a pause *fails* | Configure HikariCP retry and `initialization-fail-timeout`; set generous Container Apps startup probe thresholds. Flip prod to `minReplicas: 1` (~$12/mo) only if the wait becomes genuinely annoying |
| `ddl-auto=update` across three environments | Flyway from commit one; `ddl-auto=validate` |
| Rebuilding the image per environment | Promote by digest; never rebuild |
| Timezone and DST bugs in hours math | Store UTC `Instant`; DST unit tests written before the feature |
| Migration stage cannot reach SQL from a hosted agent | Add/remove agent IP firewall rule in the stage, with `always()` cleanup |
| ACR looks like the obvious registry and has no free tier | ghcr.io |

---

## Verification

**Phase 1** — `mvn verify` passes locally; `docker compose up` runs the app against SQL Server in a
container; clock in, take a break, clock out, correct a past entry, and confirm the monthly summary
arithmetic by hand.

**Phase 2** — `az deployment sub create` provisions dev from scratch. Then the real test:
**delete the entire resource group and rebuild it from Bicep alone.** If anything is missing, it
was configured by clicking and the IaC is a lie. This is the single best exercise in the plan.

**Phase 3–4** — push to a branch, open a PR, watch build → scan → image → dev deploy run green.
Approve staging manually and confirm the deployed image digest matches the one built in stage 1.

**Phase 5** — deliberately trip each gate (vulnerable dependency, fake secret, uncovered code) and
confirm each one blocks the build. Then remove them and confirm it goes green.

**Phase 6** — write a KQL query returning your actual clock-in times for the past week. Force a 5xx
and confirm the alert email arrives.

**Phase 7** — deploy a broken revision at 10%, confirm the error rate rises only for the labelled
revision, roll back by traffic shift, and confirm recovery without a rebuild.

**Cost, every week** — Cost Analysis filtered to `project=clockin`. Expected: $0–1/month. Anything
above $5 means something is not scaling to zero; find it before the month closes.
