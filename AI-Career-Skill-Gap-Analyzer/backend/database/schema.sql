-- =============================================================================
-- AI Career Skill-Gap Analyzer: database schema (MySQL 8.0.16 or later)
-- Source of truth: DATABASE.md. Change both together.
--
-- Run ONCE on an empty database:
--   mysql -u root -p -e "CREATE DATABASE career_skill_analyzer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
--   mysql -u root -p career_skill_analyzer < backend/database/schema.sql
--   mysql -u root -p career_skill_analyzer < backend/database/seed.sql
--
-- To start over: DROP DATABASE career_skill_analyzer; then repeat the steps above.
-- This script does not drop anything, so running it twice stops with an error
-- instead of silently deleting data.
-- =============================================================================

SET NAMES utf8mb4;

-- 3.1 users --------------------------------------------------------------------
CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)    NOT NULL,
  email         VARCHAR(255)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.3 careers ------------------------------------------------------------------
CREATE TABLE careers (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120)    NOT NULL,
  slug        VARCHAR(140)    NOT NULL,
  description TEXT            NOT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_careers_name (name),
  UNIQUE KEY uq_careers_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.4 skills -------------------------------------------------------------------
CREATE TABLE skills (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)    NOT NULL,
  slug        VARCHAR(120)    NOT NULL,
  category    VARCHAR(60)     NULL,
  description VARCHAR(300)    NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skills_name (name),
  UNIQUE KEY uq_skills_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.2 user_profiles (one row per user) -----------------------------------------
CREATE TABLE user_profiles (
  user_id            BIGINT UNSIGNED NOT NULL,
  education_level    VARCHAR(100)    NULL,
  experience_level   ENUM('beginner','intermediate','advanced') NULL,
  weekly_study_hours TINYINT UNSIGNED NOT NULL DEFAULT 5,
  learning_format    ENUM('video','reading','practice','mixed') NOT NULL DEFAULT 'mixed',
  target_career_id   BIGINT UNSIGNED NULL,
  created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_user_profiles_target_career (target_career_id),
  CONSTRAINT fk_user_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_profiles_career
    FOREIGN KEY (target_career_id) REFERENCES careers (id) ON DELETE SET NULL,
  CONSTRAINT chk_user_profiles_hours CHECK (weekly_study_hours BETWEEN 1 AND 60)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.5 career_skills (what each career needs) -----------------------------------
-- importance: 1 low, 2 medium, 3 high
CREATE TABLE career_skills (
  career_id      BIGINT UNSIGNED  NOT NULL,
  skill_id       BIGINT UNSIGNED  NOT NULL,
  required_level TINYINT UNSIGNED NOT NULL,
  importance     TINYINT UNSIGNED NOT NULL DEFAULT 2,
  PRIMARY KEY (career_id, skill_id),
  KEY idx_career_skills_skill (skill_id),
  CONSTRAINT fk_career_skills_career
    FOREIGN KEY (career_id) REFERENCES careers (id) ON DELETE CASCADE,
  CONSTRAINT fk_career_skills_skill
    FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE,
  CONSTRAINT chk_career_skills_level CHECK (required_level BETWEEN 1 AND 5),
  CONSTRAINT chk_career_skills_importance CHECK (importance BETWEEN 1 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.6 user_skills (the user's own ratings; no row = not rated) -----------------
CREATE TABLE user_skills (
  user_id       BIGINT UNSIGNED  NOT NULL,
  skill_id      BIGINT UNSIGNED  NOT NULL,
  current_level TINYINT UNSIGNED NOT NULL,
  updated_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, skill_id),
  KEY idx_user_skills_skill (skill_id),
  CONSTRAINT fk_user_skills_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_skills_skill
    FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE,
  CONSTRAINT chk_user_skills_level CHECK (current_level BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.7 skill_assessments (saved analyses; rows are never edited) ----------------
CREATE TABLE skill_assessments (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  career_id       BIGINT UNSIGNED NOT NULL,
  readiness_score DECIMAL(5,1)    NOT NULL,
  result_json     JSON            NOT NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_assessments_user_created (user_id, created_at),
  KEY idx_assessments_career (career_id),
  CONSTRAINT fk_assessments_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_assessments_career
    FOREIGN KEY (career_id) REFERENCES careers (id) ON DELETE RESTRICT,
  CONSTRAINT chk_assessments_score CHECK (readiness_score BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.8 roadmaps -----------------------------------------------------------------
CREATE TABLE roadmaps (
  id            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED   NOT NULL,
  career_id     BIGINT UNSIGNED   NOT NULL,
  assessment_id BIGINT UNSIGNED   NULL,
  title         VARCHAR(200)      NOT NULL,
  summary       TEXT              NULL,
  weekly_hours  TINYINT UNSIGNED  NOT NULL,
  total_weeks   SMALLINT UNSIGNED NOT NULL,
  ai_generated  BOOLEAN           NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_roadmaps_user_created (user_id, created_at),
  KEY idx_roadmaps_career (career_id),
  KEY idx_roadmaps_assessment (assessment_id),
  CONSTRAINT fk_roadmaps_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_roadmaps_career
    FOREIGN KEY (career_id) REFERENCES careers (id) ON DELETE RESTRICT,
  CONSTRAINT fk_roadmaps_assessment
    FOREIGN KEY (assessment_id) REFERENCES skill_assessments (id) ON DELETE SET NULL,
  CONSTRAINT chk_roadmaps_hours CHECK (weekly_hours BETWEEN 1 AND 60)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.9 roadmap_items (progress = completed items / all items) -------------------
CREATE TABLE roadmap_items (
  id             BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  roadmap_id     BIGINT UNSIGNED   NOT NULL,
  phase_number   TINYINT UNSIGNED  NOT NULL,
  phase_title    VARCHAR(150)      NOT NULL,
  item_order     SMALLINT UNSIGNED NOT NULL,
  skill_id       BIGINT UNSIGNED   NULL,
  title          VARCHAR(200)      NOT NULL,
  description    TEXT              NULL,
  duration_weeks DECIMAL(3,1)      NOT NULL,
  status         ENUM('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
  completed_at   DATETIME          NULL,
  PRIMARY KEY (id),
  KEY idx_roadmap_items_order (roadmap_id, item_order),
  KEY idx_roadmap_items_skill (skill_id),
  CONSTRAINT fk_roadmap_items_roadmap
    FOREIGN KEY (roadmap_id) REFERENCES roadmaps (id) ON DELETE CASCADE,
  CONSTRAINT fk_roadmap_items_skill
    FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Added in version 2 (same as migration_002_features.sql) ----
-- 3.10 quiz_attempts (evidence of ability; one row per skill per quiz taken) ------
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED  NOT NULL,
  skill_id        BIGINT UNSIGNED  NOT NULL,
  correct_count   TINYINT UNSIGNED NOT NULL,
  total_questions TINYINT UNSIGNED NOT NULL,
  estimated_level TINYINT UNSIGNED NOT NULL,
  created_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_quiz_user_skill (user_id, skill_id, created_at),
  CONSTRAINT fk_quiz_user  FOREIGN KEY (user_id)  REFERENCES users (id)  ON DELETE CASCADE,
  CONSTRAINT fk_quiz_skill FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE,
  CONSTRAINT chk_quiz_level CHECK (estimated_level BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.11 projects (AI Project Lab suggestions the user keeps) ----------------------
CREATE TABLE IF NOT EXISTS projects (
  id              BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED   NOT NULL,
  career_id       BIGINT UNSIGNED   NULL,
  title           VARCHAR(200)      NOT NULL,
  description     TEXT              NOT NULL,
  difficulty      ENUM('starter','intermediate','advanced') NOT NULL DEFAULT 'starter',
  estimated_hours SMALLINT UNSIGNED NOT NULL,
  deliverables    JSON              NOT NULL,
  skill_ids       JSON              NOT NULL,
  status          ENUM('suggested','in_progress','completed') NOT NULL DEFAULT 'suggested',
  ai_generated    BOOLEAN           NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_projects_user (user_id, created_at),
  CONSTRAINT fk_projects_user   FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE CASCADE,
  CONSTRAINT fk_projects_career FOREIGN KEY (career_id) REFERENCES careers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.12 study_sessions (weekly planner; progress = completed minutes / planned) ---
CREATE TABLE IF NOT EXISTS study_sessions (
  id                BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED   NOT NULL,
  roadmap_item_id   BIGINT UNSIGNED   NULL,
  title             VARCHAR(200)      NOT NULL,
  planned_date      DATE              NOT NULL,
  planned_minutes   SMALLINT UNSIGNED NOT NULL,
  completed_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  status            ENUM('planned','done','skipped') NOT NULL DEFAULT 'planned',
  created_at        TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sessions_user_date (user_id, planned_date),
  KEY idx_sessions_item (roadmap_item_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_item FOREIGN KEY (roadmap_item_id) REFERENCES roadmap_items (id) ON DELETE SET NULL,
  CONSTRAINT chk_sessions_minutes CHECK (planned_minutes BETWEEN 10 AND 600)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
