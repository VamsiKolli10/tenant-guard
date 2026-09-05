# Positioning Hypothesis and Validation Plan

**Status:** Proposed — the central market claim is **unvalidated** and this document is designed to kill it cheaply if it is wrong
**Date:** 2026-09-05
**Relates to:** `prd.md` (open decision 1: "confirm the first target segment through interviews"), `personas-and-journeys.md`

---

## 1. The problem the product actually solves

Stripped of feature language, Tenant Guard makes one claim:

> **An organization is a hard boundary, not a visibility setting.**

This is worth stating precisely, because it is the only thing in the product that is not already commodity. In most task tools, "who can see what" is a filter applied on top of one shared dataset — a guest role, a private project, a permission checkbox. The data lives together and a query decides what you are shown. In Tenant Guard the boundary is enforced beneath the application: every tenant-scoped query is pinned to one organization by a database-client guard, and a query that names a different organization is refused rather than filtered.

Two jobs follow from that, in Jobs-to-be-Done form:

**Job A — separation without vigilance.**
> "When I take on a new client, give them somewhere to work without me having to stay alert to whether they can see another client's material."

The competing solution today is *care*: naming conventions, a separate workspace per client, a checklist, remembering to set a project private. That works until someone is in a hurry.

**Job B — answer 'who changed this' without engineering.**
> "When a client disputes a change, or someone loses access they should have kept, let me reconstruct what happened myself."

The competing solution today is a support ticket, a database query, or a shrug.

**What it does not solve.** It is not project planning, time tracking, resourcing, invoicing, chat, or docs. The PRD is explicit about these non-goals, and they are exactly the features agencies say they buy on. That tension is the core of the positioning problem below.

---

## 2. Competitive reality — the honest read

### 2.1 The category is saturated and cheap

Client-facing project tools already cluster at $4–$24 per user per month: Zoho Projects from $4, monday from $9, Wrike from $10, Celoxis from $10, Productive from $10, Basecamp at a $15 flat rate, Rocketlane from $19, Scoro from $24, Dock at a $350/month flat fee. Every one of them ships more workflow surface than Tenant Guard's PRD scope, and several advertise granular client-vs-internal permission separation directly.

**Implication:** feature-for-feature competition is unwinnable and should not be attempted. Task CRUD, roles, and invitations are table stakes, not differentiators. Nothing in the current build would cause a team to switch.

### 2.2 There is one genuine seam, and it is narrow

Audit history is gated behind the most expensive tier at two of the largest incumbents:

- **Asana** — audit log API requires Enterprise+, legacy Enterprise, or Enterprise with the Compliance Management add-on.
- **Notion** — audit log is Enterprise-only, retains 365 days, and **does not backfill**: events are recorded only from the moment of upgrade, so a team that upgrades during an incident cannot see the period they are investigating.

That non-backfill detail is the sharpest thing in this analysis. It means the moment a team discovers they need an audit trail is precisely the moment it is too late to get one. A product where the trail is on from day one, for everyone, at a small-team price is materially different — not as a feature comparison, but as a different answer to "when do I need to have decided this?"

**But the seam is not universal.** Jira includes audit logs at its Standard tier, around $7.91 per user per month. So "audit trail without enterprise pricing" is a real gap against Asana and Notion, and no gap at all against Atlassian. Any positioning must name the incumbent it displaces rather than claim a category-wide gap.

### 2.3 Isolation is an engineering property, not a purchase reason

Nobody buys "row-level tenancy enforcement." Buyers respond to a forcing function:

1. A **client contract or security questionnaire** demanding data separation.
2. A **past incident** — someone saw something they should not have.
3. A **regulated client** (health, finance, legal, government) whose requirements flow through to the vendor.
4. An **insurance or certification** requirement.

Absent one of these, isolation and audit are a vitamin, and vitamins do not win switching decisions against incumbents with ten times the surface area.

**This is the single question the research below exists to answer:** does a findable segment have one of these forcing functions, strongly enough to adopt a tool with none of the workflow features they currently rely on?

### 2.4 The honest current status

As it stands today this is a **reference implementation, not a market entrant**. That is not a criticism of the build — the tenancy and audit work is genuinely more rigorous than most shipped SaaS — but a product with no differentiated workflow, no integrations, no mobile, no billing, and an unvalidated segment is pre-product. The docs already say as much; this document just refuses to soften it.

---

## 3. Three candidate positionings, ordered by credibility

### Position A — Developer infrastructure, not an end-user product *(most credible)*

Sell what actually exists and is actually hard: a rigorously built, well-documented multi-tenant foundation — tenancy guard, layered RBAC, invite lifecycle, append-only audit, threat model, ADRs, migration history, security review.

- **Buyer:** a developer or small team starting a B2B SaaS, who would otherwise spend weeks getting tenancy wrong.
- **Why credible:** the asset is the correctness and the documentation, which is exactly what the repository already is. No workflow gap to close, no incumbent to displace.
- **Competition:** SaaS boilerplate/starter-kit market — a crowded but transactional market with no switching costs and no feature-parity bar.
- **Evidence needed:** would a developer pay for this over a free template? What is the alternative they use today?

### Position B — Compliance-forced client workspaces *(narrow, defensible if the segment exists)*

Target agencies and service firms serving **regulated clients**, where the client's compliance requirements flow through to the vendor.

- **Buyer:** the ops or security lead who fills in client security questionnaires.
- **Wedge message:** "The audit trail is on from day one, for every workspace, at a price a ten-person firm can pay — not switched on at the moment you already need last month's history."
- **Why it could work:** the forcing function is external and dated. Questionnaires and contract clauses create deadlines, which create purchases.
- **Risk:** these buyers may need SOC 2 attestation from the vendor itself, which is a serious cost commitment — practitioner guides put SOC 2 spend well into five figures for small organizations. Being unable to answer their questionnaire kills the deal regardless of product quality.

### Position C — Better general task management *(not recommended)*

Head-on competition on workflow surface. Requires building everything in the PRD's non-goals list before reaching parity, against incumbents at $4–10 per seat. No credible path.

---

## 4. Research plan

**Objective.** Determine whether a reachable segment has a forcing function strong enough to adopt a workspace tool that trades workflow features for enforced isolation and always-on audit — and if so, which incumbent it displaces.

**Method.** 8–10 semi-structured interviews, 45 minutes, split across no more than two segments (the PRD already caps this correctly). Interviews, not surveys: the question is *why they last changed something*, which surveys cannot reach.

**Recruiting screen.** Qualify only participants who, in the last 12 months, have either:

- completed a client security questionnaire or contract security review, **or**
- separated client work into distinct workspaces deliberately, **or**
- had to reconstruct who changed or accessed something.

Anyone who fails all three is out of segment. Screening these out is the point — a warm interview with an unqualified participant is the most common way research produces false encouragement.

**Timeline.** Two weeks recruiting and interviewing, three days synthesis.

### Interview guide

**Warm-up (5 min).** What does your team do, how many people, how many clients or workspaces at once?

**Context — current workflow (10 min).** *Ask them to show you, not describe.*
- Walk me through setting up a new client from signed contract to them having access. Screen-share it.
- Where does their work actually live? What else touches it?
- Who can see it? Show me where that is configured.

**Deep dive — the forcing function (20 min).** This is the section that decides everything.
- Tell me about the last time someone had access they should not have had. What happened, who noticed, what did you do?
- Have you been asked how you separate client data? By whom, in what form, what did you answer?
- When did you last need to know who changed something? Walk me through how you found out. How long did it take?
- What happens to a departing employee's access? Show me the last time you did it.
- Has a client ever asked to see an activity or access record?

**Reaction (10 min).** Show the workspace, roles, and the audit feed.
- What would you use this instead of? *(If the answer is "nothing" the participant is not in market.)*
- What is missing that would stop you using it next Monday?
- Who besides you would have to agree?

**Wrap-up (5 min).** What did I not ask about that matters? Who else should I talk to?

### Kill criteria — decide before you start

Commit to these now, so a run of pleasant interviews cannot be read as validation:

- **Fewer than 4 of 10** participants can name a specific, dated forcing-function incident → **Position B is dead.** Stop; do not build workflow features hoping to find demand later.
- **6 or more** name one, but all resolve it with a tool they already pay for → the gap is real but already served. Re-target or stop.
- **6 or more** name one *and* describe their current answer as manual, absent, or embarrassing → proceed to a paid pilot with 3 design partners, per the PRD's launch criteria.
- **Any participant** says a vendor SOC 2 report is a hard gate → price that obligation into the plan before writing more code, since it likely exceeds all other costs combined.

### What would make this a real competitor

In order, and only if the research clears the bar above:

1. A named displacement target ("agencies leaving Notion when a client asks for access history"), not a category claim.
2. One workflow feature the incumbent cannot copy in a sprint — otherwise "always-on audit" becomes a checkbox on someone else's roadmap.
3. An answer to the security questionnaire the buyer will send you.
4. Migration in from wherever the work lives today. No team retypes their tasks.

---

## 5. Recommendation

Run the interviews before writing another feature. The build quality is not the bottleneck and more of it will not resolve the uncertainty — the segment question is upstream of everything in the roadmap.

If the interviews come back thin, **Position A is the graceful landing**: the same codebase, sold to a buyer who values exactly the property the current work already delivers, with no workflow gap to close.

---

*Market pricing and feature-tier claims in section 2 were checked in September 2026 against vendor documentation and current comparison sources; re-verify before using any figure externally, as tiers move.*
