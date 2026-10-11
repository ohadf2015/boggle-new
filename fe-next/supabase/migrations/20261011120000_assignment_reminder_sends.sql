-- Ledger for assignment due-soon / overdue teacher emails.
-- Service role only (RLS on, no policies). Unique on (assignment, teacher, kind)
-- so the daily cron cannot double-send after a retry.

CREATE TABLE IF NOT EXISTS assignment_reminder_sends (
    assignment_id UUID NOT NULL REFERENCES lesson_assignments(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('due_soon', 'overdue')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (assignment_id, recipient_id, kind)
);

COMMENT ON TABLE assignment_reminder_sends IS 'Idempotency ledger for assignment due-soon and overdue teacher emails';

CREATE INDEX IF NOT EXISTS idx_assignment_reminder_sends_recipient
    ON assignment_reminder_sends(recipient_id, sent_at DESC);

ALTER TABLE assignment_reminder_sends ENABLE ROW LEVEL SECURITY;
