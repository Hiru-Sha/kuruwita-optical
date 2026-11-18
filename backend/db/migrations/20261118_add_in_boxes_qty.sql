-- Add an explicit "In Boxes" quantity bucket to inventory.
-- Safe for existing data: all existing rows receive 0 and their current
-- showroom, stock-room (derived), and missing quantities remain unchanged.
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS in_boxes_qty INTEGER NOT NULL DEFAULT 0;
