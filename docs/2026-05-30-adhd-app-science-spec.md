# ADHD App — What It Actually Does (Science-Grounded Spec)

> Companion to `2026-05-30-android-money-app-research.md`. Every feature below is tied to peer-reviewed evidence or a clinical guideline. Sources inline. Researched 2026-05-30 via 4 parallel clinical-research agents (PubMed/JMIR/NICE/FDA/FTC/GDPR).

## One-line definition
A **self-monitoring + medication-titration companion** for adults with ADHD: timed daily check-ins that capture how meds and symptoms actually behave across the day, turned into a structured report you hand your prescriber — wrapped in optional peer community. **Positioned as a wellness/self-management tool, NOT a diagnostic or treatment device** (this keeps it out of FDA SaMD regulation — see §Regulatory).

---

## Why each feature exists (the evidence)

### 1. Daily symptom self-monitoring (the core loop)
**What:** 2–4 brief check-ins/day (<2 min each): focus, restlessness, impulsivity, mood, energy. Likert 1–5.
**Why it's real:**
- Self-monitoring itself produces measurable behavior change ("reactivity effect") — off-task behavior dropped 46.8%→27.3% in self-monitoring studies ([ERIC](https://files.eric.ed.gov/fulltext/EJ1143820.pdf), [PubMed](https://pubmed.ncbi.nlm.nih.gov/30889976/)). Digital CBT self-monitoring shows moderate-large effects (d=0.70 symptoms, d=0.53 QoL) ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10033990/)).
- EMA (ecological momentary assessment) in ADHD achieves ~84% completion when burden is low ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12579720/)). **Lower burden = higher completion (p=.018).** → keep it short.
**Caveat to respect:** reactivity fades when tracking stops → must pair with feedback/goals, not pure logging.

### 2. Medication titration tracker (the killer feature)
**What:** Log dose + time; app prompts check-ins timed to the drug's pharmacokinetics to capture onset, peak, wear-off, and rebound. Auto-builds a prescriber report.
**Why it's real:**
- NICE NG87 explicitly says ADHD symptoms + adverse effects "should be recorded at baseline and at each dose change on standard scales" ([NICE NG87](https://www.nice.org.uk/guidance/ng87/chapter/recommendations)). Titration is weekly dose-stepping over 3–4 weeks ([CADDRA](https://caddra.ca/pdfs/caddraGuidelines2011.pdf)).
- Pharmacokinetics the app should time check-ins to (so data captures real effect):

| Formulation | Onset | Peak | Duration |
|---|---|---|---|
| Methylphenidate IR | 20–30 min | ~1.9h | 3–6h (high rebound) |
| Concerta (MPH ER) | ~1h | biphasic 1–2h + 6–10h | 10–12h |
| Adderall XR | 20–30 min | ~5h | 10–12h |
| Vyvanse | rapid (prodrug) | ~3.5h | 12–14h (lowest rebound) |
([Psychiatrist.com](https://www.psychiatrist.com/pcc/stimulant-formulations-for-adhd/), [T&F PK review](https://www.tandfonline.com/doi/full/10.1080/17425255.2019.1675636))
- **Rebound/"afternoon crash" is clinically documented** (dopamine/NE dip below baseline → fatigue, irritability, hunger), worst late afternoon, sharper on IR ([Cleveland Clinic](https://health.clevelandclinic.org/avoiding-adhd-crash/), [Additude](https://www.additudemag.com/adhd-medication-rebound/)). Logging 4–6 PM specifically taps an under-served clinical gap.
- Structured logs measurably improve titration appointments — "writing each day how you feel… is the best insight into whether that dosage is right" ([Additude](https://www.additudemag.com/titrate-medication-adhd/)); general "how are you?" misses ~3× the side effects a checklist catches ([PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5938315/)).

### 3. Side-effect monitoring with safety flags
**What:** Short checklist (appetite, sleep, headache, mood, anxiety, tics, heart-rate sensation) on a severity scale. Safety-critical items (chest pain, palpitations, fainting, suicidal ideation, severe weight loss) trigger a **"contact your doctor / seek urgent care"** message — informational only, never a dose suggestion.
**Why it's real:** Modeled on the **Barkley Side Effects Rating Scale (SERS)** — validated, stimulant-specific ([PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5938315/)). Cardiovascular symptoms are the genuine safety concern in stimulant titration ([AAFP](https://www.aafp.org/family-physician/patient-care/prevention-wellness/emotional-wellbeing/adhd-toolkit/risk-reduction.html)).

### 4. Validated symptom scale (legal to embed)
**What:** Periodic (weekly) **ASRS v1.1** check (6-item screener or 18-item).
**Why ASRS specifically:** It's the WHO/Kessler adult self-report scale, **copyrighted but free to use in apps** (attribution only — no license fee) ([Psychology Tools](https://psychology-tools.com/test/adult-adhd-self-report-scale), [CADDRA](https://www.caddra.ca/wp-content/uploads/ASRS.pdf)). **Avoid CAARS and BAARS-IV — both require paid licenses** (Multi-Health Systems / Guilford Press). **WFIRS** (functional impairment) is also free ([Weiss/CADDRA](https://www.caddra.ca/wp-content/uploads/WFIRS-S.pdf)).

### 5. Functional impact tracking (not just symptoms)
**What:** Weekly check across WFIRS domains: work/school, family, life skills, social, self-concept, risky behavior.
**Why it's real:** Prescribers judge med success by **real-world function, not just symptom scores** — WFIRS is the gold-standard ADHD functional scale and free to use ([PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6241626/), [mhscales](https://mhscales.com/wfirs)).

### 6. Sleep tracking
**What:** Daily sleep onset, duration, quality, daytime energy.
**Why it's real:** **60–80% of adults with ADHD have sleep disturbance** (DSPS 36%, insomnia 30%) — far above general population, and the relationship is **bidirectional** (worse sleep → worse ADHD and vice versa) ([Sage 2024](https://journals.sagepub.com/doi/abs/10.1177/10870547241284477), [Frontiers 2024](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2024.1528979/full)). Highest-value modifiable signal.

### 7. Emotional dysregulation tracking
**What:** Daily mood-lability / emotional-control rating; trigger logging.
**Why it's real:** Emotional dysregulation affects ~50–80% of adults with ADHD — effect sizes rival the core inattention/hyperactivity symptoms ([meta-analysis PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7069054/), [PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0280131)). This is core, not fringe.

### 8. Comorbidity check-ins (anxiety / depression)
**What:** Weekly GAD-7 (anxiety) and PHQ-9 (depression)-style ratings.
**Why it's real:** ~47% of adults with ADHD have comorbid anxiety; 18–53% depression; ~70% have at least one comorbidity ([Frontiers 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12179154/), [PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0277175)).

### 9. Menstrual-cycle phase (for women users)
**What:** Optional cycle tracking correlated with symptom severity + medication efficacy.
**Why it's real:** Emerging mechanistic evidence — estrogen regulates dopamine; estradiol drops in the luteal/premenstrual phase worsen inattention/impulsivity and **reduce medication efficacy** ([PMC 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12420372/)). Directly relevant to the huge r/adhdwomen audience.

### 10. Peer community (the retention + monetization moat)
**What:** Anonymized feed, med-cohort threads ("first month on Vyvanse"), shared wins.
**Why it's real (and its limits):** Online ADHD peer groups provide informational + emotional + social support and reduce isolation ([PMC 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12885087/)) — **but evidence is qualitative, not RCT.** So: community is a *support/engagement* feature, **not** claimable as treatment.

---

## What it must NOT do (regulatory guardrails — these are hard limits)
- **No diagnosis, no treatment claims, no dose recommendations.** The moment the app says "you have ADHD" / "this reduces ADHD" / "adjust your dose," it becomes an FDA-regulated medical device (SaMD) needing 510(k)/De Novo clearance ([FDA SaMD](https://www.tactionsoft.com/blog/fda-samd-software-as-medical-device-compliance-guide/), [APA](https://www.apaservices.org/practice/business/technology/tech-talk/wellness-treatment-digital-mental-health)). EndeavorRx needed 600+ patients across 5 studies + De Novo just to claim "improves attention" ([Akili](https://www.akiliinteractive.com/news-collection/akili-announces-endeavortm-attention-treatment-is-now-available-for-children-with-attention-deficit-hyperactivity-disorder-adhd-al3pw)).
- **Safe framing:** "track your symptoms," "for self-awareness," "share with your doctor," "complements clinical care." Stays in the FDA **general-wellness safe harbor** — no clearance needed.
- **Crisis items** (suicidal ideation, hallucinations) → route to crisis resources, do not treat as a "symptom to log."

## Compliance (real obligations even without HIPAA)
- **HIPAA generally does NOT apply** to a direct-to-consumer app with no provider integration ([Accountable HQ](https://www.accountablehq.com/post/adhd-patient-data-privacy-your-rights-hipaa-rules-and-how-to-stay-protected)) — BUT:
- **FTC Health Breach Notification Rule (2024) DOES apply** to consumer health apps: encryption at rest + in transit, breach-notice within 60 days, accurate privacy policy ([FTC](https://www.ftc.gov/business-guidance/blog/2024/04/updated-ftc-health-breach-notification-rule-puts-new-provisions-place-protect-users-health-apps)).
- **GDPR** if any EU/UK users: ADHD data = Article 9 special-category → **explicit, specific consent** (not bundled into ToS), deletion/export rights ([Drata](https://drata.com/learn/gdpr/for-healthcare)).
- Practical: encrypt everything, explicit health-data consent screen, data-export + delete, plain-language privacy policy. Achievable solo.

## Evidence-honesty table (what you can and can't claim)
| Claim | Evidence | Can market it? |
|---|---|---|
| "Track your ADHD symptoms" | RCTs + EMA studies | ✅ wellness |
| "Prep better for your doctor" | NICE/CADDRA guidelines | ✅ |
| "Peer support reduces isolation" | Qualitative (n=20) | ✅ wellness, soft |
| "Improves attention" | EndeavorRx RCT | ❌ SaMD — needs FDA |
| "Reduces / treats ADHD" | meta-analysis exists | ❌ SaMD |
| "Replaces medication" | none | ❌ never |

## Design rules from the evidence (so an ADHD brain keeps using it)
- Check-ins <2 min; lower burden directly raises completion ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12579720/)).
- Gamification/streaks raised EMA completion 73%→83% — use it ([JMIR Serious Games](https://games.jmir.org/2025/1/e60937)).
- Context-triggered reminders (at dose time) beat ad-hoc notifications; avoid notification fatigue ([JMIR Mental Health](https://mental.jmir.org/2025/1/e56066)).
- Co-design with ADHD users from the start — apps that did had higher engagement (ibid).
- **Market gap confirmed:** a 2025 systematic review found *zero overlap* between published ADHD-app evidence and apps actually on the market ([JEHP 2025](https://journals.lww.com/jehp/fulltext/2025/12290/mobile_health__mhealth__apps_for_adhd__a.522.aspx)) — i.e., evidence-grounded design is itself a differentiator.

---

## The product in one paragraph
ElderHome's ADHD sibling — call it **Titrate** — is a low-friction daily tracker whose unique value is **medication titration intelligence**: it knows methylphenidate IR peaks at ~2h and crashes by hour 4–6, so it asks you the right question at the right time, then hands your prescriber a clean chart of symptom relief, side-effects, rebound timing, and functional change across your last 30 days. Around that core: sleep, emotional regulation, anxiety/depression, and (for women) cycle-phase effects — every signal chosen because the literature says it moves ADHD. Plus an anonymized peer community for the part medicine can't give: "me too." It never diagnoses, never doses, never claims to treat — which is exactly what keeps it a shippable wellness app instead of a multi-million-dollar FDA trial.
