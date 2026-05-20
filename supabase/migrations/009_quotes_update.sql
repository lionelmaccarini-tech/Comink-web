-- Update quotes table for cart-to-quote feature
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS cart_items jsonb DEFAULT '[]';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS reference text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS vat_number text;

-- App settings table for configurable parameters
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
INSERT INTO app_settings (key, value) VALUES ('quote_validity_days', '30') ON CONFLICT DO NOTHING;

-- RLS for app_settings: admin read/write, public read
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Public can read settings'
  ) THEN
    CREATE POLICY "Public can read settings" ON app_settings FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Admin can manage settings'
  ) THEN
    CREATE POLICY "Admin can manage settings" ON app_settings FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;
