-- Add VAT rate to products (default 21%)
ALTER TABLE products ADD COLUMN IF NOT EXISTS vat_rate integer NOT NULL DEFAULT 21;

-- Add VAT number and country to profiles for intra-community handling
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vat_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vat_country text;
