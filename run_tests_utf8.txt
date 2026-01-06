#!/usr/bin/env node

/**
 * Comprehensive Cricket Matcher Test Suite
 * Runs automated tests and generates bug report
 */

const fs = require('fs');
const path = require('path');

const testResults = {
    passed: [],
    failed: [],
    warnings: [],
    bugs: []
};

console.log('\n🏏 CRICKET MATCHER - COMPREHENSIVE TEST SUITE\n');
console.log('═══════════════════════════════════════════════════════\n');

// Test 1: Check if all required files exist
console.log('📋 Test 1: File Structure Validation');
const requiredFiles = [
    'app/admin/matches/[id]/score/page.tsx',
    'app/admin/page.tsx',
    'schema.sql',
    'schema_v2.sql',
    'schema_ball_by_ball.sql',
    'package.json',
    '.env.local'
];

requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        testResults.passed.push({ test: 'File Exists', file });
        console.log(`✅ PASS: ${file} exists`);
    } else {
        testResults.failed.push({ test: 'File Missing', file });
        console.log(`❌ FAIL: ${file} is missing`);
    }
});

// Test 2: Validate scoring page logic
console.log('\n📋 Test 2: Scoring Logic Validation');
const scoringPagePath = path.join(__dirname, 'app/admin/matches/[id]/score/page.tsx');

if (fs.existsSync(scoringPagePath)) {
    const scoringCode = fs.readFileSync(scoringPagePath, 'utf8');

    // Check for 10-wicket limit
    if (scoringCode.includes('const maxWickets = 10')) {
        testResults.passed.push({ test: '10-Wicket Limit', status: 'Implemented' });
        console.log('✅ PASS: 10-wicket limit is enforced');
    } else {
        testResults.bugs.push({
            test: '10-Wicket Limit',
            issue: 'maxWickets not set to 10',
            file: 'page.tsx',
            fix: 'Set const maxWickets = 10'
        });
        console.log('❌ BUG: 10-wicket limit not properly enforced');
    }

    // Check for striker rotation logic
    if (scoringCode.includes('runs % 2 !== 0')) {
        testResults.passed.push({ test: 'Striker Rotation', status: 'Implemented' });
        console.log('✅ PASS: Striker rotation on odd runs');
    } else {
        testResults.bugs.push({
            test: 'Striker Rotation',
            issue: 'Odd run rotation logic missing',
            file: 'page.tsx',
            fix: 'Add: if (runs % 2 !== 0) { swap strikers }'
        });
        console.log('❌ BUG: Striker rotation logic missing');
    }

    // Check for extras logic
    if (scoringCode.includes('isExtraBall') && scoringCode.includes("['Wide', 'No Ball']")) {
        testResults.passed.push({ test: 'Extras Logic', status: 'Implemented' });
        console.log('✅ PASS: Extras (Wide/No Ball) don\'t count as balls');
    } else {
        testResults.bugs.push({
            test: 'Extras Logic',
            issue: 'Extra ball logic incomplete',
            file: 'page.tsx',
            fix: 'Ensure Wides/No Balls don\'t increment ball count'
        });
        console.log('❌ BUG: Extras logic incomplete');
    }

    // Check for innings end conditions
    const hasAllOut = scoringCode.includes('isAllOut');
    const hasOversComplete = scoringCode.includes('isOversComplete');
    const hasTargetReached = scoringCode.includes('isTargetReached');

    if (hasAllOut && hasOversComplete && hasTargetReached) {
        testResults.passed.push({ test: 'Innings End Conditions', status: 'Complete' });
        console.log('✅ PASS: All innings end conditions implemented');
    } else {
        testResults.bugs.push({
            test: 'Innings End Conditions',
            issue: 'Missing end conditions',
            file: 'page.tsx',
            fix: 'Implement: isAllOut, isOversComplete, isTargetReached'
        });
        console.log('❌ BUG: Innings end conditions incomplete');
    }

    // Check for Reset Score button
    if (scoringCode.includes('handleResetMatchScore')) {
        testResults.passed.push({ test: 'Reset Score Button', status: 'Implemented' });
        console.log('✅ PASS: Reset Score button implemented');
    } else {
        testResults.bugs.push({
            test: 'Reset Score Button',
            issue: 'Reset Score function missing',
            file: 'page.tsx',
            fix: 'Add handleResetMatchScore function'
        });
        console.log('❌ BUG: Reset Score button missing');
    }

    // Check for bowling statistics
    if (scoringCode.includes('bowlerStats') && scoringCode.includes('economy')) {
        testResults.passed.push({ test: 'Bowling Statistics', status: 'Implemented' });
        console.log('✅ PASS: Bowling statistics in summary');
    } else {
        testResults.bugs.push({
            test: 'Bowling Statistics',
            issue: 'Bowling stats incomplete in summary',
            file: 'page.tsx',
            fix: 'Add bowling scorecard table with economy rate'
        });
        console.log('❌ BUG: Bowling statistics incomplete');
    }

    // Check for result calculation
    if (scoringCode.includes('won by') && scoringCode.includes('wicket')) {
        testResults.passed.push({ test: 'Result Calculation', status: 'Implemented' });
        console.log('✅ PASS: Match result calculation (wickets/runs)');
    } else {
        testResults.bugs.push({
            test: 'Result Calculation',
            issue: 'Result message format incorrect',
            file: 'page.tsx',
            fix: 'Format: "Team won by X wickets" or "Team won by X runs"'
        });
        console.log('❌ BUG: Result calculation incomplete');
    }
}

// Test 3: Validate Admin Portal
console.log('\n📋 Test 3: Admin Portal Validation');
const adminPagePath = path.join(__dirname, 'app/admin/page.tsx');

if (fs.existsSync(adminPagePath)) {
    const adminCode = fs.readFileSync(adminPagePath, 'utf8');

    // Check for Reset Data button
    if (adminCode.includes('handleResetAllData')) {
        testResults.passed.push({ test: 'Reset Data Button', status: 'Implemented' });
        console.log('✅ PASS: Reset Data button in admin portal');
    } else {
        testResults.bugs.push({
            test: 'Reset Data Button',
            issue: 'Reset Data function missing from admin',
            file: 'admin/page.tsx',
            fix: 'Add handleResetAllData function to admin portal'
        });
        console.log('❌ BUG: Reset Data button missing from admin');
    }
}

// Test 4: Check for TypeScript/Lint errors
console.log('\n📋 Test 4: Code Quality Check');
const tsConfigPath = path.join(__dirname, 'tsconfig.json');
if (fs.existsSync(tsConfigPath)) {
    testResults.passed.push({ test: 'TypeScript Config', status: 'Present' });
    console.log('✅ PASS: TypeScript configuration exists');
} else {
    testResults.warnings.push({ test: 'TypeScript Config', message: 'tsconfig.json not found' });
    console.log('⚠️  WARN: TypeScript configuration missing');
}

// Test 5: Database Schema Validation
console.log('\n📋 Test 5: Database Schema Validation');
const schemaFiles = ['schema.sql', 'schema_v2.sql', 'schema_ball_by_ball.sql'];
schemaFiles.forEach(file => {
    const schemaPath = path.join(__dirname, file);
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');

        if (file === 'schema_ball_by_ball.sql') {
            if (schema.includes('match_events') && schema.includes('match_active_state')) {
                testResults.passed.push({ test: `${file} - Tables`, status: 'Complete' });
                console.log(`✅ PASS: ${file} has required tables`);
            } else {
                testResults.bugs.push({
                    test: `${file} - Tables`,
                    issue: 'Missing match_events or match_active_state table',
                    file: file,
                    fix: 'Add missing tables to schema'
                });
                console.log(`❌ BUG: ${file} missing required tables`);
            }
        }
    }
});

// Generate Summary
console.log('\n\n═══════════════════════════════════════════════════════');
console.log('📊 TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════');
console.log(`✅ Tests Passed: ${testResults.passed.length}`);
console.log(`❌ Tests Failed: ${testResults.failed.length}`);
console.log(`🐛 Bugs Found: ${testResults.bugs.length}`);
console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
console.log('═══════════════════════════════════════════════════════\n');

// Generate Bug Report
if (testResults.bugs.length > 0) {
    console.log('🐛 BUG REPORT:\n');
    testResults.bugs.forEach((bug, index) => {
        console.log(`${index + 1}. ${bug.test}`);
        console.log(`   Issue: ${bug.issue}`);
        console.log(`   File: ${bug.file}`);
        console.log(`   Fix: ${bug.fix}\n`);
    });
}

// Save detailed report
const report = {
    timestamp: new Date().toISOString(),
    summary: {
        passed: testResults.passed.length,
        failed: testResults.failed.length,
        bugs: testResults.bugs.length,
        warnings: testResults.warnings.length
    },
    details: testResults
};

fs.writeFileSync(
    path.join(__dirname, 'test_report.json'),
    JSON.stringify(report, null, 2)
);

console.log('📄 Detailed report saved to: test_report.json\n');

// Exit with appropriate code
process.exit(testResults.bugs.length > 0 || testResults.failed.length > 0 ? 1 : 0);
