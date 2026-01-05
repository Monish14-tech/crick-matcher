/**
 * Live Browser Test for Cricket Matcher
 * Run this in browser console on localhost:3000
 * 
 * INSTRUCTIONS:
 * 1. Open http://localhost:3000/admin/matches/[id]/score
 * 2. Press F12 to open console
 * 3. Paste this entire script
 * 4. Type: runLiveTest()
 */

const liveTestResults = {
    passed: [],
    failed: [],
    suggestions: []
};

function log(emoji, type, message) {
    const color = type === 'pass' ? 'green' : type === 'fail' ? 'red' : 'orange';
    console.log(`%c${emoji} ${message}`, `color: ${color}; font-weight: bold`);
}

async function runLiveTest() {
    console.clear();
    console.log('%c🏏 CRICKET MATCHER - LIVE BROWSER TEST', 'font-size: 20px; font-weight: bold; color: #4CAF50');
    console.log('%c═══════════════════════════════════════════════════════', 'color: #999');
    console.log('\n');

    // Test 1: Check current page
    console.log('%c📋 Test 1: Page Detection', 'font-size: 14px; font-weight: bold');
    const currentUrl = window.location.href;
    const isAdminPage = currentUrl.includes('/admin');
    const isScoringPage = currentUrl.includes('/score');

    if (isScoringPage) {
        log('✅', 'pass', 'Scoring page detected');
        liveTestResults.passed.push('Page Detection');
    } else if (isAdminPage) {
        log('⚠️', 'warn', 'On admin page - navigate to a scoring page for full test');
        liveTestResults.suggestions.push({
            test: 'Page Navigation',
            suggestion: 'Go to /admin → Click "Score" on any match'
        });
    } else {
        log('❌', 'fail', 'Not on admin/scoring page');
        liveTestResults.failed.push('Page Detection');
        liveTestResults.suggestions.push({
            test: 'Page Navigation',
            suggestion: 'Navigate to: http://localhost:3000/admin'
        });
    }

    // Test 2: Check for React/Next.js
    console.log('\n%c📋 Test 2: Framework Detection', 'font-size: 14px; font-weight: bold');
    if (window.next || document.querySelector('[data-nextjs-scroll-focus-boundary]')) {
        log('✅', 'pass', 'Next.js detected');
        liveTestResults.passed.push('Next.js Framework');
    } else {
        log('❌', 'fail', 'Next.js not detected - app may not be running');
        liveTestResults.failed.push('Next.js Framework');
        liveTestResults.suggestions.push({
            test: 'Framework',
            suggestion: 'Ensure dev server is running: npm run dev'
        });
    }

    // Test 3: Check for scoring buttons
    console.log('\n%c📋 Test 3: Scoring Buttons', 'font-size: 14px; font-weight: bold');
    const buttons = Array.from(document.querySelectorAll('button'));
    const buttonTexts = buttons.map(b => b.textContent.trim());

    const expectedButtons = ['0', '1', '2', '3', '4', '6', 'WD', 'NB', 'WICKET'];
    const foundButtons = expectedButtons.filter(btn =>
        buttonTexts.some(text => text.includes(btn))
    );

    if (foundButtons.length === expectedButtons.length) {
        log('✅', 'pass', `All ${expectedButtons.length} scoring buttons found`);
        liveTestResults.passed.push('Scoring Buttons');
    } else {
        const missing = expectedButtons.filter(b => !foundButtons.includes(b));
        log('❌', 'fail', `Missing buttons: ${missing.join(', ')}`);
        liveTestResults.failed.push('Scoring Buttons');
        liveTestResults.suggestions.push({
            test: 'Scoring Buttons',
            suggestion: 'Start a match first: Select toss winner → Select players → Lock selection'
        });
    }

    // Test 4: Check for control buttons
    console.log('\n%c📋 Test 4: Control Buttons', 'font-size: 14px; font-weight: bold');
    const controlButtons = ['Undo', 'Reset Score', 'End Inn'];
    const foundControls = controlButtons.filter(btn =>
        buttonTexts.some(text => text.includes(btn))
    );

    if (foundControls.length === controlButtons.length) {
        log('✅', 'pass', 'All control buttons present');
        liveTestResults.passed.push('Control Buttons');
    } else {
        const missing = controlButtons.filter(b => !foundControls.includes(b));
        log('⚠️', 'warn', `Some controls missing: ${missing.join(', ')}`);
        liveTestResults.suggestions.push({
            test: 'Control Buttons',
            suggestion: 'May need to start match or check if buttons are conditionally rendered'
        });
    }

    // Test 5: Check for Live Node indicator
    console.log('\n%c📋 Test 5: Live Node Indicator', 'font-size: 14px; font-weight: bold');
    const liveNode = Array.from(document.querySelectorAll('div')).find(d =>
        d.textContent.includes('Live Node') || d.textContent.includes('Live')
    );

    if (liveNode) {
        log('✅', 'pass', 'Live Node indicator found');
        liveTestResults.passed.push('Live Node');
    } else {
        log('⚠️', 'warn', 'Live Node indicator not visible');
        liveTestResults.suggestions.push({
            test: 'Live Node',
            suggestion: 'Check if match is in "Live" status'
        });
    }

    // Test 6: Check for score display
    console.log('\n%c📋 Test 6: Score Display', 'font-size: 14px; font-weight: bold');
    const scoreElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent;
        return /\d+\/\d+/.test(text) || text.includes('Over');
    });

    if (scoreElements.length > 0) {
        log('✅', 'pass', 'Score display elements found');
        liveTestResults.passed.push('Score Display');
    } else {
        log('⚠️', 'warn', 'Score display not visible');
        liveTestResults.suggestions.push({
            test: 'Score Display',
            suggestion: 'Start scoring to see live score updates'
        });
    }

    // Test 7: Check for player selection
    console.log('\n%c📋 Test 7: Player Selection', 'font-size: 14px; font-weight: bold');
    const selects = document.querySelectorAll('select');

    if (selects.length >= 3) {
        log('✅', 'pass', `Found ${selects.length} player selection dropdowns`);
        liveTestResults.passed.push('Player Selection');
    } else if (selects.length > 0) {
        log('⚠️', 'warn', `Only ${selects.length} dropdowns found (expected 3)`);
        liveTestResults.suggestions.push({
            test: 'Player Selection',
            suggestion: 'Ensure Striker, Non-Striker, and Bowler selections are visible'
        });
    } else {
        log('⚠️', 'warn', 'No player selection dropdowns visible');
        liveTestResults.suggestions.push({
            test: 'Player Selection',
            suggestion: 'May have already locked selection - this is normal during active scoring'
        });
    }

    // Test 8: Check for timeline/events
    console.log('\n%c📋 Test 8: Live Timeline', 'font-size: 14px; font-weight: bold');
    const timeline = Array.from(document.querySelectorAll('*')).find(el =>
        el.textContent.includes('Timeline') || el.textContent.includes('Live Timeline')
    );

    if (timeline) {
        log('✅', 'pass', 'Live Timeline panel found');
        liveTestResults.passed.push('Live Timeline');
    } else {
        log('⚠️', 'warn', 'Live Timeline not visible');
        liveTestResults.suggestions.push({
            test: 'Live Timeline',
            suggestion: 'Check if timeline is on right side of screen or hidden on mobile'
        });
    }

    // Test 9: Console errors check
    console.log('\n%c📋 Test 9: Console Errors', 'font-size: 14px; font-weight: bold');
    // This is informational - user should check console manually
    log('ℹ️', 'info', 'Check console for any red error messages above');
    liveTestResults.suggestions.push({
        test: 'Console Errors',
        suggestion: 'Look for red error messages in console. Common issues: Supabase connection, missing env vars'
    });

    // Test 10: Network requests
    console.log('\n%c📋 Test 10: API Connectivity', 'font-size: 14px; font-weight: bold');
    log('ℹ️', 'info', 'Check Network tab for failed requests (F12 → Network)');
    liveTestResults.suggestions.push({
        test: 'API Connectivity',
        suggestion: 'If seeing 406/500 errors: Check Supabase connection in .env.local'
    });

    // Generate Summary
    console.log('\n\n%c═══════════════════════════════════════════════════════', 'color: #999');
    console.log('%c📊 TEST SUMMARY', 'font-size: 16px; font-weight: bold; color: #2196F3');
    console.log('%c═══════════════════════════════════════════════════════', 'color: #999');
    console.log(`%c✅ Passed: ${liveTestResults.passed.length}`, 'color: green; font-weight: bold');
    console.log(`%c❌ Failed: ${liveTestResults.failed.length}`, 'color: red; font-weight: bold');
    console.log(`%c💡 Suggestions: ${liveTestResults.suggestions.length}`, 'color: orange; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════════════', 'color: #999');

    // Print suggestions
    if (liveTestResults.suggestions.length > 0) {
        console.log('\n%c💡 SUGGESTIONS & FIXES:', 'font-size: 14px; font-weight: bold; color: orange');
        liveTestResults.suggestions.forEach((s, i) => {
            console.log(`\n${i + 1}. %c${s.test}`, 'font-weight: bold');
            console.log(`   → ${s.suggestion}`);
        });
    }

    // Print failures
    if (liveTestResults.failed.length > 0) {
        console.log('\n%c❌ FAILED TESTS:', 'font-size: 14px; font-weight: bold; color: red');
        liveTestResults.failed.forEach((f, i) => {
            console.log(`${i + 1}. ${f}`);
        });
    }

    // Final recommendation
    console.log('\n%c═══════════════════════════════════════════════════════', 'color: #999');
    if (liveTestResults.failed.length === 0) {
        console.log('%c✅ ALL CRITICAL TESTS PASSED!', 'font-size: 16px; font-weight: bold; color: green');
        console.log('%cYour app is working correctly. Check suggestions above for minor improvements.', 'color: #666');
    } else {
        console.log('%c⚠️ SOME TESTS FAILED', 'font-size: 16px; font-weight: bold; color: red');
        console.log('%cFollow the suggestions above to fix issues.', 'color: #666');
    }
    console.log('%c═══════════════════════════════════════════════════════\n', 'color: #999');

    return liveTestResults;
}

// Auto-load message
console.log('%c🏏 Cricket Matcher Live Test Loaded!', 'font-size: 16px; color: #4CAF50; font-weight: bold');
console.log('%cRun: runLiveTest()', 'font-size: 14px; color: #2196F3');
console.log('%c─────────────────────────────────────\n', 'color: #999');
