const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) env[k.trim()] = v.trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function debug() {
    console.log('--- TOURNAMENTS ---');
    const { data: tournaments } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false }).limit(5);
    console.log(JSON.stringify(tournaments, null, 2));

    if (tournaments && tournaments.length > 0) {
        const tid = tournaments[0].id;
        console.log(`\n--- MATCHES FOR TOURNAMENT ${tid} ---`);
        const { data: matches } = await supabase.from('matches').select('*').eq('tournament_id', tid);
        console.log(`Found ${matches ? matches.length : 0} matches`);
        console.log(JSON.stringify(matches, null, 2));

        console.log(`\n--- TEAMS FOR TOURNAMENT ${tid} ---`);
        const { data: tt } = await supabase.from('tournament_teams').select('*, teams(*)').eq('tournament_id', tid);
        console.log(`Found ${tt ? tt.length : 0} teams`);
        console.log(JSON.stringify(tt, null, 2));
    }
}

debug();
