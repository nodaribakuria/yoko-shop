// Copy the Project URL and the public publishable/anon key from Supabase.
// Never put a service_role/secret key in this file.
const YOKO_SUPABASE_URL = 'https://rizzwwdatjosbgxvowtd.supabase.co';
const YOKO_SUPABASE_PUBLIC_KEY = 'sb_publishable_YjYudjFJEdL4Ff6-cz3hwA_zEssQZaP';

window.yokoSupabase = null;
window.yokoSupabaseConfigured = false;

if (window.supabase?.createClient &&
    !YOKO_SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
    !YOKO_SUPABASE_PUBLIC_KEY.includes('YOUR_SUPABASE_')) {
  window.yokoSupabase = window.supabase.createClient(YOKO_SUPABASE_URL, YOKO_SUPABASE_PUBLIC_KEY);
  window.yokoSupabaseConfigured = true;
}
