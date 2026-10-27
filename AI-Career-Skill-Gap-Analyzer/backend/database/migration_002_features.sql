-- =============================================================================
-- Migration 002: Project Lab, skill quiz evidence, weekly study planner.
-- Safe to run more than once (CREATE TABLE IF NOT EXISTS). The same tables are
-- also part of schema.sql for fresh installs.
--   mysql -u root -p career_skill_analyzer < backend/database/migration_002_features.sql
-- =============================================================================

SET NAMES utf8mb4;

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
