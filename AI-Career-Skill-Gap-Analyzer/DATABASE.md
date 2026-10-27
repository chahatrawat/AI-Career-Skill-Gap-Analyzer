# Database Design

MySQL 8 database for the AI Career Skill-Gap Analyzer. This document is the source of truth for `backend/database/schema.sql` and `seed.sql`. Features are described in [`README.md`](README.md); the delivery plan is in [`ROADMAP.md`](ROADMAP.md).

**Database name:** `career_skill_analyzer`
**Engine and charset:** InnoDB, `utf8mb4`, collation `utf8mb4_unicode_ci`

---

## 1. Design Rules

- Primary keys are `BIGINT UNSIGNED AUTO_INCREMENT` named `id`, except join tables with a composite key.
- Column names use `snake_case`. The API returns `camelCase`, so services map the names when building responses.
- Every table has `created_at`. Tables whose rows change also have `updated_at`.
- Skill levels are integers from 1 to 5. Use `CHECK` constraints (MySQL 8.0.16 or later).
- Private rows (`skill_assessments`, `roadmaps`, `user_skills`) always carry a `user_id`, and every query on them filters by it.
- All SQL is parameterized. Never build queries by joining strings.
- Passwords are stored only as bcrypt hashes.

---

## 2. Entity Relationship Summary

```text
users 1 ---- 1 user_profiles
users 1 ---- N user_skills N ---- 1 skills
users 1 ---- N skill_assessments N ---- 1 careers
users 1 ---- N roadmaps N ---- 1 careers
roadmaps 1 ---- N roadmap_items N ---- 0..1 skills
careers 1 ---- N career_skills N ---- 1 skills
user_profiles N ---- 0..1 careers          (target career)
skill_assessments 1 ---- N roadmaps         (optional source of a roadmap)
```

There are 9 tables: `users`, `user_profiles`, `careers`, `skills`, `career_skills`, `user_skills`, `skill_assessments`, `roadmaps`, `roadmap_items`.

---

## 3. Tables

### 3.1 `users`

| Column | Type | Rules |
|---|---|---|
| `id` | BIGINT UNSIGNED | PK, auto increment |
| `name` | VARCHAR(100) | Not null |
| `email` | VARCHAR(255) | Not null, unique, stored lowercase |
| `password_hash` | VARCHAR(255) | Not null |
| `created_at` | TIMESTAMP | Default current timestamp |
| `updated_at` | TIMESTAMP | Default current timestamp, updated on change |

### 3.2 `user_profiles`

One row per user, created at registration.

| Column | Type | Rules |
|---|---|---|
| `user_id` | BIGINT UNSIGNED | PK and FK to `users`, `ON DELETE CASCADE` |
| `education_level` | VARCHAR(100) | Nullable |
| `experience_level` | ENUM('beginner','intermediate','advanced') | Nullable |
| `weekly_study_hours` | TINYINT UNSIGNED | Not null, default 5, `CHECK` between 1 and 60 |
| `learning_format` | ENUM('video','reading','practice','mixed') | Not null, default 'mixed' |
| `target_career_id` | BIGINT UNSIGNED | Nullable FK to `careers`, `ON DELETE SET NULL` |
| `created_at` | TIMESTAMP | Default current timestamp |
| `updated_at` | TIMESTAMP | Default current timestamp, updated on change |

### 3.3 `careers`

| Column | Type | Rules |
|---|---|---|
| `id` | BIGINT UNSIGNED | PK |
| `name` | VARCHAR(120) | Not null, unique |
| `slug` | VARCHAR(140) | Not null, unique |
| `description` | TEXT | Not null |
| `created_at` | TIMESTAMP | Default current timestamp |

### 3.4 `skills`

| Column | Type | Rules |
|---|---|---|
| `id` | BIGINT UNSIGNED | PK |
| `name` | VARCHAR(100) | Not null, unique |
| `slug` | VARCHAR(120) | Not null, unique |
| `category` | VARCHAR(60) | Nullable, for grouping in the UI (for example Programming, Database, Tools) |
| `description` | VARCHAR(300) | Nullable |
| `created_at` | TIMESTAMP | Default current timestamp |

### 3.5 `career_skills`

Which skills a career needs, and how well.

| Column | Type | Rules |
|---|---|---|
| `career_id` | BIGINT UNSIGNED | FK to `careers`, `ON DELETE CASCADE` |
| `skill_id` | BIGINT UNSIGNED | FK to `skills`, `ON DELETE CASCADE` |
| `required_level` | TINYINT UNSIGNED | Not null, `CHECK` between 1 and 5 |
| `importance` | TINYINT UNSIGNED | Not null, default 2, `CHECK` between 1 and 3 (1 low, 2 medium, 3 high) |

Primary key: (`career_id`, `skill_id`).

### 3.6 `user_skills`

The user's current self-rated level. A skill the user has not rated has no row (the analysis treats it as `missing`).

| Column | Type | Rules |
|---|---|---|
| `user_id` | BIGINT UNSIGNED | FK to `users`, `ON DELETE CASCADE` |
| `skill_id` | BIGINT UNSIGNED | FK to `skills`, `ON DELETE CASCADE` |
| `current_level` | TINYINT UNSIGNED | Not null, `CHECK` between 1 and 5 |
| `updated_at` | TIMESTAMP | Default current timestamp, updated on change |

Primary key: (`user_id`, `skill_id`). Saving a rating is an upsert; clearing a rating deletes the row.

### 3.7 `skill_assessments`

One saved result of a skill-gap analysis. Rows are never edited, so the history stays accurate.

| Column | Type | Rules |
|---|---|---|
| `id` | BIGINT UNSIGNED | PK |
| `user_id` | BIGINT UNSIGNED | FK to `users`, `ON DELETE CASCADE` |
| `career_id` | BIGINT UNSIGNED | FK to `careers`, `ON DELETE RESTRICT` |
| `readiness_score` | DECIMAL(5,1) | Not null, `CHECK` between 0 and 100 |
| `result_json` | JSON | Not null, shape in section 4 |
| `created_at` | TIMESTAMP | Default current timestamp |

### 3.8 `roadmaps`

| Column | Type | Rules |
|---|---|---|
| `id` | BIGINT UNSIGNED | PK |
| `user_id` | BIGINT UNSIGNED | FK to `users`, `ON DELETE CASCADE` |
| `career_id` | BIGINT UNSIGNED | FK to `careers`, `ON DELETE RESTRICT` |
| `assessment_id` | BIGINT UNSIGNED | Nullable FK to `skill_assessments`, `ON DELETE SET NULL` |
| `title` | VARCHAR(200) | Not null |
| `summary` | TEXT | Nullable |
| `weekly_hours` | TINYINT UNSIGNED | Not null, the hours per week used to build the plan |
| `total_weeks` | SMALLINT UNSIGNED | Not null |
| `ai_generated` | BOOLEAN | Not null, default true (false when the fallback was used) |
| `created_at` | TIMESTAMP | Default current timestamp |
| `updated_at` | TIMESTAMP | Default current timestamp, updated on change |

### 3.9 `roadmap_items`

The learning steps of a roadmap, grouped into phases. Progress is calculated from these rows.

| Column | Type | Rules |
|---|---|---|
| `id` | BIGINT UNSIGNED | PK |
| `roadmap_id` | BIGINT UNSIGNED | FK to `roadmaps`, `ON DELETE CASCADE` |
| `phase_number` | TINYINT UNSIGNED | Not null |
| `phase_title` | VARCHAR(150) | Not null |
| `item_order` | SMALLINT UNSIGNED | Not null, order within the whole roadmap |
| `skill_id` | BIGINT UNSIGNED | Nullable FK to `skills`, `ON DELETE SET NULL` |
| `title` | VARCHAR(200) | Not null, the learning objective |
| `description` | TEXT | Nullable |
| `duration_weeks` | DECIMAL(3,1) | Not null |
| `status` | ENUM('not_started','in_progress','completed') | Not null, default 'not_started' |
| `completed_at` | DATETIME | Nullable, set when status becomes 'completed' |

**Roadmap progress** = completed items / total items x 100. It is calculated when needed, never stored.

---

## 4. `result_json` Shape

`skill_assessments.result_json` stores the computed result and the AI explanation together:

```json
{
  "counts": { "met": 3, "gap": 4, "missing": 2 },
  "skills": [
    {
      "skillId": 12,
      "name": "SQL",
      "category": "Database",
      "currentLevel": 2,
      "requiredLevel": 4,
      "importance": 3,
      "status": "gap",
      "gap": 2,
      "priority": 6
    }
  ],
  "ai": {
    "aiGenerated": true,
    "summary": "Short plain-language explanation.",
    "priorities": [ { "skillId": 12, "reason": "Why this matters first." } ]
  }
}
```

- `skills` is produced by `scoring.js`. For a `missing` skill, `currentLevel` is `null`.
- `ai` comes from `aiService.js`. When the fallback was used, `aiGenerated` is `false`.
- No other column uses JSON.

---

## 5. Indexes and Constraints

- Unique: `users.email`, `careers.slug`, `careers.name`, `skills.slug`, `skills.name`.
- Index every foreign key column.
- Composite indexes: `skill_assessments (user_id, created_at)`, `roadmaps (user_id, created_at)`, `roadmap_items (roadmap_id, item_order)`.
- Use `ON DELETE CASCADE` for data that belongs to a user or a roadmap. Use `RESTRICT` for careers referenced by saved results, and `SET NULL` where history should survive (`assessment_id`, `skill_id`, `target_career_id`).

---

## 6. Seed Data Requirements

`seed.sql` must load on a freshly created schema and must not contain any user data.

| Data | Requirement |
|---|---|
| Careers | 6 careers, for example Python Developer, Full-Stack Developer, Frontend Developer, Backend Developer, Data Analyst, AI/ML Engineer, each with a short description |
| Skills | About 30 to 40 skills (the seed has 33), each used by at least one career, with categories, for example Python, JavaScript, HTML, CSS, React, Node.js, SQL, MySQL, Git, REST APIs, Data Structures, OOP, Statistics, Pandas, Data Visualization, Machine Learning |
| Career skills | 8 to 12 skills per career, each with a `required_level` (1 to 5) and `importance` (1 to 3) |

The required levels are curated baselines agreed by the team. They are not live market data, and the UI should not claim otherwise.

---

## 7. Privacy and Data Lifecycle

- Deleting a user removes their profile, ratings, assessments, roadmaps, and roadmap items (`ON DELETE CASCADE`).
- Deleting a roadmap removes its items.
- The AI provider never receives a user's name or email; only career name, skill names and levels, and weekly hours.
- Seed data and `schema.sql` contain no secrets.

---

## 8. Implementation Notes

- Run `schema.sql` first and `seed.sql` second on a fresh database. To reset during development, drop and recreate the database.
- `schema.sql` is the only place where tables are created. Change it and this document together.
- Map `snake_case` columns to `camelCase` JSON in the service layer, consistently for every endpoint.
- If a column is added later, update this document in the same commit.


---

## Version 2 tables

Three tables were added (`migration_002_features.sql`, also in `schema.sql`), so there are now 12 tables.

```text
users 1 ---- N quiz_attempts N ---- 1 skills
users 1 ---- N projects N ---- 0..1 careers      (skill_ids is a JSON list of skills.id)
users 1 ---- N study_sessions N ---- 0..1 roadmap_items
```

| Table | Purpose | Key columns |
|---|---|---|
| `quiz_attempts` | One row per skill quiz taken (evidence of ability) | `user_id`, `skill_id`, `correct_count`, `total_questions`, `estimated_level` (1 to 4) |
| `projects` | Project Lab ideas the user keeps | `title`, `description`, `difficulty` and `estimated_hours` (calculated in code), `deliverables` JSON, `skill_ids` JSON, `status` (suggested, in_progress, completed) |
| `study_sessions` | Weekly planner | `planned_date`, `planned_minutes`, `completed_minutes`, `status` (planned, done, skipped), optional `roadmap_item_id` |

All three carry `user_id` and every query filters by it. Quiz questions and learning resources are curated in code (`backend/data/quizBank.js`, `resourceBank.js`), not in the database.
