const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) env[k.trim()] = v.trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function seedTournament() {
    console.log('--- SEEDING TOURNAMENT FOR TESTING ---');

    // 1. Get teams
    const { data: teams } = await supabase.from('teams').select('id, name').limit(4);
    if (!teams || teams.length < 2) {
        console.log('Not enough teams to seed a tournament.');
        return;
    }

    // 2. Create tournament
    const { data: t, error: te } = await supabase.from('tournaments').insert([{
        name: 'Agent Test Bash',
        status: 'Ongoing'
    }]).select().single();

    if (te) return console.error('T-Error:', te);
    console.log('Tournament Created:', t.id);

    // 3. Add teams
    const tt = teams.map(tm => ({ tournament_id: t.id, team_id: tm.id }));
    await supabase.from('tournament_teams').insert(tt);

    // 4. Add 1 match
    const { data: grounds } = await supabase.from('grounds').select('id').limit(1);
    const gid = grounds[0].id;

    await supabase.from('matches').insert([{
        tournament_id: t.id,
        team_a_id: teams[0].id,
        team_b_id: teams[1].id,
        ground_id: gid,
        match_date: new Date().toISOString().split('T')[0],
        match_time: '12:00:00',
        overs_type: 'T20',
        status: 'Scheduled'
    }]);

    console.log('SEED COMPLETE. LINK:', `/tournament?id=${t.id}`);
}

seedTournament();
