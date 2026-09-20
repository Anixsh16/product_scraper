const { supabase } = require('./src/config/supabase');

async function checkLogs() {
  const { data, error } = await supabase
    .from('scrape_logs')
    .select('attempted_at, status, attempt_number, duration_ms, error_message')
    .order('attempted_at', { ascending: false })
    .limit(8);

  if (error) {
    console.error('Error fetching logs:', error.message);
    return;
  }

  console.log('\n=== RECENT SCRAPE ATTEMPTS (from Supabase scrape_logs) ===');
  console.table(data);
}

checkLogs();
