#!/usr/bin/env node
/**
 * Convenience script to run all tests from project root
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('='.repeat(80));
console.log('OOXML TEMPLATER - TEST SUITE');
console.log('='.repeat(80));
console.log();

const scripts = {
    'comprehensive': 'test-files/scripts/test-comprehensive.js',
    'debug': 'test-files/scripts/test-debug.js',
    'real-docs': 'test-files/scripts/test-real-documents.js',
    'create-templates': 'test-files/scripts/create-real-templates.js'
};

const scriptArg = process.argv[2];

if (!scriptArg || scriptArg === 'help' || scriptArg === '--help') {
    console.log('Usage: node run-tests.js [script-name]');
    console.log();
    console.log('Available test scripts:');
    console.log('  comprehensive    - Run comprehensive test suite');
    console.log('  debug            - Run debug test with level1.pptx');
    console.log('  real-docs        - Test with real Word/Excel/PowerPoint documents');
    console.log('  create-templates - Create test template documents');
    console.log();
    console.log('Examples:');
    console.log('  node run-tests.js comprehensive');
    console.log('  node run-tests.js real-docs');
    console.log();
    process.exit(0);
}

const scriptPath = scripts[scriptArg];

if (!scriptPath) {
    console.error('Error: Unknown script "' + scriptArg + '"');
    console.log('Run "node run-tests.js help" to see available scripts.');
    process.exit(1);
}

const fullPath = path.join(__dirname, scriptPath);
console.log('Running:', scriptPath);
console.log();

const child = spawn('node', [fullPath], {
    stdio: 'inherit',
    cwd: path.dirname(fullPath)
});

child.on('exit', (code) => {
    process.exit(code);
});

child.on('error', (err) => {
    console.error('Failed to start test:', err);
    process.exit(1);
});
