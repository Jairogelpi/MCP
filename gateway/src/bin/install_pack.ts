import * as fs from 'fs';
import * as path from 'path';

// Mock installer that "downloads" and installs a pack
async function installPack(packId: string) {
    console.log(`📦 Installing Pack: ${packId}...`);

    // Simulate Registry Lookup
    if (packId !== 'mcp-finance-pack') {
        throw new Error('Pack not found in registry');
    }

    console.log('🔍 Verifying Signature... OK');

    const targetDir = path.join(__dirname, '../../packs/installed', packId);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Simulate Asset Extraction
    const policyContent = `
name: Finance Guardrails
rules:
  - if: "cost > 100.00"
    then: "require_approval"
`;
    fs.writeFileSync(path.join(targetDir, 'policy.yaml'), policyContent);

    console.log(`✅ Pack ${packId} installed to ${targetDir}`);
    console.log('🔄 Reloading Policy Engine...');
}

const packId = process.argv[2];
if (!packId) {
    console.log('Usage: npx tsx install_pack.ts <pack-id>');
} else {
    installPack(packId).catch(console.error);
}
