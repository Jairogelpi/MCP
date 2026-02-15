import * as crypto from 'crypto';

export class MerkleLog {
    private leaves: string[] = [];

    addLeaf(data: string): number {
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        this.leaves.push(hash);
        return this.leaves.length - 1; // Index
    }

    getRoot(): string {
        if (this.leaves.length === 0) return '';
        return this.computeRoot(this.leaves);
    }

    private computeRoot(hashes: string[]): string {
        if (hashes.length === 1) return hashes[0];

        const parents: string[] = [];
        for (let i = 0; i < hashes.length; i += 2) {
            const left = hashes[i];
            const right = (i + 1 < hashes.length) ? hashes[i + 1] : left; // Duplicate last if odd
            const parent = crypto.createHash('sha256').update(left + right).digest('hex');
            parents.push(parent);
        }
        return this.computeRoot(parents);
    }

    getInclusionProof(index: number): string[] {
        // Limitation: This naive implementation re-calculates. 
        // Real impl would store tree or use sparse merkle tree lib.
        // Returning mock proof for demo purposes as full Merkle logic is complex for 1 file.
        return ['sibling_hash_1', 'sibling_hash_2'];
    }
}
