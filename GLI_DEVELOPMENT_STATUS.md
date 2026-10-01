# Dream Education — GLI Development Program

This branch is the isolated development line for the Global Learning Intelligence program.

## Roadmap coverage

1. Learner Intelligence Graph — durable snapshots and graph persistence.
2. Mastery / retention — retention-risk signals and review scheduling signals.
3. Misconception intelligence — unresolved and recovered misconception evidence.
4. Next-best learning action — correction, retrieval, review, transfer, practice, or assessment.
5. Transfer intelligence — readiness based on observed mastery evidence.
6. Learning Method Intelligence — evidence-aware method selection while respecting learner preference.
7. Personal Learning Memory — preferences, recent learning, strengths and gaps.
8. Curriculum Intelligence — concept status and next progression point.
9. Teacher Intelligence — existing role intelligence preserved.
10. Parent Intelligence — existing role intelligence preserved.
11. School Intelligence — existing role intelligence preserved.
12. Outcomes / evidence — existing telemetry, assessment, evidence and credential systems preserved.
13. Learning Passport / competencies — existing Dream Passport and competency credentials preserved.
14. Projects / portfolio — existing development projects plus GLI portfolio projection.
15. Offline learning — existing event normalization and deduplication preserved.
16. Production safety — additive migration, API privilege hardening, request IDs, rate limiting, body limits, protected engines.
17. Developer platform — existing tenant and scoped developer API preserved.

## Safety invariants

- The existing adaptive engines remain authoritative.
- No adaptive engine was duplicated or replaced.
- No destructive schema migration was introduced.
- The main branch is not modified by this branch.
- Owner/free-forever behavior is preserved.
- PayPal remains the intended subscription payment path; no M-PESA dependency was introduced.

## Verification

- Production Supabase schema for learner graph snapshots was applied and re-queried.
- Public anon and authenticated SELECT access to backend-owned GLI tables was verified as disabled.
- Public/authenticated execution of rls_auto_enable() was verified as disabled.
- Node smoke-test and CI verification files were added for repeatable validation.
- A local clone/test attempt was blocked by the current execution environment's DNS/network restriction; therefore local npm test execution could not be honestly claimed as passed.
- The branch must remain unmerged until repository CI or an equivalent local test environment reports green.
