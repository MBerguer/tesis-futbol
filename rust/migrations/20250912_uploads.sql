-- Uploads table to track PDF ingestion jobs and idempotency by hash
CREATE TABLE IF NOT EXISTS uploads (
    upload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_pdf_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received', -- received | processing | done | error
    match_id UUID REFERENCES matches(match_id) ON DELETE SET NULL,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_uploads_source_pdf_hash ON uploads(source_pdf_hash);


