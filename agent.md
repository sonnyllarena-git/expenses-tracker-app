---
name: agent-guidelines
description: Operational guidelines for building all apps, software, websites, and SaaS products using the super-project framework. Covers architecture decisions, code quality standards, security, testing, deployment, and communication protocols for Sonny's IT Department projects.
---

# Agent Guidelines for Sonny's Super-Project Framework

**Last Updated:** July 30, 2026  
**Version:** 1.0  
**Owner:** Sonny (sonnyl@thecreditpros.com)  
**Organization:** IT Department  
**Location:** Batangas, Philippines  

---

## Table of Contents
1. [Core Operating Principles](#core-operating-principles)
2. [Pre-Build Checklist](#pre-build-checklist)
3. [Architecture & Tech Stack Decisions](#architecture--tech-stack-decisions)
4. [Implementation Workflow](#implementation-workflow)
5. [Code Quality Standards](#code-quality-standards)
6. [Security & Compliance](#security--compliance)
7. [Testing Strategy](#testing-strategy)
8. [Documentation Requirements](#documentation-requirements)
9. [Deployment & DevOps](#deployment--devops)
10. [Communication Protocol](#communication-protocol)
11. [Windows-Specific Workarounds](#windows-specific-workarounds)
12. [Repository & File Structure](#repository--file-structure)
13. [Skill Workflow](#skill-workflow)
14. [Risk & Side-Effect Flagging](#risk--side-effect-flagging)

---

## Core Operating Principles

### 1. **One-Man Team Constraint is Decisive**
- **No parallelization:** Sequential builds only. Context-switching kills productivity.
- **Sequencing matters:** Complete one project phase fully before starting next.
- **ROI-focused:** Every decision evaluated against "will this make money faster?"
- **Scope creep prevention:** "Nice-to-have" features deferred to v2.0+.

### 2. **Offline-First as a Forcing Function**
- Phase 1 = Frontend only (React + Dexie/IndexedDB), zero backend dependencies.
- Automated CI checks block `fetch()`, `axios`, `console.log(sensitive_data)`.
- Tests & inspection happen via mock data + IndexedDB inspection only.
- Backend phase = deferred until Phase 2+ (unless explicitly requested).

### 3. **Production-Ready from Day One**
- No tech debt accumulation. Build right the first time.
- TypeScript strict mode (non-negotiable).
- 80%+ test coverage minimum (Jest for unit, Playwright for E2E).
- Security audits at every phase end.

### 4. **Empirical Over Theoretical**
- **Verify with actual data:** Don't guess at fixes. Check logs, test output, database state.
- **Flag uncertainties:** "I'm not certain, here's how to verify..." (never assume).
- **Proactive risk warning:** Call out production impact, security exposure, breaking changes **before** implementing.

### 5. **Documentation-as-You-Build**
- Code should be self-documenting (clear names, types).
- Inline comments for "why," not "what" (code reads the what).
- Generate ADRs (Architecture Decision Records) for tech choices.
- README.md updated every phase.

### 6. **Consistent Execution**
- Always read memory (`userMemories`) before responding.
- Always check applicable skills before starting work.
- Always follow the skill workflow (development-skill first, then engineering-skill).
- No deviations without explicit permission.

---

## Pre-Build Checklist

**Before writing ANY code, complete this checklist:**

- [ ] **Market validation**: Is there clear demand? (10+ potential customers identified)
- [ ] **Competitive analysis**: Who else is doing this? What's the gap?
- [ ] **Tech stack decision**: Node.js/Express? Python/FastAPI? Go/Gin?
- [ ] **Monetization model**: How will users pay? (Per-user/month? % commission? Flat fee?)
- [ ] **First customer profile**: Who is customer #1? Can I reach them?
- [ ] **Scope definition**: What's in MVP? What's deferred to v2.0?
- [ ] **Database schema**: Normalized? Any PH-specific assumptions (USD → PHP, state codes)?
- [ ] **Locale decisions**: US-centric defaults fixed? (Currency, date format, language)
- [ ] **Deployment target**: Vercel (frontend)? AWS/Azure/GCP (backend)?
- [ ] **Security audit**: OWASP Top 10 review? Data privacy (PH Data Privacy Act)?
- [ ] **Skill files**: Development plan created? Engineering roadmap ready?

---

## Architecture & Tech Stack Decisions

### **Default Tech Stack (Proven in Your Projects)**

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React 18 + TypeScript + Vite | Fast builds, strict typing, modern DX |
| **Styling** | Tailwind CSS | Rapid UI, consistent design tokens |
| **State** | Zustand | Lightweight, IndexedDB-friendly |
| **UI Components** | Radix UI | Accessible, unstyled, customizable |
| **Offline Data** | Dexie (IndexedDB) | Phase 1 only; powerful query API |
| **Backend** | Node.js + Express | Familiar, JavaScript ecosystem, fast |
| **Database** | PostgreSQL (primary) | ACID, relational, PH hosting available |
| **Cache** | Redis | Session, real-time, pub/sub |
| **Package Manager** | pnpm | Workspace support, disk efficient |
| **Testing** | Jest (unit) + Playwright (E2E) | Fast, reliable, modern |
| **CI/CD** | GitHub Actions | Free, integrated, sufficient for SME |
| **Deployment** | Vercel (frontend) + AWS/Azure (backend) | Global CDN, auto-scaling, pay-as-you-go |

### **When to Deviate**
- **Python/FastAPI**: If you need ML, data science, or async tasks (background jobs).
- **Go/Gin**: If you need extreme performance, concurrent connections (high-traffic APIs).
- **Monorepo layout**: pnpm workspaces (frontend, backend, shared libs all in one repo).

### **Database Decision Tree**

```
Is the data relational (users, orders, products)?
  → PostgreSQL (primary choice)
  
Is it unstructured or semi-structured (logs, JSON blobs)?
  → MongoDB (optional secondary)
  
Is it key-value or high-speed caching?
  → Redis (session, real-time)
  
Is it full-text search (products, articles)?
  → Elasticsearch (optional; Postgres JSONB often sufficient)
```

### **Locale Decisions (CRITICAL)**

**For Philippine deployment, ALWAYS:**
- Default currency: PHP (₱) not USD ($)
- Date format: YYYY-MM-DD (ISO 8601)
- Phone format: +63 or 0xx prefix
- Address: Province, Municipality, Barangay (not State)
- Holidays: Include PH-specific holidays (Araw ng Kagitingan, etc.)
- Tax: BIR compliance if invoicing/reporting is a feature
- Language: Support both English and Filipino (Tagalog)

**Schema review:** Before finalizing DB schema, flag any US-centric assumptions.

---

## Implementation Workflow

### **Always Use This Sequence**

1. **Gather Requirements & Questions**
   - What problem does this solve?
   - Who is paying? How much?
   - What's the happy path (core user flow)?
   - What's NOT in MVP?
   - Ask via Q&A before generating any prompts.

2. **Load Skill: `fullstack-development-skill`**
   - Strategic planning layer (7 phases, security, trade-offs)
   - Generate: Architecture diagram, schema design, API spec, security checklist
   - Deliverable: Requirements doc + ADR (Architecture Decision Record)

3. **Tech Stack Decision**
   - Confirm frontend framework (React default)
   - Confirm backend language (Node.js/Express default)
   - Confirm database (PostgreSQL default)
   - Flag any deviations + rationale

4. **Load Skill: `fullstack-engineering-skill`**
   - Tactical implementation layer (8 phases, exact commands)
   - Generate: Phase-by-phase roadmap, monorepo bootstrap script, complete code examples
   - Deliverable: Runnable development environment + first backend endpoint

5. **Phase-by-Phase Execution**
   - Phase 1 (Week 1): Monorepo setup, local dev environment, Docker, CI/CD foundation
   - Phase 2-4 (Weeks 2-5): Backend API + Web frontend (core features only)
   - Phase 5-8 (Weeks 6-12): Mobile/Desktop (if required) + deployment
   
6. **Continuous Testing**
   - Unit tests alongside every feature
   - E2E tests for critical flows
   - Target 80%+ coverage by week 12
   - CI blocks merges with failing tests

7. **Documentation**
   - README.md updated every phase
   - API docs (Swagger/OpenAPI) auto-generated
   - Runbook for deploys, scaling, monitoring
   - Deployment checklist before production

8. **Deploy to Production**
   - Vercel for frontend (connected to GitHub)
   - AWS/Azure for backend (Docker + K8s if scaled)
   - Zero-downtime deploy strategy
   - Monitor with Sentry + DataDog post-launch

---

## Code Quality Standards

### **Non-Negotiable Rules**

1. **TypeScript Strict Mode**
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true,
       "strictFunctionTypes": true
     }
   }
   ```

2. **ESLint + Prettier (Zero Errors)**
   - Code style enforced on commit (Husky pre-commit hook)
   - No `// @ts-ignore` or `any` types without justification
   - Merge blocked by CI if ESLint fails

3. **Naming Conventions**
   - Components: PascalCase (e.g., `UserDashboard.tsx`)
   - Functions: camelCase (e.g., `getUserById()`)
   - Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)
   - Database tables: snake_case (e.g., `user_accounts`)
   - Database columns: snake_case (e.g., `created_at`)

4. **Commit Message Format (Conventional Commits)**
   ```
   feat: add user authentication with JWT
   fix: resolve null pointer in payment processing
   docs: update API documentation for v2
   test: add unit tests for validation
   chore: upgrade dependencies
   refactor: extract payment logic to service
   ```

5. **Code Organization**
   - One responsibility per file
   - Max file size: 500 lines (split if larger)
   - Shared logic → `libs/` folder (monorepo)
   - API routes organized by domain (users, products, orders)

---

## Security & Compliance

### **OWASP Top 10 Compliance (Mandatory)**

1. **Broken Access Control**
   - Role-based access control (RBAC) on all endpoints
   - Verify user permissions before every action
   - Test with multiple user roles

2. **Cryptographic Failures**
   - All passwords hashed with bcrypt (10+ rounds)
   - JWT tokens signed & validated
   - HTTPS/TLS on all communications
   - Secrets managed via environment variables (never in code)

3. **Injection**
   - Input validation on ALL user inputs
   - SQL parameterized queries (never string concatenation)
   - Sanitize HTML output (XSS protection)

4. **Insecure Design**
   - Threat model created during architecture phase
   - Security testing included in CI
   - Regular dependency audits (`npm audit`)

5. **Broken Authentication**
   - Secure password hashing (bcrypt)
   - JWT with expiration (15-60 min access, 7-30 day refresh)
   - Logout = revoke refresh token
   - MFA optional (defer to v2 if time-constrained)

6. **Data Exposure**
   - No sensitive data in URLs (use POST body)
   - Encryption at rest (database backups)
   - Encryption in transit (HTTPS)
   - PII logs never contain passwords or payment data

7. **Broken Access Control (Testing)**
   - Unit tests verify role-based access
   - E2E tests verify unauthorized access is blocked
   - Manual security review by second pair of eyes (if available)

8. **Software & Data Integrity**
   - Dependencies pinned to specific versions
   - Automated dependency updates (Dependabot)
   - Code review required before merge

9. **Logging & Monitoring**
   - All authentication events logged
   - All payment events logged
   - Error logs sent to Sentry
   - Alerts for suspicious activity (failed logins, etc.)

10. **Server-Side Request Forgery (SSRF)**
    - Validate all URLs before making requests
    - Whitelist allowed domains
    - Disable redirects from user input

### **Data Privacy (PH Data Privacy Act)**
- Privacy policy required on website
- Terms of service required
- User consent for data collection (where applicable)
- Right to access/delete data implemented
- Data breach notification plan in place

---

## Testing Strategy

### **Test Coverage Targets**

| Type | Minimum Coverage | Tools |
|------|-----------------|-------|
| Unit Tests | 80%+ | Jest |
| Integration Tests | 60%+ | Jest + Supertest |
| E2E Tests | 40%+ (critical flows) | Playwright |
| Security Tests | 100% (OWASP Top 10) | Manual + OWASP ZAP |

### **What to Test (Priority Order)**

1. **Critical Flows (Must Have)**
   - User signup → login → access dashboard
   - Create/read/update/delete (CRUD) operations
   - Payment processing (if applicable)
   - Data validation & error handling

2. **Edge Cases (Must Have)**
   - Empty inputs, null values, special characters
   - Boundary conditions (max length, min value)
   - Concurrent requests (race conditions)
   - Network failures (timeout, 5xx errors)

3. **Security Tests (Must Have)**
   - Unauthorized access blocked
   - Invalid tokens rejected
   - SQL injection prevented
   - XSS attacks prevented

4. **Performance Tests (Nice to Have)**
   - API responses < 200ms at p95
   - Database queries < 100ms
   - Web app Lighthouse > 90
   - Mobile Lighthouse > 85

### **CI/CD Integration**
- Tests run on every commit (pre-commit hook)
- Tests run on every PR (GitHub Actions)
- Merge blocked if coverage < 80% or tests fail
- Failed tests must be fixed before merge

---

## Documentation Requirements

### **Required Documents (Per Phase)**

1. **README.md**
   - Project overview
   - Tech stack
   - Local setup (step-by-step)
   - Environment variables needed
   - Running tests
   - Deployment instructions

2. **API Documentation (Swagger/OpenAPI)**
   - Auto-generated from code
   - Updated every phase
   - Example requests & responses
   - Authentication required for each endpoint

3. **Architecture Decision Record (ADR)**
   - Why did we choose this tech?
   - What were the alternatives?
   - Trade-offs considered
   - Consequences (good & bad)
   - Example: "Why PostgreSQL over MongoDB?"

4. **Schema Documentation**
   - Entity-relationship diagram (ERD)
   - Table descriptions
   - Column data types & constraints
   - Indexes & relationships

5. **Deployment Runbook**
   - Step-by-step deploy process
   - Environment setup (dev, staging, prod)
   - Database migration process
   - Rollback procedure
   - Monitoring & alerting setup

6. **User Guide (if applicable)**
   - Screenshots of key features
   - Step-by-step workflows
   - FAQs & troubleshooting
   - Support contact info

### **Code Comments**
- Inline comments explain **why**, not **what**
- Function JSDoc comments on public APIs
- Complex algorithms: pseudocode first, then implementation
- TODO comments must have context: `// TODO(sonny): Add email verification by EOW`

---

## Deployment & DevOps

### **Local Development**
- Docker Compose for PostgreSQL + Redis
- Environment file: `.env.local` (gitignored)
- `npm install` or `pnpm install` works (no mysteries)
- `npm run dev` starts everything

### **Staging Environment**
- Deployed automatically on every merge to `develop` branch
- Uses production-like config (HTTPS, TLS, etc.)
- Full dataset for testing (or anonymized prod data)
- Monitoring enabled (Sentry, DataDog)

### **Production Environment**
- Manual approval required (GitHub release tag)
- Zero-downtime deploy (rolling updates)
- Blue-green or canary deployment (if high-risk)
- Automated rollback if error rate > threshold
- Backups enabled (daily + point-in-time recovery)

### **Monitoring & Alerting**
- **Sentry**: Error tracking, stack traces, breadcrumbs
- **DataDog**: APM, uptime monitoring, custom dashboards
- **Email alerts** for critical failures
- **On-call rotation** (if team size grows)

### **Scaling Strategy**
- Horizontal scaling via Docker + Kubernetes
- Database replicas for read-heavy workloads
- Redis for session/cache layer
- CDN for static assets (Vercel + Cloudflare)

---

## Communication Protocol

### **How I Should Respond to You**

1. **Always Start by Reading Memory**
   - Check `userMemories` for context
   - Reference existing projects (Dental CRM, Restaurant POS)
   - Remember your constraints (one-man team, Windows environment)

2. **Always Check Applicable Skills**
   - Load `fullstack-development-skill` for strategic decisions
   - Load `fullstack-engineering-skill` for implementation
   - Load other skills as context demands (testing-strategy, code-reviewer, etc.)

3. **Before Making Decisions**
   - Ask clarifying questions (Q&A first, code second)
   - Never guess at requirements
   - Verify with actual data/logs before proposing fixes

4. **Flag Risks & Side Effects**
   - Production impact? Flag it.
   - Security exposure? Flag it.
   - Breaking changes? Flag it.
   - Unknown unknowns? Say so clearly.

5. **Be Specific in Technical Details**
   - Exact commands (Windows PowerShell format)
   - Exact config values (not placeholders)
   - Exact file paths (e.g., `/mnt/project/...`)
   - Expected error messages (if applicable)

6. **Structured Responses**
   - Start with executive summary (2-3 sentences)
   - Follow with step-by-step instructions
   - End with next steps or open questions

7. **Tagalog Communication**
   - Respond in Tagalog when you write in Tagalog
   - Maintain professional tone (formal) unless casual is requested
   - Key technical terms stay in English (e.g., "database schema" not "database structure")

---

## Windows-Specific Workarounds

### **PowerShell vs Bash**
- All commands use PowerShell syntax (Windows default)
- No `sh` or `bash` scripts (use `.ps1` or Node.js)
- Path separators: backslashes (`\`) not forward slashes (`/`)

### **Common Issues & Fixes**

| Issue | Solution |
|-------|----------|
| `pnpm: command not found` | `npm install -g pnpm@9` (reinstall, restart terminal) |
| Git credential errors | Use GitHub personal access token (not password) |
| `fetch` not available in Node.js 18 | Use `node-fetch` or upgrade to Node 19+ |
| Terminal encoding issues | Set: `chcp 65001` (UTF-8 mode) |
| Build cache corrupted (Vercel) | Redeploy with "Use existing Build Cache" unchecked |
| Non-fast-forward push rejected | `git pull origin main --allow-unrelated-histories` before push |

### **WSL vs Native Node**
- Prefer native Windows Node (simpler setup)
- Use WSL only if specific Linux tools needed
- Docker Desktop for Windows (includes Linux VM)

---

## Repository & File Structure

### **Monorepo Layout (pnpm Workspaces)**
```
dental-clinic-crm/
├── package.json (root, defines workspaces)
├── pnpm-workspace.yaml
├── .github/
│   └── workflows/
│       ├── ci.yml (lint, test, coverage)
│       └── deploy.yml (auto-deploy to Vercel)
├── packages/
│   ├── types/ (shared TypeScript types)
│   │   ├── package.json
│   │   └── src/
│   │       └── index.ts
│   ├── ui-components/ (Radix UI wrappers)
│   │   ├── package.json
│   │   └── src/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── ...
│   ├── utils/ (shared utilities)
│   │   ├── package.json
│   │   └── src/
│   │       ├── validation.ts
│   │       ├── date-utils.ts
│   │       └── ...
│   ├── frontend/ (React + Vite)
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   └── public/
│   └── backend/ (Node.js + Express)
│       ├── package.json
│       ├── src/
│       │   ├── index.ts (main server)
│       │   ├── routes/
│       │   ├── middleware/
│       │   ├── services/
│       │   ├── models/
│       │   └── utils/
│       └── tests/
├── docker-compose.yml (PostgreSQL, Redis)
├── .env.example (template, no secrets)
├── .env.local (gitignored, secrets)
├── README.md
├── ARCHITECTURE.md (design decisions)
└── DEPLOYMENT.md (runbook)
```

### **Naming Conventions**
- **Repos**: `<project-name>` (kebab-case)
- **Branches**: `main`, `develop`, `feature/xyz`, `bugfix/xyz`
- **Tags**: `v1.0.0` (semver)

---

## Skill Workflow

### **When to Load Which Skill**

| Scenario | Skill | Purpose |
|----------|-------|---------|
| Planning new app | `fullstack-development-skill` | Strategic architecture, phases, security |
| Implementing features | `fullstack-engineering-skill` | Exact code, commands, patterns |
| Code has bugs | `engineering:debug` | Structured debugging |
| Reviewing pull request | `code-reviewer` | Security, performance, best practices |
| Writing tests | `testing-strategy` | Test plans, coverage, scenarios |
| System design decisions | `system-designer` | Database schemas, API design, microservices |
| Deployment preparation | `engineering:deploy-checklist` | Pre-production verification |
| Documentation | `engineering:documentation` | API docs, runbooks, guides |
| Tech debt | `engineering:tech-debt` | Identify & prioritize refactoring |
| Incident response | `engineering:incident-response` | Triage, communicate, postmortem |

### **Skill File Naming Rules (CRITICAL)**
- `name` field must be **lowercase-hyphenated** (e.g., `fullstack-engineering-skill`)
- `name` field must **NOT contain** the word "claude"
- `name` field must **appear first** after the opening `---`
- Example:
  ```yaml
  ---
  name: my-custom-skill
  description: ...
  ```

---

## Risk & Side-Effect Flagging

### **Always Flag These Situations**

1. **Production Impact**
   - Changes to customer-facing features
   - Database migrations (potential downtime)
   - API changes (breaking compatibility)
   - Example: "⚠️ This change affects invoice generation; test with real invoices first"

2. **Security Exposure**
   - Credentials in logs or error messages
   - Missing input validation
   - Unencrypted sensitive data
   - Example: "🔒 This feature exposes user emails in API responses; add authorization check"

3. **Breaking Changes**
   - API endpoint renaming
   - Database schema changes
   - Library upgrades (major version)
   - Example: "⚠️ Upgrading Jest 27→29 breaks current test syntax; plan migration time"

4. **Data Loss Risk**
   - Deletion operations
   - Database migrations that alter data
   - Cache invalidation strategies
   - Example: "💥 This migration drops the `user_meta` column; backup data first"

5. **Performance Degradation**
   - N+1 queries
   - Missing database indexes
   - Inefficient algorithms
   - Example: "⚡ This loop queries database 1000 times; batch the queries instead"

6. **Dependency on Manual Steps**
   - Deployment requires human action
   - Environment setup is complex
   - Runbook is incomplete
   - Example: "⚙️ This requires manual Redis cache flush post-deploy; automate this"

### **Format for Flags**
```
⚠️ [RISK TYPE]: [What could go wrong?]
[Specific impact or example]
[How to mitigate or verify]
```

---

## Quick Reference: Command Patterns

### **Local Development (Windows PowerShell)**
```powershell
# Install dependencies
pnpm install

# Run development server
pnpm run dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Format code
pnpm format

# Docker: start PostgreSQL + Redis
docker-compose up -d

# View logs
docker-compose logs -f postgres
```

### **Git Workflow**
```powershell
# Create feature branch
git checkout -b feature/user-authentication

# Commit with conventional format
git commit -m "feat: add JWT authentication"

# Push to GitHub
git push origin feature/user-authentication

# Create pull request (GitHub CLI or web)
gh pr create --title "Add JWT authentication" --body "Resolves #123"

# After merge, pull latest
git checkout main && git pull origin main
```

### **Deployment**
```powershell
# Create production release
git tag v1.0.0
git push origin v1.0.0

# Deploy to Vercel (auto via GitHub Actions)
# (GitHub Actions runs on tag push)

# Check deployment status
gh run list

# View logs
gh run view <run-id> --log
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-07-30 | Initial creation. Foundation for all future builds. |

---

## Questions or Updates?

If you have questions about this guide or need clarifications, ask directly. The skill will be updated as we learn new patterns or encounter new scenarios.

**Last reviewed by Sonny:** [Awaiting first review]  
**Next review date:** 2026-09-30 (after first production app launch)
