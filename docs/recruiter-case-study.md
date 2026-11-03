# WorkTwin — AI policy guidance in a regulated care setting

**Status: controlled-preview prototype. Not approved for unsupervised staff use.**

WorkTwin explores how care staff could find approved workplace guidance and think through realistic scenarios, while keeping sensitive decisions with appropriate human colleagues.

This case study is a public portfolio summary. It deliberately omits stakeholder identities, internal approval records, deployment configuration and confidential policy content.

## The business problem

Care staff need to understand what to do next, which approved policy supports their decision and when to escalate. A conversational interface is useful only if the source material is eligible for use, access is appropriate and the system can decline an unsafe or unsupported answer.

The product question was therefore broader than “can an AI answer a policy question?” It was whether a governed assistant could provide useful guidance within clear operational boundaries.

## Discovery and product decisions

Documented stakeholder feedback moved the prototype towards **guidance-led scenarios**, rather than duplicating the care-recording tools already in use.

That led to three priorities:

- Explain the next step and when human escalation is needed.
- Show the approved source supporting an answer.
- Keep prototype demonstration, staff access and wider operational use as distinct readiness stages.

The feedback is qualitative discovery evidence. It does not establish paid demand, adoption or a quantified productivity benefit.

## Prototype architecture

The implementation combines:

- A Next.js and TypeScript interface.
- A Python/FastAPI application layer.
- PostgreSQL with vector retrieval for eligible source material.
- OpenAI embeddings and answer generation.
- Document-governance gates, organisation-scoped access and human-escalation paths.

The intended flow is: question → access and source-eligibility checks → retrieval → response with source references or escalation.

Frameworks and model services supply core capabilities. The portfolio demonstrates how they are assembled around a domain problem; it does not claim a new foundation model or retrieval algorithm.

## Quality and evaluation

A historical controlled evaluation dated **22 May 2026** recorded **10 questions: eight passes, two safe/amber observations and no failures**. Three sensitive questions escalated to human support.

The amber observations included conservative escalation and imperfect source relevance. This small test set informed further work; it is not a production accuracy estimate, clinical validation or comprehensive safety assessment.

Source-label checks and fallback behaviour are implemented, but a citation label does not independently prove that every generated statement is supported. High-risk pattern matching also has limitations. “Source-referenced prototype with safeguards” is a more accurate description than “hallucination-free” or “guaranteed safe”.

## Testing and safeguards

Repository tests cover areas including authentication, membership, organisation boundaries, document governance, sensitive scenarios and fallback behaviour. Frontend smoke and middleware tests also exist.

**Audit baseline checked 3 November 2026:** the recorded 33/33 smoke-test result belongs to an earlier checkpoint. At the audited code head, the [6 July 2026 workflow](https://github.com/inaambasit/worktwin-care-pilot/actions/runs/28798280755) passed the backend job but failed frontend smoke tests; later middleware/build steps were skipped. That baseline is historical, and the exact failing assertion was not established in the portfolio audit. Check current workflow results before relying on any later validation claim.

No real confidential staff or service-user information is permitted in the controlled preview. This boundary does not replace content permissions, organisational approval or an independent privacy/security review.

## What was demonstrated

The committed evidence supports a working controlled-preview interface, governed retrieval/response paths, escalation examples, documented product iteration and historical test checkpoints.

It does **not** substantiate a production release, paying users, general staff adoption, independently certified security or measured time savings.

## My contribution

My work brings together care-domain product direction, translation of stakeholder feedback into requirements and iterative, AI-assisted implementation. The repository history provides an inspectable record of development and documentation; third-party frameworks and services remain credited.

The project is most relevant to roles combining customer discovery, commercial judgement, domain expertise and collaboration with technical teams.

## Remaining work

- Investigate and resolve the recorded frontend validation failure, then rerun meaningful checks.
- Broaden evaluation for retrieval relevance, unsupported statements and escalation behaviour.
- Complete content-permission and organisational approval gates.
- Confirm deployment readiness and independently review privacy/security before wider use.
- Validate customer value through an authorised pilot, without assuming commercial outcomes.

[Professional background](https://www.linkedin.com/in/inaambasit)
