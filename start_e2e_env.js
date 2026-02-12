const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const GATEWAY_DIR = path.join(__dirname, 'gateway');
const TEST_DIR = __dirname;

function startProcess(name, command, args, cwd, logFile) {
    console.log(`[LAUNCH] Starting ${name}...`);
    const logStream = fs.createWriteStream(logFile);
    const proc = spawn(command, args, { cwd, shell: true });

    proc.stdout.pipe(logStream);
    proc.stderr.pipe(logStream);

    proc.on('close', (code) => {
        console.log(`[EXIT] ${name} exited with code ${code}`);
    });

    return proc;
}

// 1. Start Upstream A (Finance Core) - Port 3001
const upstreamA = startProcess(
    'Upstream A (Finance)',
    'node',
    ['tests/upstream/dummy_server.js'],
    TEST_DIR,
    'upstream_a.log'
);

// 2. Start Upstream B (Network Service) - Port 3002
// We need dummy_server.js to accept a PORT argument.
// Let's modify dummy_server.js first to respect PORT env var or arg.
// Assuming it does (or I will fix it next).
const upstreamB = startProcess(
    'Upstream B (Network)',
    'node',
    ['tests/upstream/dummy_server.js', '3002'],
    TEST_DIR,
    'upstream_b.log'
);

// 3. Start Gateway - Port 3000
// Gateway needs to be configured to talk to both.
// I will modify server.ts to read config or I'll just hardcode the 2 upstreams for this phase.
const gateway = startProcess(
    'Gateway',
    'node',
    ['dist/server.js'],
    GATEWAY_DIR,
    'gateway.log'
);

console.log('[INFO] E2E Environment Running. Press Ctrl+C to stop.');
console.log('[INFO] Logs: upstream_a.log, upstream_b.log, gateway.log');

// Handle exit
process.on('SIGINT', () => {
    console.log('\n[STOP] Stopping processes...');
    upstreamA.kill();
    upstreamB.kill();
    gateway.kill();
    process.exit();
});
