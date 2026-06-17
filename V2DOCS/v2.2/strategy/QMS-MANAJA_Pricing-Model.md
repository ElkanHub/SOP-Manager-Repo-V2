# QMS-MANAJA — Pricing Model

**Date:** 2026-06-16 · **Status:** Draft for validation
**Companion to:** `Tenancy and Feature Packaging Strategy.md`, `QMS-MANAJA_Platform_Strategy_Consolidated.md`

> **Read this first.** All numbers below are **USD anchors**, deliberately positioned *well below* global QMS tools (Veeva/MasterControl/Qualio run $10k–$100k+/yr) and *above* commodity SaaS, for the West-Africa regulated-pharma market. They are **starting points to validate in your first 3–5 discovery calls**, not final prices. Tune them where buyers flinch.

> **💱 Exchange-rate assumption: ₵13.5 = $1** (single editable parameter — **update to the live rate before quoting**). GHS figures are **indicative only**; the recommended model is **USD-list price, settled locally** (Paystack / mobile money / bank transfer), with annual contracts **pegged to USD** so cedi swings don't erode the deal. Quick reference: **$100 ≈ ₵1,350**.

---

## 1. Pricing philosophy (what we price *by*)

| Lever | Role | Why |
|---|---|---|
| **GMP site × tier** | **Primary** | One license = one regulated site. Maps to how pharma thinks; predictable; multi-site = natural upsell. |
| **Role-based seats** | Secondary | Charge **Full seats** (QA / HOD / author / approver). **Member seats** (read + acknowledge + train) are **free & unlimited** — avoids the operator-seat trap and drives full adoption. |
| **Add-ons** | Expansion | Capabilities not everyone needs; bundled into the invoice as line items. |
| **AI credits** | Metered | Real marginal cost → always metered, marked-up, isolated from base. |
| **Services** | One-time | Installation, migration, validation/CSV — expected paid work in pharma. |

**Value basis:** audit-readiness + QA-labor replacement. Anchor every quote against *"what does one failed inspection / recall / WHO-PQ delay cost you?"* — never against "a document tool."

**Currency & billing:** price in **USD, collect locally** to dodge cedi volatility on annual contracts. **Annual-first** (stability for compliance buyers, lower churn, fixes FX); monthly available at list; annual prepay saves 15%.

---

## 2. License tiers (per site)

| | **Core QMS** | **QMS Professional** | **QMS Enterprise** |
|---|---|---|---|
| **Monthly (list)** | **$300** · ₵4,050 | **$750** · ₵10,125 | from **$1,500** · ₵20,250 |
| **Annual (save 15%)** | **$3,060** · ₵41,310 | **$7,650** · ₵103,275 | from **$15,300** · ₵206,550 (custom) |
| **Pricing** | Public | Public | Custom / contract |
| **Included Full seats** | 5 | 15 | 40+ (custom) |
| **Member seats (read/ack/train)** | Unlimited | Unlimited | Unlimited |
| **Active SOP fair-use** | 300 | 1,500 | Unlimited |
| **Storage** | 10 GB | 50 GB | Custom |
| **Sites** | 1 | 1 | Multi-site |
| **Support** | Email | Priority email | Priority + SLA |

**Target buyer:** Core → small manufacturers/labs leaving spreadsheets · Professional → growing GMP sites with QA oversight, training & equipment needs · Enterprise → multi-site, exporters, external-auditor exposure.

---

## 3. What's included where (feature → tier → entitlement key)

| Capability | Entitlement key | Core | Professional | Enterprise |
|---|---|:--:|:--:|:--:|
| SOP library + upload | `sop_library` | ✅ | ✅ | ✅ |
| HOD/QA approval workflow | `sop_approvals` | ✅ | ✅ | ✅ |
| Structured numbering + Master Index | `document_numbering` | ✅ | ✅ | ✅ |
| **Single-document change control** | `change_control_basic` | ✅ | ✅ | ✅ |
| Audit trail + digital signatures | `audit_trail` | ✅ | ✅ | ✅ |
| Core dashboard + Pulse | `dashboard_core` | ✅ | ✅ | ✅ |
| **Multi-document change control** | `change_control_multi_document` | ➕ add-on | ✅ | ✅ |
| Training compliance | `training_compliance` | ➕ add-on | ✅ | ✅ |
| Equipment + PM | `equipment_pm` | ➕ add-on | ✅ | ✅ |
| Request hub + advanced reports | `advanced_reports` | ➕ add-on | ✅ | ✅ |
| AI Compliance Assistant | `ai_assistant` | ➕ add-on | ➕ add-on | ➕ add-on |
| Controlled-copy management | `controlled_copies` | — | — | ✅ |
| Retention / destruction workflow | `retention_destruction` | — | — | ✅ |
| Auditor portal | `auditor_portal` | ➕ add-on | ➕ add-on | ✅ |
| API / integrations | `api_access` | — | — | ✅ |
| White-label branding | `white_label_branding` | ➕ add-on | ➕ add-on | ✅ |
| Multi-site governance | `multi_site` | — | — | ✅ |

✅ included · ➕ available as paid add-on · — not available at that tier
*(The Change Control unification just shipped maps directly to `change_control_multi_document` — Core gets the single-doc path through the same engine; Pro/add-on unlocks the request → hub → reconciliation flow.)*

---

## 4. Seats

| Item | USD | GHS (₵13.5/$) |
|---|---|---|
| Member seat (read + acknowledge + train) | **Free, unlimited** (all tiers) | — |
| Additional Full seat — monthly | $18 / seat / mo | ₵243 / seat / mo |
| Additional Full seat — annual | $180 / seat / yr | ₵2,430 / seat / yr |
| Full-seat block of 5 — annual | $816 / yr | ₵11,016 / yr |

A "Full seat" = anyone who creates, reviews, approves, or manages records (QA, HOD, author, approver, equipment manager, trainer-author).

---

## 5. Add-ons (per site — for Core sites, or capabilities above a tier)

| Add-on | Monthly (USD · GHS) | Annual −15% (USD · GHS) | Notes |
|---|---|---|---|
| Advanced (multi-document) Change Control | $120 · ₵1,620 | $1,224 · ₵16,524 | Included in Professional |
| Training Compliance Pack | $150 · ₵2,025 | $1,530 · ₵20,655 | Included in Professional |
| Equipment & PM Pack | $150 · ₵2,025 | $1,530 · ₵20,655 | Included in Professional |
| Advanced Reporting Pack | $90 · ₵1,215 | $918 · ₵12,393 | Included in Professional |
| Auditor Portal | $100 · ₵1,350 | $1,020 · ₵13,770 | Included in Enterprise |
| White-label branding | $120 · ₵1,620 | $1,224 · ₵16,524 | Included in Enterprise |
| **AI Compliance Assistant** | $60 · ₵810 + credits | $612 · ₵8,262 + credits | See §6 |

Add-ons appear as **line items on the subscription invoice**, not separate bills.

---

## 6. AI Compliance Assistant (metered credits)

**Base add-on $60/site/mo (₵810)** includes **750 credits/month** (roll over, hard cap when exhausted). QA-restricted by default; all output requires human review.

**Credit consumption (illustrative):**

| AI action | Credits |
|---|---|
| Change-control delta summary | 3 |
| Risk-insights report | 5 |
| Training questionnaire generation | 8 |
| Training slide-deck generation | 10 |
| AI SOP draft assist | 12 |

**Top-up bundles (roll over):**

| Bundle | Credits | USD | GHS (₵13.5/$) | ~ per credit |
|---|---|---|---|---|
| Starter | 1,000 | $90 | ₵1,215 | $0.090 |
| Growth | 3,000 | $225 | ₵3,038 | $0.075 |
| Scale | 8,000 | $520 | ₵7,020 | $0.065 |

> Credits are priced at a **3–5× markup over raw model cost** to cover infra, the human-review requirement, and margin. Never bundle AI into base tiers — it protects your headline price and your margin. Tenant admins request more; Platform Owner approves.

---

## 7. One-time services (priced — onboarding itself is free)

| Service | USD | GHS (₵13.5/$) |
|---|---|---|
| Implementation / Installation — Core | $1,500 | ₵20,250 |
| Implementation / Installation — Professional | $3,500 | ₵47,250 |
| Implementation / Installation — Enterprise | custom | custom |
| Data migration | $1,000 → $5,000+ | ₵13,500 → ₵67,500+ |
| **Validation / CSV support pack** (IQ/OQ/PQ + vendor audit dossier) | $2,500 – $6,000 | ₵33,750 – ₵81,000 |
| Live onboarding / training workshop | $750 / day | ₵10,125 / day |
| Archive recovery (reactivate an archived org) | $500 + reinstated subscription | ₵6,750 + subscription |

The validation/CSV pack is often the **actual deal-closer** in pharma procurement — price it with confidence.

---

## 8. Discounts & deal levers

| Lever | Discount |
|---|---|
| Annual prepay | −15% |
| 2-year commitment | −25% |
| **Founding / design partner** (first ~5 customers) | **−35%, locked 2 yrs**, in exchange for a reference + case study |
| Multi-site (Enterprise) | Negotiated per contract |

---

## 9. Worked examples (annual)

**A. Small QC lab — Core, annual**
4 Full seats (within 5), 60 operators (free), no AI.
- Subscription: **$3,060 · ₵41,310 / yr**
- Year-1 services: Install $1,500 + migration $1,000 = $2,500 · ₵33,750
- **Year 1: $5,560 · ₵75,060 — thereafter $3,060 · ₵41,310 / yr**

**B. Growing pharma manufacturer — Professional, annual**
15 Full seats (incl.) + 5 extra ($816) · AI add-on ($612) + one Growth top-up ($225) · 200 operators (free).
- Subscription: $7,650 + $816 + $612 + $225 = **$9,303 · ₵125,591 / yr**
- Year-1 services: Install $3,500 + migration $3,000 + validation pack $3,500 = $10,000 · ₵135,000
- **Year 1: $19,303 · ₵260,591 — thereafter ~$9,303 · ₵125,591 / yr**

**C. Multi-site exporter — Enterprise, 2 sites, annual**
Custom $30,000/yr (incl. auditor portal, white-label, controlled copies, API) · AI Scale top-ups · 40 Full + unlimited members.
- Subscription: **~$30,000 · ₵405,000 / yr**
- Year-1 services: Install + migration + validation across 2 sites ≈ $15,000 · ₵202,500
- **Year 1: ~$45,000 · ₵607,500 — thereafter ~$30,000 · ₵405,000 / yr + AI usage**

---

## 10. Guardrails (what NOT to do)

- ❌ Don't price primarily per user → operator-seat trap kills adoption and the audit-trail value.
- ❌ Don't bundle AI into base tiers → silent margin bleed.
- ❌ Don't meter by document count → it punishes the behavior you want (all SOPs in the system).
- ❌ Don't price too low → in regulated industries, "too cheap" reads as "not validated / not serious."
- ❌ Don't lock annual prices in cedi without an FX clause — quote/settle locally, but **peg the contract to USD**.

---

## 11. Assumptions & open numbers to confirm

- All figures **USD, illustrative anchors**; **GHS converted at ₵13.5/$ (update to live rate)**. Validate via discovery (ask each prospect: current QA-labor cost, audit-prep time, cost of their last finding; watch where they flinch).
- To finalize before public launch: exact per-seat amount, annual-discount %, Enterprise floor, AI credit markup vs. real model cost, special pricing for very small companies, and the **collection-currency policy** (USD list + local settlement recommended).
- Map each entitlement key in §3 to the `features` / `plans` / `plan_features` tables when the entitlement layer is built.
