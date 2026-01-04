const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) env[k.trim()] = v.trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function runTest() {
    console.log('--- STARTING TOURNAMENT INTEGRATION TEST ---');

    // 1. Get or Create Teams
    let { data: teams } = await supabase.from('teams').select('id, name').limit(4);
    if (!teams || teams.length < 4) {
        console.log('Seeding 4 test teams...');
        const newTeams = [];
        for (let i = 1; i <= 4; i++) {
            newTeams.push({ name: `Test Team ${i}`, captain_name: `Captain ${i}` });
        }
        const { data: seeded } = await supabase.from('teams').insert(newTeams).select();
        teams = seeded;
    }
    console.log(`Using ${teams.length} teams: ${teams.map(t => t.name).join(', ')}`);

    // 2. Create Tournament
    console.log('\nCreating Tournament...');
    const { data: tournament, error: tError } = await supabase
        .from('tournaments')
        .insert([{ name: 'Automated Test Tournament', status: 'Upcoming' }])
        .select()
        .single();

    if (tError) {
        console.error('FAILED TO CREATE TOURNAMENT:', tError);
        return;
    }
    console.log('Tournament Created:', tournament.name, tournament.id);

    // 3. Link Teams
    console.log('Linking Teams...');
    const links = teams.map(t => ({ tournament_id: tournament.id, team_id: t.id }));
    const { error: lError } = await supabase.from('tournament_teams').insert(links);
    if (lError) {
        console.error('FAILED TO LINK TEAMS:', lError);
        return;
    }
    console.log('Teams Linked Successfully');

    // 4. Generate Matches
    console.log('Generating Matches...');
    const { data: grounds } = await supabase.from('grounds').select('id').limit(1);
    const groundId = grounds && grounds.length > 0 ? grounds[0].id : null;

    if (!groundId) {
        console.error('FATAL: No ground found. Matches cannot be created.');
        return;
    }

    const fixtures = [];
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            fixtures.push({
                tournament_id: tournament.id,
                team_a_id: teams[i].id,
                team_b_id: teams[j].id,
                ground_id: groundId,
                match_date: new Date().toISOString().split('T')[0],
                match_time: '10:00:00',
                overs_type: 'T20',
                status: 'Scheduled'
            });
        }
    }

    const { error: fError } = await supabase.from('matches').insert(fixtures);
    if (fError) {
        console.error('FAILED TO INSERT MATCHES:', fError);
        return;
    }
    console.log(`Inserted ${fixtures.length} matches`);

    // 5. TEST RETRIEVAL (The part that counts)
    console.log('\n--- TESTING RETRIEVAL (Same as UI Logic) ---');

    // Fetch Teams with manual join (Supabase syntax can be tricky)
    const { data: ttData, error: ttError } = await supabase
        .from('tournament_teams')
        .select('team_id, teams(id, name)')
        .eq('tournament_id', tournament.id);

    if (ttError) console.error('TT Fetch Error:', ttError);
    else console.log(`Retrieved ${ttData.length} teams via junction table`);

    const { data: mData, error: mError } = await supabase
        .from('matches')
        .select(`
            id,
            team_a:teams!team_a_id(name),
            team_b:teams!team_b_id(name),
            ground:grounds(name)
        `)
        .eq('tournament_id', tournament.id);

    if (mError) console.error('Matches Fetch Error:', mError);
    else {
        console.log(`Retrieved ${mData.length} matches`);
        if (mData.length > 0) {
            console.log('Sample Match:', mData[0].team_a.name, 'vs', mData[0].team_b.name);
        }
    }

    console.log('\n--- TEST COMPLETE ---');
    console.log(`Go to: /tournament?id=${tournament.id}`);
}

runTest();
