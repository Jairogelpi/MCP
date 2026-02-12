import { spawn } from 'child_process';

const SERVER_Port = 3000;
const API_URL = `http://localhost:${SERVER_Port}/mcp`;

async function runTest() {
    console.log('Starting server...');
    const server = spawn('npm', ['run', 'start'], {
        cwd: process.cwd(),
        shell: true,
        stdio: 'pipe' // Capture output
    });

    server.stdout?.on('data', (data) => console.log(`[SERVER]: ${data}`));
    server.stderr?.on('data', (data) => console.error(`[SERVER ERR]: ${data}`));

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Sending request...');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_balance',
                parameters: { accountId: '123' }
            })
        });

        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (response.ok && data.status === 'success') {
            console.log('✅ TEST PASSED: Pipeline executed successfully.');
        } else {
            console.error('❌ TEST FAILED: unexpected response', data);
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ TEST FAILED: Request error', error);
        process.exit(1);
    } finally {
        server.kill();
        process.exit(0);
    }
}

runTest();
