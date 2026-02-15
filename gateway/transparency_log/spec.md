# Transparency Log Spec (Merkle Tree)

## 1. Concept
An append-only log of all `Receipts` and `Attestations` issued by the Gateway. Enables global auditing without relying on the Gateway's database.

## 2. Structure (RFC 6962 Style)
- **Leaves**: SHA-256 Hash of the Canonical JSON Receipt.
- **Nodes**: SHA-256(NodeL + NodeR).
- **Root**: The top hash representing the state of the log at size N.

## 3. Proofs
### 3.1 Inclusion Proof
- **Claim**: "Receipt R is in the Log at size N".
- **Data**: Verification Path (sibling hashes) from Leaf to Root.

### 3.2 Consistency Proof
- **Claim**: "Log at size N is a prefix of Log at size M (where M > N)".
- **Data**: Hashes proving the old tree is contained within the new tree.
