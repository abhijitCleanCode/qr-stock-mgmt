-- Which sizes the defective pieces of a stock-in variant came from. Stored as a JSON array of
-- size labels. Existing rows have no size record, so they get an empty array.

ALTER TABLE "stock_in_transactions" ADD COLUMN "defect_sizes" jsonb DEFAULT '[]'::jsonb NOT NULL;
