# 4S.100A — Capture Shagufta Feedback and Service-User Guidance Direction

**Slice:** 4S.100A  
**Date:** 2026-05-22  
**Status:** Documentation only — no code, SQL, env, auth, RAG or policy changes.  
**Checkpoint at slice start:** 51ded3c — Polish Ask sticky input and mobile viewport.

---

## 1. Context

Shagufta reviewed the controlled preview of Ask WorkTwin following the mobile polish sprint (slice 4S.99 series). Her review covered the Ask interface, the sticky input bar, and the trust/source UI visible to a care worker on a mobile device.

Feedback was positive. She understood the interface quickly, engaged with the concept, and saw clear value in providing care workers with a resource they could consult during a shift.

Her most significant contribution was identifying the next area of value. She agreed that the priority should shift from policy lookup toward **scenario guidance** — helping care workers understand what to do next when they face a real situation during a call.

---

## 2. Key Product Insight

WorkTwin should not only answer **"what does the policy say?"**

It should help care staff understand **what to do next** in realistic care situations, while:

- escalating safely when a situation requires senior, medication, safeguarding, or emergency input;
- avoiding duplication of the existing care-recording system the worker already uses;
- operating within clear fictional/demo boundaries during the controlled pilot.

This reframes WorkTwin from a policy search tool into a **safe, shift-time guidance companion**.

---

## 3. Feedback from Shagufta

The following scenarios were raised during the feedback session. Names and identifying details are fictionalised. No real service-user names, care plans, medication details or contact details appear below.

### Scenarios described

| # | Situation described |
|---|---|
| 1 | A senior or service user refuses to get out of bed during the morning call. |
| 2 | The person refuses food at the morning call. |
| 3 | The person has not eaten breakfast before their medication time. |
| 4 | The morning call is delayed, leaving the family member (a daughter) without enough time to attend as planned. |
| 5 | At the lunch call, the person refuses to go to the toilet and refuses to eat. |
| 6 | Another older person refuses to come inside and wants to remain in the garden. |

### Additional product direction from Shagufta

- Staff already record in their existing care system. WorkTwin scenarios should **not** focus on recording forms for now — that area is covered.
- The product should **guide the worker on what to do next** during the live situation, not prompt them to document what happened afterwards.

---

## 4. Product Direction

Based on Shagufta's feedback, the recommended shift is:

| Away from | Towards |
|---|---|
| "Practise and record what happened" | "Get safe guidance for what to do next" |
| Retrospective documentation flow | Live shift-time decision support |
| Policy lookup | Scenario-based guidance |
| Generic Q&A | Situation-specific, escalation-aware responses |

The scenario library should be rebuilt around this principle. Each scenario should open with a realistic situation, surface relevant policy guidance, indicate when to escalate, and close with a clear boundary statement about what WorkTwin does not replace.

---

## 5. Service-User Guidance Card Concept

A safe future pattern for WorkTwin is a **fictional service-user guidance card** — a structured profile used in demo and training scenarios to ground the worker in context before the scenario begins.

A guidance card for a fictional service user would include:

- **Fictional name and age** (demo only — not a real person)
- **Preferred routine** (e.g. prefers to be approached from the left, takes time to wake up, likes a cup of tea before conversation)
- **Known reassurance approach** (e.g. calm voice, familiar music, a specific phrase that helps them feel settled)
- **Safe family/contact route** (e.g. "if the situation is not resolving after ten minutes, inform the senior on duty — do not contact family directly without manager approval")
- **When to escalate** (e.g. refusal of medication beyond one missed dose, signs of distress, fall risk)
- **What not to do** (e.g. do not force or rush, do not raise voice, do not administer medication if breakfast has not been taken — follow medication policy and contact lead)
- **Relevant policy links** (e.g. Dignity and Respect Policy, Medication Administration Policy, Safeguarding Adults Policy)

### Critical boundary

Real service-user names, care plans, medication details, family contact details, and any other confidential information **must not** appear in the public controlled demo at any time. All guidance cards used in WorkTwin during the pilot must use entirely fictional, clearly labelled demo data.

---

## 6. Proposed Fictional Scenarios

The following two scenarios are proposed for the next development slice, based directly on Shagufta's feedback.

---

### Scenario A — Morning Call: Refusing Food, Personal Care and Medication Routine

**Situation:**  
The care worker arrives for the morning call. The service user (fictional: "Ada") refuses to get out of bed, declines breakfast, and has not eaten before their scheduled medication time.

**Staff concern:**  
The worker is unsure whether to proceed with personal care, whether to prompt medication without breakfast, and whether the situation needs to be escalated now or monitored first.

**What WorkTwin should guide:**
- Acknowledge refusal calmly and without pressure — dignity policy applies.
- Do not administer or prompt medication if the person has not eaten and the medication policy requires food first.
- Contact the medication lead or senior on duty to advise — do not make that decision independently.
- Document the refusal in the existing care-recording system as per normal procedure.
- Stay calm, offer an alternative (e.g. a small snack, a warm drink) and allow a short pause before re-attempting.

**When to escalate:**
- Medication cannot be administered safely without senior or medication-lead input — escalate immediately in that case.
- If the person appears distressed, unwell, or is showing new or changed behaviour, inform the senior on duty.
- If the situation is not resolving and the call must end, do not leave without informing the office.

**What WorkTwin must not do:**
- Give specific medication-administration instructions.
- Advise the worker to administer or withhold any medication independently.
- Replace the medication lead, registered manager, or emergency services.
- Replace the care-recording system.

---

### Scenario B — Service User Refuses to Come Inside from the Garden

**Situation:**  
The care worker is at the afternoon call. The service user (fictional: "George") is sitting in the garden and refuses to come inside. The weather is cold and the worker is concerned about safety.

**Staff concern:**  
The worker does not want to use force, is unsure how long to wait, and is concerned about leaving the person outside unsupervised.

**What WorkTwin should guide:**
- Do not use physical force or coercion — dignity and rights policy applies.
- Sit with the person calmly if safe to do so. Acknowledge their preference.
- Use a reassurance approach (known from the guidance card, if available): calm tone, familiar phrase, offer of something warm.
- If the person remains outside after a reasonable attempt, inform the senior on duty — do not leave the person alone without informing the office.
- Document the situation in the existing care-recording system.

**When to escalate:**
- If the person is at immediate risk (e.g. cold, confusion, distress, medical concern), call the senior immediately.
- If the situation cannot be safely managed within the call time, inform the office before leaving.
- If there are signs of a safeguarding concern, follow safeguarding procedure and escalate to the registered manager.

**What WorkTwin must not do:**
- Advise the worker to physically move or restrain the person.
- Replace the registered manager, safeguarding lead, or emergency services.
- Replace the care-recording system.

---

## 7. Safety Boundaries

The following boundaries apply to all service-user guidance content in WorkTwin, including fictional demo scenarios and guidance cards.

| Boundary | Rule |
|---|---|
| Data used in demo | Fictional only — no real service-user data of any kind |
| Names | Fictional names only — no real service users, family members or staff |
| Contact details | No real family, emergency or daughter/son contact details |
| Medication | No medication-specific instruction — always escalate to medication lead |
| Care plans | No real care plan content — demo scenarios use fictional, illustrative routines only |
| Replacing professionals | WorkTwin does not replace: senior carer, medication lead, registered manager, safeguarding lead or emergency services (999) |
| Care recording | Staff must continue using their existing care-recording systems — WorkTwin does not replace them |
| Controlled pilot scope | All guidance card and scenario content during the controlled pilot must use clearly labelled fictional data |

---

## 8. Recommended Next Slices

| Slice | Title |
|---|---|
| **4S.100B** | Redesign scenarios from recording-led to guidance-led |
| **4S.100C** | Add two fictional Shagufta-inspired scenarios |
| **4S.100D** | Add fictional service-user guidance card pattern |
| **4S.100E** | Dashboard and onboarding journey alignment |

---

*Documentation slice. No code, SQL, auth, RAG, policy or env changes. Safe to review without technical context.*
