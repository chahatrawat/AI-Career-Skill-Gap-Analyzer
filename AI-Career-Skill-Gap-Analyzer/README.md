# AI Career Skill-Gap Analyzer

A web application that shows IT students the gap between the skills they have and the skills their chosen career needs, then builds a personalized learning roadmap they can save and track.

*Diploma final year minor project (5th semester, IT).*

Related documents: [`DATABASE.md`](DATABASE.md) (tables and relationships) and [`ROADMAP.md`](ROADMAP.md) (team plan, API checklist, testing).

---

## 1. Core Features

| # | Feature | What the user can do |
|---|---|---|
| 1 | Authentication and profile | Register, log in, and manage a basic profile with learning preferences |
| 2 | Career selection | Browse curated IT careers and pick a target career; see its required skills |
| 3 | Skill assessment | Rate their current level (1 to 5) for the skills of the selected career |
| 4 | AI skill-gap analysis | See a readiness score, strengths, skills to improve, and missing skills, with an AI explanation |
| 5 | Learning roadmap | Generate a phased plan from the gaps, save it, and mark items as started or completed |
| 6 | Dashboard | See target career, readiness score, top gaps, roadmap progress, and saved roadmaps |

| 7 | Dashboard charts | Skill-vs-required chart (with quiz markers), readiness by category, readiness trend, weekly goal, project and quiz summaries |
| 8 | AI Project Lab | Get portfolio project ideas that practise the biggest gaps; track them as suggested, in progress or completed |
| 9 | Skill quiz | Take a short quiz per skill; the result is shown as evidence next to the self-rating and can update it |
| 10 | Learning resources | Every roadmap item lists curated links for its skill, ordered by the user's preferred learning format |
| 11 | Weekly study planner | Plan sessions, tick them off, auto-plan a week from the roadmap, and track hours, streak and 8-week history |

The first six features are the original scope; features 7 to 11 were added in version 2 (see "Version 2 features" below).

These six features are the complete scope of the first version. Everything else is listed in section 12 as future enhancements.

### Feature behavior

**Authentication and profile**
- Registration needs a name, a valid email, and a password of at least 8 characters.
- Passwords are stored only as bcrypt hashes. Login returns a JWT.
- The Profile page edits name, education level, experience level, weekly study hours, and preferred learning format.

**Career selection**
- Careers and their required skills are seeded in the database (see `DATABASE.md`).
- Selecting a career saves it as the user's target career.

**Skill assessment**
- The page lists the skills required by the target career, with the user's saved rating pre-filled.
- Levels are stored as integers 1 to 5 and shown with labels (see section 3).
- A user can update ratings at any time and run the analysis again.

**AI skill-gap analysis**
- The backend compares the user's ratings with the career's required levels and calculates the readiness score and each skill's status in code.
- The AI then writes a short explanation and orders the priorities. It never produces the numbers.
- Every analysis is saved, so the user has a history.

**Learning roadmap**
- The AI turns the gaps into phases of learning items, scaled to the user's weekly study hours.
- Generating a roadmap also saves it. Users can list, open, and delete their roadmaps.
- Each item has a status: not started, in progress, or completed. Progress is the share of completed items.

**Dashboard**
- Shows the data above in one place so a user sees where they stand and what to do next.

---

## 2. Technology Stack

| Layer | Choice |
|---|---|
| Frontend | React with Vite, React Router |
| Backend | Node.js with Express |
| Database | MySQL 8 |
| AI | Google Gemini (one provider, called only from `backend/services/aiService.js`) |
| Security | bcrypt, JWT, express-validator, express-rate-limit, CORS |

---

## 3. How the Skill-Gap Analysis Works

**Skill levels**

| Level | Label | Meaning |
|---|---|---|
| 1 | Beginner | Knows the basic ideas |
| 2 | Basic | Can complete guided tasks |
| 3 | Intermediate | Works independently on common tasks |
| 4 | Advanced | Handles complex tasks confidently |
| 5 | Expert | Deep, broad expertise |

**Career requirements.** Each career has a list of skills. Each entry has a `required_level` (1 to 5) and an `importance` (1 low, 2 medium, 3 high). These are curated baselines chosen by the team, not live job-market data.

**Status of each skill** (`current` is the user's rating; a skill with no rating counts as 0):

| Status | Condition |
|---|---|
| `missing` | The user has not rated the skill |
| `gap` | Rated, but `current` is below `required` |
| `met` | `current` is at or above `required` |

**Readiness score** (0 to 100), calculated in `backend/utils/scoring.js`:

```text
achieved  = min(current, required)
readiness = sum(achieved x importance) / sum(required x importance) x 100
```

The score is rounded to one decimal place.

**Priority of a gap:** `(required - current) x importance`. Higher means more urgent. The roadmap handles gaps in this order.

**What the AI does:** explains the result in plain language, comments on the top priorities, and generates the roadmap. **What the AI never does:** calculate scores or decide which skills are missing.

---

## 4. Architecture and AI Rules

```text
React (Vite)  ->  Express routes  ->  controllers (validate input)
                                          |
                                      services (logic + SQL) -> MySQL
                                          |
                          scoring.js  ->  aiService.js  ->  Gemini
```

AI rules for the whole project:

1. Scores and statuses come from `scoring.js`, never from the AI.
2. The AI receives only the career name, skill names and levels, and weekly study hours. It never receives the user's name or email.
3. The AI must answer in JSON. `aiService.js` parses and validates the answer and drops any skill ID that was not sent to it.
4. If the AI times out, fails, or returns invalid JSON, `aiService.js` returns a simple rule-based result so the application keeps working. The UI marks AI-generated content with a short notice that it is a suggestion, not a guarantee.
5. Prompt templates are constants inside `aiService.js`.
6. The API key lives only in `backend/.env`.

---

## 5. Project Structure

```text
AI-Career-Skill-Gap-Analyzer/
├── README.md
├── DATABASE.md
├── ROADMAP.md
├── .gitignore
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   ├── public/
│   └── src/
│       ├── App.jsx                    # routes; ProtectedRoute is defined here
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── Sidebar.jsx
│       │   ├── SkillCard.jsx
│       │   ├── ProgressBar.jsx
│       │   ├── RoadmapCard.jsx
│       │   └── Loading.jsx
│       ├── pages/
│       │   ├── LandingPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── ProfilePage.jsx
│       │   ├── CareerSelectionPage.jsx
│       │   ├── SkillAssessmentPage.jsx
│       │   ├── SkillGapAnalysisPage.jsx
│       │   └── RoadmapPage.jsx
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── services/
│       │   └── api.js                 # all API calls and token handling
│       └── utils/
│           └── validators.js          # form validation helpers
│
└── backend/
    ├── package.json
    ├── .env.example
    ├── server.js                      # starts the HTTP server
    ├── app.js                         # Express app, CORS, rate limits, routes
    ├── config/
    │   ├── db.js                      # MySQL connection pool
    │   └── env.js                     # loads and checks environment variables
    ├── database/
    │   ├── schema.sql
    │   └── seed.sql
    ├── routes/
    │   ├── authRoutes.js
    │   ├── careerRoutes.js
    │   ├── skillRoutes.js
    │   ├── analysisRoutes.js
    │   └── roadmapRoutes.js
    ├── controllers/                   # validate input, call a service, send the response
    │   ├── authController.js
    │   ├── careerController.js
    │   ├── skillController.js
    │   ├── analysisController.js
    │   └── roadmapController.js
    ├── services/                      # business logic and parameterized SQL
    │   ├── authService.js
    │   ├── careerService.js
    │   ├── skillService.js
    │   ├── analysisService.js
    │   ├── roadmapService.js
    │   └── aiService.js               # only file that calls the AI provider; holds the prompts
    ├── middleware/
    │   ├── authMiddleware.js          # verifies the JWT and sets req.user
    │   └── errorMiddleware.js         # error handler and httpError(status, message)
    └── utils/
        ├── password.js                # bcrypt hash and compare
        └── scoring.js                 # readiness score, statuses, priorities
```

Notes:
- There is no separate `models/` layer. Each service holds its own parameterized SQL. If your guide expects a classic MVC layout, rename the database parts of the services to `models/`.
- Request validation uses `express-validator` inside the controllers or routes.
- Rate limiting for login, register, and AI endpoints is configured in `app.js`.
- JWT creation and verification use the `jsonwebtoken` package directly in `authService.js` and `authMiddleware.js`.

---

## 6. API Overview

All endpoints are under `/api`. Every endpoint except `/health`, `/auth/register`, and `/auth/login` needs the header `Authorization: Bearer <token>`. The full list with owners is in [`ROADMAP.md`](ROADMAP.md).

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/auth/register` | Create an account |
| POST | `/auth/login` | Log in and receive a token |
| GET | `/auth/me` | Current user with profile |
| PUT | `/auth/me` | Update profile, preferences, target career |
| GET | `/careers` | List careers |
| GET | `/careers/:id` | Career with its required skills |
| GET | `/skills` | List all skills |
| GET | `/skills/me` | The user's saved skill ratings |
| PUT | `/skills/me` | Save skill ratings |
| POST | `/analysis/skill-gap` | Run and save a skill-gap analysis |
| GET | `/analysis/history` | List past analyses |
| GET | `/analysis/dashboard` | Data for the dashboard |
| GET | `/analysis/:id` | One saved analysis |
| POST | `/roadmaps` | Generate and save a roadmap |
| GET | `/roadmaps` | List the user's roadmaps |
| GET | `/roadmaps/:id` | One roadmap with its items |
| PATCH | `/roadmaps/:id/items/:itemId` | Update an item's status |
| DELETE | `/roadmaps/:id` | Delete a roadmap |

Responses use a predictable JSON shape: `{ "success": true, "data": ... }` or `{ "success": false, "error": { "message": "..." } }`.

---

## 7. Local Setup

**Prerequisites:** Node.js (current LTS), MySQL 8, and a Google Gemini API key.

**1. Create the database**

```bash
mysql -u root -p -e "CREATE DATABASE career_skill_analyzer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p career_skill_analyzer < backend/database/schema.sql
mysql -u root -p career_skill_analyzer < backend/database/seed.sql
```

**2. Backend**

```bash
cd backend
npm install
cp .env.example .env     # then fill in your values
npm run dev
```

`backend/.env.example`:

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_database_password
DB_NAME=career_skill_analyzer

JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=7d

AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
AI_MODEL=your_selected_gemini_model
AI_TIMEOUT_MS=30000
```

**3. Frontend**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

`frontend/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Never commit `.env` files. The AI key must never appear in the frontend.

---

## 8. Security and Privacy Basics

- Passwords are hashed with bcrypt. Plain passwords are never stored or logged.
- Every query that touches private data is parameterized and filtered by the logged-in user's ID, so one user cannot read another user's analyses or roadmaps.
- All request bodies and parameters are validated before use (types, ranges, lengths).
- Login, register, and AI endpoints have rate limits.
- CORS allows only the configured frontend origin.
- Errors returned to the client contain no stack traces or SQL.
- `.env` is excluded by `.gitignore`.
- The AI provider receives only the minimum data listed in section 4.

---

## 9. Team Responsibilities

Each file has exactly one owner, so members do not edit the same files. If you need a change in someone else's file, ask the owner. Full details are in [`ROADMAP.md`](ROADMAP.md).

| Member | Area | Files |
|---|---|---|
| Member 1 | Platform, database, authentication, careers | 19 |
| Member 2 | Skills, analysis, roadmap, AI, scoring, README and ROADMAP | 13 |
| Member 3 | Entire frontend | 25 |

---

## 10. Definition of Done

The project is complete when this demo flow works on a clean setup:

1. Register, log in, and edit the profile.
2. Pick a career and view its required skills.
3. Rate skills and run the skill-gap analysis; the score matches a hand calculation.
4. Generate a roadmap, mark items completed, and see the progress change.
5. The dashboard shows the readiness score, top gaps, and roadmap progress.
6. Log out, log in as a second user, and confirm the first user's data is not visible.
7. With the AI key removed, the analysis and roadmap still work using the fallback.

---

## 11. Quality Checks

- Every page has loading, empty, and error states.
- Invalid input returns a clear message and no crash.
- Setup from this README works on a fresh machine.
- `scoring.js` has unit tests for the readiness calculation.

---

## 12. Future Enhancements (not part of this version)

These were considered and deliberately left out to keep the project finishable:

- Resume upload and skill extraction
- Job description matching
- AI career chatbot
- Interview practice
- Study schedules
- Achievements and badges
- Analytics and reports
- Learning resource library and project suggestions
- Career recommendations from skills
- Comparing assessments over time
---

## Quick start (one command)

- macOS/Linux: `DB_PASSWORD=your_mysql_password ./setup-and-run.sh`
- Windows: double-click `setup-and-run.bat` (asks for the MySQL root password)

Then open http://localhost:5173. The backend must be running on port 5000, otherwise the register page shows "Cannot reach the API".
To enable Gemini, set `GEMINI_API_KEY` and `AI_MODEL` in `backend/.env` (without them the rule-based fallback is used).


---

## Version 2 features (added)

**Setup for existing databases:** run `backend/database/migration_002_features.sql` once (safe to repeat). Fresh installs get the same tables from `schema.sql`.

| Feature | Frontend | API (all need login) | Notes |
|---|---|---|---|
| Dashboard charts | `/dashboard`, `components/charts.jsx` | `GET /api/analysis/dashboard?today=YYYY-MM-DD` | Adds `skillComparison`, `categoryReadiness`, `projects`, `weeklyProgress`, `quizzes`. Charts are plain SVG/CSS with a legend and a table view. |
| Skill quiz | `/quiz` | `GET /api/quiz/skills`, `GET /api/quiz/skills/:skillId`, `POST /api/quiz/skills/:skillId/submit`, `GET /api/quiz/evidence` | Answers are checked on the server only; option order is shuffled. Estimated level = 1 to 4 (a 3-question quiz cannot prove Expert). The quiz never changes the readiness score by itself: the user chooses to apply it to their rating. |
| AI Project Lab | `/projects` | `GET /api/projects`, `POST /api/projects/suggest`, `PATCH /api/projects/:id`, `DELETE /api/projects/:id` | AI writes titles, descriptions, deliverables and picks skill IDs; **difficulty and estimated hours are calculated in `projectService.rateProject`**. Falls back to category templates when the AI is unavailable. Rate-limited like the other AI endpoints. |
| Learning resources | Roadmap detail page | included in `GET /api/roadmaps/:id` (`items[].resources`) | Curated in `backend/data/resourceBank.js`. **The AI never produces URLs.** A generated search link is added as a safety net. |
| Weekly planner | `/planner` | `GET /api/planner/week`, `GET /api/planner/items`, `POST /api/planner/auto-plan`, `POST/PATCH/DELETE /api/planner/sessions` | Progress = completed minutes / planned minutes; goal = weekly study hours from the profile. Auto-plan is rule-based (no AI). The browser sends its own local date as `today`, so day boundaries match the user's time zone. |

Tests: `cd backend && npm test` (adds `utils/quiz.test.js`, `utils/planner.test.js`, `data/content.test.js`, which also checks that every seeded skill has a quiz and curated resources).
