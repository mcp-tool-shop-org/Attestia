# L2 Observer Notes

## Finality Assumptions

### Optimism / Base (OP Stack)
- **Sequencer-confirmed**: ~2s, not final until posted to L1
- **L1-confirmed**: ~12 minutes (L1 finality)
- **Reorg depth**: Up to 12 blocks on L1 side; sequencer reorgs are rare but possible during fault challenge windows
- **Safe block tag**: Supported (`"safe"` = sequencer confirmed, `"finalized"` = L1 proven)

### Arbitrum
- **Sequencer-confirmed**: ~250ms, not final until posted to L1
- **L1-confirmed**: ~12 minutes (L1 finality)
- **Reorg depth**: Sequencer reorgs extremely rare; L1 reorgs affect Arbitrum finality
- **Safe block tag**: Supported (same semantics as OP Stack)

### Polygon (PoS)
- **Block time**: ~2s
- **Finality**: Checkpoint-based (~30 min to Ethereum)
- **Reorg depth**: Up to 64 blocks
- **Note**: Polygon is NOT an L2 settlement pair — it has independent consensus

## Gas Normalization

L2 gas has two components:
1. **L2 execution gas**: Standard EVM gas for executing on the L2
2. **L1 data gas**: Cost of posting transaction data to L1

### OP Stack (Optimism, Base)
Receipt fields: `l1Fee`, `l1GasPrice`, `l1FeeScalar`, `l1BlobBaseFee`
- Total cost = L2 gas cost + l1Fee
- l1Fee accounts for calldata/blob posting costs

### Arbitrum
Receipt fields: `gasUsedForL1`
- Total gas = l2GasUsed + gasUsedForL1
- gasUsedForL1 is denominated in L2 gas units but represents L1 posting costs

## Reorg Handling

### Detection
`ReorgDetector` maintains a rolling buffer of (blockNumber → blockHash) entries.
When a block number is seen with a different hash, a reorg is detected.

### Response
1. Emit `L2ReorgDetectedPayload` event
2. Clear the buffer
3. Fail closed: no partial events are emitted after reorg detection
4. Consumer must re-query from a safe block number

### Configuration
- Buffer depth defaults to 128 blocks
- Should be set to at least `reorgDepth` from the chain's `FinalityConfig`

## Cross-Chain Collision Prevention

Same txHash can theoretically exist on two different EVM chains.
`canonicalTxKey(chainId, txHash)` produces `"eip155:1:0xabc..."` format
that is globally unique across all chains.

## Settlement Reconciliation

When events appear on both an L2 and its settlement L1 with matching
(amount, symbol, addresses), the L1 event is flagged as a settlement
artifact and removed to prevent double-counting.

This is handled by `preventDoubleCounting()` in `@attestia/reconciler`.
