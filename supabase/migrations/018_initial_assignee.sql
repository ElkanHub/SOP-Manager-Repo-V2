-- Migration 016: Add initial_assignee_id to equipment table

ALTER TABLE equipment ADD COLUMN initial_assignee_id uuid REFERENCES profiles(id);
