-- =============================================
-- CURRICULUM WORD LISTS TABLE
-- Migration: 20260205000000_curriculum_word_lists
-- Description: Creates table for pre-built curriculum-aligned word lists
-- for Israeli educational standards
-- =============================================

-- =============================================
-- GRADE LEVEL ENUM
-- Israeli education system: grades 1-12 (elementary, middle, high)
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grade_level') THEN
        CREATE TYPE grade_level AS ENUM (
            'grade_1', 'grade_2', 'grade_3', 'grade_4', 'grade_5', 'grade_6',  -- Elementary
            'grade_7', 'grade_8', 'grade_9',  -- Middle School
            'grade_10', 'grade_11', 'grade_12'  -- High School
        );
    END IF;
END $$;

-- =============================================
-- SUBJECT ENUM
-- Common subjects for vocabulary learning
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'curriculum_subject') THEN
        CREATE TYPE curriculum_subject AS ENUM (
            'english',      -- English as second language
            'hebrew',       -- Hebrew language arts
            'science',      -- Science vocabulary
            'math',         -- Math terminology
            'history',      -- History terms
            'geography',    -- Geography terms
            'general'       -- General vocabulary
        );
    END IF;
END $$;

-- =============================================
-- CURRICULUM WORD LISTS TABLE
-- Pre-built word lists aligned with Israeli curriculum standards
-- =============================================
CREATE TABLE IF NOT EXISTS curriculum_word_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic info
    name TEXT NOT NULL CHECK (LENGTH(name) <= 100),
    description TEXT CHECK (description IS NULL OR LENGTH(description) <= 500),
    language TEXT NOT NULL DEFAULT 'en',

    -- Curriculum metadata
    grade_level grade_level NOT NULL,
    subject curriculum_subject NOT NULL DEFAULT 'english',
    curriculum_standard TEXT,  -- Reference to Israeli MOE standard (e.g., "MOE-ENG-G5-U3")

    -- Word content (same structure as vocabulary_lessons.words)
    words JSONB NOT NULL DEFAULT '[]',
    word_count INTEGER GENERATED ALWAYS AS (jsonb_array_length(words)) STORED,

    -- Status and metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Admin who created
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE curriculum_word_lists IS 'Pre-built word lists aligned with Israeli educational curriculum standards';
COMMENT ON COLUMN curriculum_word_lists.name IS 'Display name for the word list (max 100 characters)';
COMMENT ON COLUMN curriculum_word_lists.description IS 'Optional description (max 500 characters)';
COMMENT ON COLUMN curriculum_word_lists.language IS 'Language of the words (en, he, sv, ja)';
COMMENT ON COLUMN curriculum_word_lists.grade_level IS 'Target grade level (grade_1 through grade_12)';
COMMENT ON COLUMN curriculum_word_lists.subject IS 'Subject area (english, hebrew, science, math, history, geography, general)';
COMMENT ON COLUMN curriculum_word_lists.curriculum_standard IS 'Reference to official curriculum standard code';
COMMENT ON COLUMN curriculum_word_lists.words IS 'Array of {word, definition?, canIntegrate} objects';
COMMENT ON COLUMN curriculum_word_lists.word_count IS 'Auto-computed count of words in the list';
COMMENT ON COLUMN curriculum_word_lists.is_active IS 'Whether this list is available for teachers to use';
COMMENT ON COLUMN curriculum_word_lists.created_by IS 'Admin user who created this curriculum list';

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_curriculum_word_lists_grade_level
    ON curriculum_word_lists(grade_level);

CREATE INDEX IF NOT EXISTS idx_curriculum_word_lists_subject
    ON curriculum_word_lists(subject);

CREATE INDEX IF NOT EXISTS idx_curriculum_word_lists_language
    ON curriculum_word_lists(language);

CREATE INDEX IF NOT EXISTS idx_curriculum_word_lists_active
    ON curriculum_word_lists(is_active) WHERE is_active = TRUE;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_curriculum_word_lists_filters
    ON curriculum_word_lists(language, grade_level, subject) WHERE is_active = TRUE;

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE TRIGGER update_curriculum_word_lists_updated_at
    BEFORE UPDATE ON curriculum_word_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE curriculum_word_lists ENABLE ROW LEVEL SECURITY;

-- Anyone can view active curriculum word lists
DROP POLICY IF EXISTS "Anyone can view active curriculum lists" ON curriculum_word_lists;
CREATE POLICY "Anyone can view active curriculum lists"
    ON curriculum_word_lists FOR SELECT
    USING (is_active = TRUE);

-- Admins can view all curriculum lists (including inactive)
DROP POLICY IF EXISTS "Admins can view all curriculum lists" ON curriculum_word_lists;
CREATE POLICY "Admins can view all curriculum lists"
    ON curriculum_word_lists FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND user_role = 'admin'
        )
    );

-- Admins can create curriculum lists
DROP POLICY IF EXISTS "Admins can create curriculum lists" ON curriculum_word_lists;
CREATE POLICY "Admins can create curriculum lists"
    ON curriculum_word_lists FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND user_role = 'admin'
        )
    );

-- Admins can update curriculum lists
DROP POLICY IF EXISTS "Admins can update curriculum lists" ON curriculum_word_lists;
CREATE POLICY "Admins can update curriculum lists"
    ON curriculum_word_lists FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND user_role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND user_role = 'admin'
        )
    );

-- Admins can delete curriculum lists
DROP POLICY IF EXISTS "Admins can delete curriculum lists" ON curriculum_word_lists;
CREATE POLICY "Admins can delete curriculum lists"
    ON curriculum_word_lists FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND user_role = 'admin'
        )
    );

-- =============================================
-- SEED DATA: Sample curriculum word lists
-- Israeli English curriculum - Elementary grades
-- =============================================
INSERT INTO curriculum_word_lists (name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
    -- Grade 3 English
    (
        'Grade 3 - Basic English Vocabulary',
        'Foundational English vocabulary for 3rd grade students aligned with Israeli MOE standards',
        'en',
        'grade_3',
        'english',
        'MOE-ENG-G3-CORE',
        '[
            {"word": "apple", "definition": "A round fruit that is red, green, or yellow", "canIntegrate": true},
            {"word": "book", "definition": "Pages with writing or pictures bound together", "canIntegrate": true},
            {"word": "cat", "definition": "A small furry animal that meows", "canIntegrate": true},
            {"word": "dog", "definition": "A furry animal that barks", "canIntegrate": true},
            {"word": "eat", "definition": "To put food in your mouth and swallow it", "canIntegrate": true},
            {"word": "friend", "definition": "A person you like and enjoy being with", "canIntegrate": true},
            {"word": "good", "definition": "Of high quality or pleasant", "canIntegrate": true},
            {"word": "happy", "definition": "Feeling joy or pleasure", "canIntegrate": true},
            {"word": "house", "definition": "A building where people live", "canIntegrate": true},
            {"word": "jump", "definition": "To push yourself up into the air", "canIntegrate": true}
        ]'::jsonb,
        TRUE
    ),
    -- Grade 5 English
    (
        'Grade 5 - Intermediate English Vocabulary',
        'Intermediate English vocabulary for 5th grade students',
        'en',
        'grade_5',
        'english',
        'MOE-ENG-G5-CORE',
        '[
            {"word": "adventure", "definition": "An exciting experience or journey", "canIntegrate": true},
            {"word": "beautiful", "definition": "Very pleasing to look at", "canIntegrate": true},
            {"word": "celebrate", "definition": "To do something special for an occasion", "canIntegrate": true},
            {"word": "discover", "definition": "To find something for the first time", "canIntegrate": true},
            {"word": "environment", "definition": "The natural world around us", "canIntegrate": true},
            {"word": "favorite", "definition": "The one you like best", "canIntegrate": true},
            {"word": "grateful", "definition": "Feeling thankful", "canIntegrate": true},
            {"word": "history", "definition": "Events that happened in the past", "canIntegrate": true},
            {"word": "important", "definition": "Having great value or meaning", "canIntegrate": true},
            {"word": "journey", "definition": "A trip from one place to another", "canIntegrate": true}
        ]'::jsonb,
        TRUE
    ),
    -- Grade 7 English
    (
        'Grade 7 - Academic English Vocabulary',
        'Academic vocabulary for 7th grade middle school students',
        'en',
        'grade_7',
        'english',
        'MOE-ENG-G7-CORE',
        '[
            {"word": "analyze", "definition": "To examine something in detail", "canIntegrate": true},
            {"word": "communicate", "definition": "To share information with others", "canIntegrate": true},
            {"word": "demonstrate", "definition": "To show how something works", "canIntegrate": true},
            {"word": "evaluate", "definition": "To judge the quality or value of something", "canIntegrate": true},
            {"word": "hypothesis", "definition": "An educated guess that can be tested", "canIntegrate": true},
            {"word": "investigate", "definition": "To examine and discover facts", "canIntegrate": true},
            {"word": "perspective", "definition": "A particular way of viewing things", "canIntegrate": true},
            {"word": "significant", "definition": "Important or notable", "canIntegrate": true},
            {"word": "summarize", "definition": "To give a brief statement of main points", "canIntegrate": true},
            {"word": "technology", "definition": "Tools and machines created by science", "canIntegrate": true}
        ]'::jsonb,
        TRUE
    ),
    -- Grade 3 Hebrew vocabulary (for Hebrew speakers learning English)
    (
        'כיתה ג - אוצר מילים בסיסי',
        'אוצר מילים בסיסי באנגלית לתלמידי כיתה ג',
        'he',
        'grade_3',
        'english',
        'MOE-ENG-G3-HE',
        '[
            {"word": "school", "definition": "בית ספר - מקום שבו לומדים", "canIntegrate": true},
            {"word": "teacher", "definition": "מורה - אדם שמלמד", "canIntegrate": true},
            {"word": "student", "definition": "תלמיד - אדם שלומד", "canIntegrate": true},
            {"word": "pencil", "definition": "עיפרון - כלי לכתיבה", "canIntegrate": true},
            {"word": "notebook", "definition": "מחברת - דפים לכתיבה", "canIntegrate": true},
            {"word": "family", "definition": "משפחה - אנשים קרובים", "canIntegrate": true},
            {"word": "water", "definition": "מים - נוזל שאנחנו שותים", "canIntegrate": true},
            {"word": "food", "definition": "אוכל - דברים שאנחנו אוכלים", "canIntegrate": true},
            {"word": "play", "definition": "לשחק - לעשות משחקים", "canIntegrate": true},
            {"word": "read", "definition": "לקרוא - להבין טקסט כתוב", "canIntegrate": true}
        ]'::jsonb,
        TRUE
    )
ON CONFLICT DO NOTHING;
