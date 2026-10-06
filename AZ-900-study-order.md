# AZ-900 study order

The content is branded **"Introduction to Cloud Infrastructure"**, course `az-900t00`.
It is a **four-part** series. Verified 2026-09-25.

## Why the site feels like a maze

Because different entry points show different content. The course page (`az-900t00`)
lists only **three** learning paths. The path pages themselves reference a **fourth** —
*Apply Azure skills in guided projects*, 8 hands-on projects. The course page omits it.

**Fix: ignore the course page. Use the four path links below as your only entry points.**

Also note: the "Launch the sandbox" button on the certification page is a demo of the
**exam question interface**, not an Azure environment. The Microsoft Learn Azure sandbox
was retired — every hands-on exercise now runs on your own subscription.

## The four paths

| Part | Path | Size |
|---|---|---|
| 1 | [Describe cloud concepts](https://learn.microsoft.com/training/paths/microsoft-azure-fundamentals-describe-cloud-concepts/) | 3 modules, 56 min |
| 2 | [Describe Azure architecture and services](https://learn.microsoft.com/training/paths/azure-fundamentals-describe-azure-architecture-services/) | 5 modules, 2 h 48 min |
| 3 | [Describe Azure management and governance](https://learn.microsoft.com/training/paths/describe-azure-management-governance/) | 4 modules, 1 h 21 min |
| 4 | [Apply Azure skills in guided projects](https://learn.microsoft.com/en-us/training/paths/introduction-cloud-infrastructure-apply-azure-skills-guided-projects/) | 8 guided projects |

## The order — modules interleaved with the projects that prove them

Reading a module then immediately doing the matching project is what makes it stick.
`P#` = a guided project from Part 4, pulled out of its listed order on purpose.

### Week 1 — concepts, then guardrails before you can spend anything

1. **1.1** Describe cloud computing
2. **1.2** Describe the benefits of using cloud services
3. **1.3** Describe cloud service types  ← IaaS / PaaS / SaaS, shared responsibility
4. Create the Azure free account. Choose **West Europe or North Europe** and write it down.
5. **P6** Set up cost guardrails in Azure ← *out of order deliberately: get the budget alert
   in place before you create your first billable resource*
6. **P8** Manage Azure resources with Cloud Shell and the Azure CLI ← the tool you use from here on
7. **2.1** Describe the core architectural components of Azure ← regions, region pairs, RGs, subscriptions

### Week 2 — the services breadth (the biggest exam domain)

8. **2.2** Describe Azure compute services → **P3** Build a website endpoint with Azure Functions
9. **2.3** Describe Azure networking services
10. **2.4** Describe Azure storage services → **P1** Static website on Blob Storage → **P5** Share files securely
11. **2.5** Describe Azure identity, access, and security → **P4** Set up new employee access (Entra ID + RBAC)

### Week 3 — governance and monitoring

12. **3.1** Describe cost management in Azure ← the theory behind P6, which you already did
13. **3.2** Governance and compliance → **P2** Organize and protect resources with tags and locks
14. **3.3** Features and tools for managing and deploying Azure resources ← ARM/Bicep lands here
15. **3.4** Describe monitoring tools in Azure → **P7** Service Health and Activity Log alerts

### Week 4 — pass it

16. [Practice assessment](https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/practice/assessment?assessment-type=practice&assessmentId=23). Repeat until **85%+ consistently**.
17. Attend a [Virtual Training Day](https://www.microsoft.com/en-us/trainingdays) → **50% off** the exam.
    Do this *before* booking.
18. Book and sit the exam. 45 min, proctored. Retake allowed after 24 h.

Roughly **12–15 hours** including the projects.

## Cost discipline

Every project above runs on your own subscription. Most use always-free services
(Functions, Blob at personal scale, Entra ID, tags, locks, alerts, Cloud Shell).
**Delete each project's resource group when you finish it** — that habit is itself
the consumption-pricing lesson.

Budget alerts notify, they do not cap. The only real cap is the free account's
spending limit, which disappears the moment you upgrade to pay-as-you-go.

## How this relates to the clock in/out app

These are two separate tracks running in parallel, not one project.

- **This track passes the exam** — breadth, 4 weeks, weekday evenings.
- **The clock app is the AZ-400 portfolio piece** — depth, weekends, plan in
  `../idea-2-clock-mutable-walrus.md`.

Three of the guided projects feed the clock app directly: **P1** previews what Static Web
Apps does for your React frontend, **P4** is the Entra ID groundwork for its Phase 2 login,
and **P7** is the first half of its Phase 6 monitoring.
