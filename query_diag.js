const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) env[k.trim()] = v.trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkQueries() {
    console.log('--- TESTING MATCH QUERY VARIANTS ---');

    // Variant 1: The one I currently use
    const { data: v1, error: e1 } = await supabase.from('matches').select(`
        id,
        team_a:teams!team_a_id(name),
        team_b:teams!team_b_id(name)
    `).limit(1);
    console.log('V1 (Explicit Join):', JSON.stringify(v1, null, 2));
    if (e1) console.error('V1 Error:', e1);

    // Variant 2: Using the FK column names directly as relationships
    const { data: v2, error: e2 } = await supabase.from('matches').select(`
        id,
        team_a_id(name),
        team_b_id(name)
    `).limit(1);
    console.log('V2 (Column names):', JSON.stringify(v2, null, 2));
    if (e2) console.error('V2 Error:', e2);

    // Variant 3: Simpler teams check
    const { data: v3, error: e3 } = await supabase.from('tournament_teams').select(`
        team_id,
        teams(id, name)
    `).limit(1);
    console.log('V3 (Teams Join):', JSON.stringify(v3, null, 2));
    if (e3) console.error('V3 Error:', e3);
}

checkQueries();
