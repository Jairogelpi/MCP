# Game Day: Region Failover Simulation

## Objective
Validate that the Gateway can survive the total loss of the US-EAST-1 region.

## Roles
- **Commander**: Jairo (Ops Lead)
- **Scribe**: Auto-Logger
- **Chaos Agent**: Script `simulate_game_day.ts`

## Steps
1.  **Baseline**: Verify healthy traffic to US-EAST-1.
2.  **Injection**: Chaos Agent kills DB and API in US-EAST-1.
3.  **Alerting**: Verify "Region Unreachable" alert triggers (< 1m).
4.  **Failover**:
    - Run `failover_routing.sh` (Simulated).
    - Promote EU-WEST-1 DB to accept US-EAST-1 writes.
5.  **Validation**:
    - Execute `test_payout` against EU-WEST-1 for a US-EAST-1 tenant.
    - Confirm success.
6.  **Recovery**: Restore US-EAST-1 and re-sync.

## Success Criteria
- [ ] RTO < 15 minutes.
- [ ] No split-brain (double writes).
