-- Add missing department_detail column to inspection table.
-- This column was referenced in the API but missing from the original schema,
-- causing INSERT/UPDATE failures when creating or editing inspection records.
ALTER TABLE inspection ADD COLUMN department_detail TEXT DEFAULT '';
