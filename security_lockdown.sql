-- 1. Enable RLS on Sensitive Tables
ALTER TABLE strava_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE bikes ENABLE ROW LEVEL SECURITY;

-- 2. Grant Full Access to Service Role (Python Backend)
-- This allows the backend (using SUPABASE_SERVICE_KEY) to read/write.
DROP POLICY IF EXISTS "Service Role Full Access Activities" ON strava_activities;
CREATE POLICY "Service Role Full Access Activities" ON strava_activities FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Full Access Streams" ON strava_streams;
CREATE POLICY "Service Role Full Access Streams" ON strava_streams FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Full Access Bikes" ON bikes;
CREATE POLICY "Service Role Full Access Bikes" ON bikes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. ENSURE NO POLICIES FOR 'anon' or 'authenticated' (unless using Supabase Auth)
-- This effectively blocks direct frontend access via Anon Key.
-- If previous policies existed (like "users can select own"), you might want to drop them 
-- if you strictly want to force backend-only access.
-- DROP POLICY IF EXISTS "Users can view own activities" ON strava_activities;
-- DROP POLICY IF EXISTS "Anon read access" ON strava_activities;
