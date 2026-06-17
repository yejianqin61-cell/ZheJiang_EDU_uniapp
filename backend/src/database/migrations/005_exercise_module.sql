-- 005_exercise_module.sql
-- 练习模块：同步练 / 单元练 / 专题练 / 期中期末练

CREATE TABLE IF NOT EXISTS exercise_category (
    id          UUID PRIMARY KEY,
    type        VARCHAR(16) NOT NULL,      -- 'unit' | 'topic' | 'exam'
    grade       VARCHAR(32) NOT NULL,
    subject     VARCHAR(32) NOT NULL,
    name        VARCHAR(128) NOT NULL,
    term        VARCHAR(32),               -- '上学期' | '下学期'
    exam_type   VARCHAR(32),               -- '期中' | '期末'
    sort_order  INTEGER DEFAULT 0,
    created_by  UUID,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ecat_type ON exercise_category(type);
CREATE INDEX IF NOT EXISTS idx_ecat_grade_subject ON exercise_category(grade, subject);

CREATE TABLE IF NOT EXISTS exercise_lesson (
    id          UUID PRIMARY KEY,
    unit_id     UUID NOT NULL REFERENCES exercise_category(id) ON DELETE CASCADE,
    name        VARCHAR(128) NOT NULL,
    sort_order  INTEGER DEFAULT 0,
    created_by  UUID,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_elesson_unit ON exercise_lesson(unit_id);

CREATE TABLE IF NOT EXISTS exercise_paper (
    id              UUID PRIMARY KEY,
    category_id     UUID REFERENCES exercise_category(id) ON DELETE CASCADE,
    lesson_id       UUID REFERENCES exercise_lesson(id) ON DELETE CASCADE,
    title           VARCHAR(256) NOT NULL,
    file_url        VARCHAR(512) NOT NULL,
    file_type       VARCHAR(8) NOT NULL,   -- 'pdf' | 'docx'
    file_size       INTEGER,
    page_count      INTEGER,
    thumbnail_url   VARCHAR(512),
    download_count  INTEGER DEFAULT 0,
    sort_order      INTEGER DEFAULT 0,
    created_by      UUID,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ep_owner CHECK (category_id IS NOT NULL OR lesson_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_ep_cat ON exercise_paper(category_id);
CREATE INDEX IF NOT EXISTS idx_ep_lesson ON exercise_paper(lesson_id);

CREATE TABLE IF NOT EXISTS exercise_draw_record (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL,
    node_type   VARCHAR(16) NOT NULL,  -- 'category' | 'lesson'
    node_id     UUID NOT NULL,
    paper_id    UUID NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, node_type, node_id)
);
