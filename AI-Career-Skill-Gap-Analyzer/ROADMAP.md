# Development Roadmap

Seven-day plan for a team of three. Features are described in [`README.md`](README.md) and tables in [`DATABASE.md`](DATABASE.md).

**Time budget:** about 3 hours per person per day, about 63 person-hours in total. If you have more calendar time, spread the same plan over more days; do not add features.

**Scope commitment:** build the six core features in the README and nothing else until the full demo flow works. Future enhancements stay in the report, not in the code.

---

## 1. Rules for Working Together

1. **One owner per file.** The ownership lists in section 2 are final. If you need a change in someone else's file, ask the owner or send a small pull request they approve.
2. **Each member works on their own Git branch** (for example `member1-backend-core`) and merges into `main` only when the code runs.
3. **Pull from `main` before you start** each day and before you push.
4. **Never commit `.env` files.** Commit only `.env.example`.
5. **Feature freeze at the end of Day 5.** Days 6 and 7 are only for integration, bug fixes, and polish.
6. **Agree contracts first.** The function names and JSON shapes in sections 3 to 5 are fixed. Change them only after telling the others.

---

## 2. File Ownership (no shared files)

### Member 1: Platform, database, authentication, careers (19 files)

```text
.gitignore
DATABASE.md
backend/package.json
backend/.env.example
backend/server.js
backend/app.js
backend/config/db.js
backend/config/env.js
backend/database/schema.sql
backend/database/seed.sql
backend/middleware/authMiddleware.js
backend/middleware/errorMiddleware.js
backend/utils/password.js
backend/routes/authRoutes.js          backend/routes/careerRoutes.js
backend/controllers/authController.js backend/controllers/careerController.js
backend/services/authService.js       backend/services/careerService.js
```

### Member 2: Skills, analysis, roadmap, AI (13 files)

```text
README.md
ROADMAP.md
backend/utils/scoring.js
backend/services/aiService.js
backend/routes/skillRoutes.js         backend/routes/analysisRoutes.js         backend/routes/roadmapRoutes.js
backend/controllers/skillController.js backend/controllers/analysisController.js backend/controllers/roadmapController.js
backend/services/skillService.js      backend/services/analysisService.js      backend/services/roadmapService.js
```

### Member 3: Frontend (25 files)

```text
frontend/index.html, package.json, vite.config.js, .env.example
frontend/src/App.jsx, main.jsx, index.css
frontend/src/context/AuthContext.jsx
frontend/src/services/api.js
frontend/src/utils/validators.js
frontend/src/components/Navbar.jsx, Sidebar.jsx, SkillCard.jsx, ProgressBar.jsx, RoadmapCard.jsx, Loading.jsx
frontend/src/pages/LandingPage.jsx, LoginPage.jsx, RegisterPage.jsx, DashboardPage.jsx, ProfilePage.jsx,
                   CareerSelectionPage.jsx, SkillAssessmentPage.jsx, SkillGapAnalysisPage.jsx, RoadmapPage.jsx
```

**Total: 19 + 13 + 25 = 57 files.** Member 2 has fewer files because the AI integration and prompt work take longer per file.

---

## 3. Contracts Between Backend Members

**Member 1 provides, Member 2 uses** (Member 1 delivers these on Day 1 so Member 2 is not blocked):

| File | What it exports |
|---|---|
| `config/db.js` | `pool` from `mysql2/promise`; use `pool.query(sql, params)` |
| `config/env.js` | The validated environment variables, including the `AI_*` and `GEMINI_API_KEY` values |
| `middleware/authMiddleware.js` | `requireAuth`, which sets `req.user = { id }` |
| `middleware/errorMiddleware.js` | `httpError(status, message)` to throw errors, and the error handler |
| `services/careerService.js` | `getCareerWithSkills(careerId)` returning `{ id, name, skills: [{ skillId, name, category, requiredLevel, importance }] }` |
| `services/authService.js` | `getProfile(userId)` returning at least `{ weeklyStudyHours, targetCareerId }` |
| `database/schema.sql`, `seed.sql` | All 9 tables and the seed data, on Day 1 |

**Member 2 provides, Member 1 uses:**

| File | What it exports |
|---|---|
| `routes/skillRoutes.js`, `analysisRoutes.js`, `roadmapRoutes.js` | An Express router each. Create empty routers on Day 1 so `app.js` can mount them |

`app.js` mounts: `/api/auth`, `/api/careers`, `/api/skills`, `/api/analysis`, `/api/roadmaps`.

---

## 4. API Contract Checklist

An endpoint is done when it works with valid input, rejects invalid input, enforces ownership where private data is involved, and the frontend uses it successfully.

| Method | Endpoint | Auth | Owner | Purpose |
|---|---|---|---|---|
| GET | `/api/health` | No | M1 | Health check |
| POST | `/api/auth/register` | No | M1 | Create account and empty profile |
| POST | `/api/auth/login` | No | M1 | Log in, return token |
| GET | `/api/auth/me` | Yes | M1 | Current user with profile |
| PUT | `/api/auth/me` | Yes | M1 | Update profile, preferences, target career |
| GET | `/api/careers` | Yes | M1 | List careers |
| GET | `/api/careers/:id` | Yes | M1 | Career with required skills |
| GET | `/api/skills` | Yes | M2 | List all skills |
| GET | `/api/skills/me` | Yes | M2 | The user's saved ratings |
| PUT | `/api/skills/me` | Yes | M2 | Save ratings (`{ skills: [{ skillId, level }] }`, `level: null` clears) |
| POST | `/api/analysis/skill-gap` | Yes | M2 | Run and save an analysis (`{ careerId }`) |
| GET | `/api/analysis/history` | Yes | M2 | List the user's analyses |
| GET | `/api/analysis/dashboard` | Yes | M2 | Dashboard data |
| GET | `/api/analysis/:id` | Yes | M2 | One saved analysis |
| POST | `/api/roadmaps` | Yes | M2 | Generate and save a roadmap (`{ assessmentId, weeklyHours? }`) |
| GET | `/api/roadmaps` | Yes | M2 | List the user's roadmaps |
| GET | `/api/roadmaps/:id` | Yes | M2 | One roadmap with items |
| PATCH | `/api/roadmaps/:id/items/:itemId` | Yes | M2 | Set item status |
| DELETE | `/api/roadmaps/:id` | Yes | M2 | Delete a roadmap |

**Total: 19 endpoints** (7 for Member 1, 12 for Member 2).

Rules for every endpoint:
- Validate all inputs with `express-validator`: types, ranges (levels 1 to 5, weekly hours 1 to 60), lengths, and that IDs are integers.
- `/api/analysis/history` and `/api/analysis/dashboard` must be registered before `/api/analysis/:id`.
- Private data (`user_skills`, assessments, roadmaps) is always queried with the logged-in user's ID. Another user's record returns 404.
- `/api/analysis/skill-gap` needs a career and at least one rated skill; otherwise return a clear 400.
- `/api/roadmaps` returns 400 if the analysis has no gaps.
- Responses use `{ "success": true, "data": ... }` or `{ "success": false, "error": { "message": "..." } }`.

### Key response shapes

**Skill-gap analysis** (`POST /api/analysis/skill-gap`, `GET /api/analysis/:id`): the same fields as `result_json` in `DATABASE.md`, plus `assessmentId`, `career: { id, name }`, `readinessScore`, and `createdAt`.

**Dashboard** (`GET /api/analysis/dashboard`):

```json
{
  "user": { "name": "Asha", "targetCareer": { "id": 1, "name": "Python Developer" } },
  "latestAssessment": {
    "id": 5, "readinessScore": 62.5, "createdAt": "2026-10-20T10:00:00Z",
    "counts": { "met": 3, "gap": 4, "missing": 2 },
    "topGaps": [ { "skillId": 12, "name": "SQL", "gap": 2 } ]
  },
  "readinessHistory": [ { "assessmentId": 3, "readinessScore": 48.0, "createdAt": "2026-10-12T09:00:00Z" } ],
  "roadmaps": [ { "id": 2, "title": "Python Developer plan", "careerName": "Python Developer",
                  "progressPercent": 40, "completedItems": 2, "totalItems": 5, "createdAt": "2026-10-20T10:05:00Z" } ]
}
```

`latestAssessment` is `null` if the user has not run an analysis yet.

**Roadmap** (`GET /api/roadmaps/:id`):

```json
{
  "id": 2, "title": "Python Developer plan", "summary": "...", "careerName": "Python Developer",
  "weeklyHours": 6, "totalWeeks": 10, "aiGenerated": true, "progressPercent": 40,
  "phases": [
    { "phaseNumber": 1, "title": "Foundations",
      "items": [ { "id": 11, "skillId": 3, "title": "Learn core Python", "description": "...",
                   "durationWeeks": 2, "status": "not_started" } ] }
  ]
}
```

---

## 5. AI Contract (`services/aiService.js`)

`aiService.js` is the only file that calls Gemini. It exports two functions. The prompt text lives as constants at the top of the file. The scoring, statuses, and durations are always calculated by the backend.

### `explainSkillGap(input)`

Input (built by `analysisService` from `scoring.js` output):

```json
{ "careerName": "Python Developer", "readinessScore": 62.5,
  "skills": [ { "skillId": 12, "name": "SQL", "currentLevel": 2, "requiredLevel": 4,
                "importance": 3, "status": "gap", "gap": 2 } ] }
```

Expected AI JSON, validated before use:

```json
{ "summary": "Plain-language explanation, at most about 120 words.",
  "priorities": [ { "skillId": 12, "reason": "Why this should be learned first." } ] }
```

Validation: `summary` is a non-empty string; `priorities` has at most 5 entries; every `skillId` must be one that was sent; otherwise drop the entry.

### `generateRoadmap(input)`

Input (built by `roadmapService`, only skills with status `gap` or `missing`, in priority order):

```json
{ "careerName": "Python Developer", "weeklyHours": 6,
  "gaps": [ { "skillId": 12, "name": "SQL", "currentLevel": 2, "requiredLevel": 4, "importance": 3, "gap": 2 } ] }
```

Expected AI JSON:

```json
{ "title": "Python Developer plan", "summary": "One or two sentences.",
  "phases": [ { "title": "Foundations",
                "items": [ { "skillId": 12, "title": "Learning objective", "description": "What to practise." } ] } ] }
```

Validation: at most 5 phases; every item has a `skillId` that was sent; every gap skill appears at least once (add a plain item for any the AI left out). The AI does not provide durations.

**Durations are calculated in `roadmapService`:** `durationWeeks = (gap x 5) / weeklyHours`, rounded to the nearest 0.5, minimum 0.5 and maximum 8. `totalWeeks` is the rounded-up sum.

### Fallback (required)

If the AI call fails, times out (`AI_TIMEOUT_MS`), or returns invalid JSON, `aiService.js` returns a rule-based result instead of an error:

- `explainSkillGap`: a short summary built from the counts and the top three priorities.
- `generateRoadmap`: one item per gap in priority order, titled "Improve <skill name> from level X to Y", grouped into phases of at most three items.

The response then has `aiGenerated: false`. Use the fallback in the demo if the network fails.

### Safety

- Send only career name, skill names and levels, and weekly hours.
- Never log the API key or full prompts that contain user data.
- Do not ask the AI for scores, URLs, or job-market claims.

---

## 6. Day-by-Day Plan

### Day 1: Setup and contracts

| Member | Tasks |
|---|---|
| **M1** | Create the backend skeleton: `package.json`, `server.js`, `app.js`, `env.js`, `db.js`. Add `/api/health`, `errorMiddleware`, `authMiddleware` (can verify a JWT only). Write `schema.sql` for all 9 tables and run it on a clean database. Draft `seed.sql` with careers and skills. Share the `.env.example` |
| **M2** | Create empty routers for skills, analysis, and roadmaps so the server starts. Write `scoring.js` with unit tests (pure functions, no database needed). Draft the prompts and the fallback in `aiService.js` |
| **M3** | Create the Vite app, router, `AuthContext`, `api.js` with fake responses that match section 4, and the layout (`Navbar`, `Sidebar`, `Loading`) |

**Deliverables:** both apps start; the schema runs from scratch; `scoring.js` passes its tests; the frontend shell renders.

### Day 2: Accounts and catalogue

| Member | Tasks |
|---|---|
| **M1** | Register, login, `me` get and update; `password.js`; real JWT checks; finish `seed.sql` (6 careers, about 35 skills, mappings); `GET /api/careers` and `/api/careers/:id` |
| **M2** | `GET /api/skills`, `GET` and `PUT /api/skills/me` with validation |
| **M3** | `LoginPage`, `RegisterPage`, `ProfilePage`, `CareerSelectionPage` against the fake API; switch to the real auth endpoints as soon as M1 is ready |

**Deliverables:** a user can register, log in, edit the profile, and see careers with required skills.

### Day 3: Skill assessment and analysis

| Member | Tasks |
|---|---|
| **M1** | Review validation and error messages across auth and careers; add rate limits in `app.js` (login, register, AI endpoints); help M2 with SQL and seed fixes |
| **M2** | `POST /api/analysis/skill-gap` using `scoring.js` and `explainSkillGap`; save to `skill_assessments`; `GET /api/analysis/history` and `/:id` |
| **M3** | `SkillAssessmentPage` (rating inputs with level labels, using `SkillCard`) and `SkillGapAnalysisPage` (score, statuses, AI explanation, AI notice) |

**Deliverables:** rate skills, run an analysis, see a correct score and explanation.

### Day 4: Roadmaps

| Member | Tasks |
|---|---|
| **M1** | Test auth, careers, and ownership end to end; fix bugs found; prepare the demo seed data and a clean-database reset |
| **M2** | `POST /api/roadmaps` with `generateRoadmap`, durations, and fallback; list, get, status update, delete; progress calculation |
| **M3** | `RoadmapPage` (list, generate, detail by phase, status controls), `RoadmapCard`, `ProgressBar` |

**Deliverables:** generate, save, open, update progress, and delete a roadmap.

### Day 5: Dashboard and feature freeze

| Member | Tasks |
|---|---|
| **M1** | Security pass: ownership checks on every private route, input validation gaps, error responses without stack traces, `.gitignore` check |
| **M2** | `GET /api/analysis/dashboard`; AI failure test (invalid key and timeout); fix analysis and roadmap bugs |
| **M3** | `DashboardPage`, `LandingPage`, `ProtectedRoute` in `App.jsx`, loading, empty, and error states on every page |

**Deliverables:** the complete demo flow works. **Feature freeze.**

### Day 6: Integration and testing

All members: run the checklist in section 7 on a fresh database and fix bugs. Test with two different users. Fix anything that confuses a first-time user (labels, messages, empty states).

### Day 7: Polish and submission

- Update `README.md`, `DATABASE.md`, and `ROADMAP.md` so they match what was built.
- Do a full run-through of the demo from a clean setup, following the README exactly.
- Prepare screenshots, the demo script, and answers for likely viva questions (how the score is calculated, why the AI does not calculate it, what happens if the AI fails, how ownership is enforced).
- Add the future enhancements to the report.

---

## 7. Testing Checklist

| Area | What to check |
|---|---|
| Register and login | Valid and invalid email, short password, duplicate email, wrong password |
| Protected routes | Calls without a token or with a bad token return 401; the frontend redirects to login |
| Profile | Update succeeds; weekly hours outside 1 to 60 is rejected; target career saves |
| Careers and skills | List loads; a career shows its required skills and levels |
| Ratings | Save, update, and clear a rating; level 0 or 6 is rejected; unknown skill ID is rejected |
| Analysis | Known sample gives the hand-calculated score; unrated skills show as `missing`; analysis is saved and appears in history |
| AI explanation | Normal case works; with a wrong API key the fallback text appears and `aiGenerated` is `false` |
| Roadmap | Generated items only use real skill IDs; every gap is covered; durations follow the formula; fallback works |
| Progress | Changing an item status updates `progressPercent` and `completed_at` |
| Dashboard | Correct for a new user (no data), after an analysis, and after progress changes |
| Ownership | User B cannot read, update, or delete user A's analysis or roadmap (404) |
| Delete | Deleting a roadmap removes its items |
| Input safety | Strings with quotes or SQL characters do not break queries |
| Setup | The README steps work on a clean machine and a fresh database |

**Automated tests (minimum):** `scoring.js` unit tests covering all met, all missing, mixed, and importance weighting. Add API tests for auth and ownership if time allows.

---

## 8. Risks and How to Handle Them

| Risk | What to do |
|---|---|
| The AI is slow, wrong, or unavailable | Use the fallback; keep the timeout at 30 seconds or less; never let the UI wait forever |
| The AI returns invalid JSON | Parse defensively, validate, fall back |
| Frontend waits for backend endpoints | M3 builds against the fake responses in section 4 and switches over endpoint by endpoint |
| Schema changes break teammates | Only M1 edits `schema.sql`; announce changes and update `DATABASE.md` in the same commit |
| Merge conflicts | One owner per file, small commits, pull before you push |
| Running out of time | Cut polish, never core features; do not add anything new after Day 5 |

---

## 9. Done Means

The demo flow in the README (section 10) works from a clean setup, every item in the testing checklist passes, and the three documents match the code.