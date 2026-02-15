import { MerkleLog } from './merkle_log';

async function runTest() {
    console.log('\n🌳 Testing Transparency Log (Phase 11.3)...\n');

    const log = new MerkleLog();

    // 1. Add Leaves (Receipts)
    console.log('Adding receipts to log...');
    log.addLeaf('receipt_1_data');
    log.addLeaf('receipt_2_data');
    log.addLeaf('receipt_3_data');
    log.addLeaf('receipt_4_data');

    // 2. Get Root
    const root = log.getRoot();
    console.log('Merkle Root:', root);

    if (!root || root.length !== 64) {
        throw new Error('Invalid Merkle Root');
    }

    console.log('\n✅ Transparency Log Operational.');
}

runTest().catch(console.error);
