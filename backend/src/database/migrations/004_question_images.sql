-- 004_question_images: 题目图片支持
ALTER TABLE question ADD COLUMN "images" JSONB DEFAULT '[]';
ALTER TABLE question ADD COLUMN "content_has_images" BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN question.images IS '题目配图元数据 [{url,caption,width,height,position}]';
COMMENT ON COLUMN question.content_has_images IS '题目内容是否包含Markdown图片引用';
