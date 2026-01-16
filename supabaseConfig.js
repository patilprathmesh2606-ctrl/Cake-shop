// supabaseConfig.js
const SUPABASE_URL = 'https://ivvppceuqblhhbqnyfjp.supabase.co'; // Replace with your actual URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dnBwY2V1cWJsaGhicW55ZmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTc3ODgsImV4cCI6MjA4Mzk5Mzc4OH0.iM48uGRMQjOVGKqqV7Z3mPGFH4BkWEnZS6T-Zw0dcPs';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
