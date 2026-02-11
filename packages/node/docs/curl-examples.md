# Attestia Node — curl Examples

Full lifecycle walkthrough: declare an intent, approve it, execute it,
reconcile, attest, and verify.

## Prerequisites

```bash
# Start the server (unsecured mode for examples)
node packages/node/dist/main.js
# Or via Docker:
docker compose up -d attestia-node
```

Base URL: `http://localhost:3000`

---

## 1. Health Check

```bash
curl -s http://localhost:3000/health | jq
```

```bash
curl -s http://localhost:3000/ready | jq
```

---

## 2. Declare an Intent

```bash
curl -s -X POST http://localhost:3000/api/v1/intents \
  -H "Content-Type: application/json" \
  -d '{
    "id": "intent-001",
    "kind": "transfer",
    "description": "Send 100 USDC from treasury to vendor",
    "params": {
      "fromAddress": "0xTreasury",
      "toAddress": "0xVendor",
      "amount": { "amount": "100000000", "currency": "USDC", "decimals": 6 }
    }
  }' | jq
```

---

## 3. List Intents

```bash
curl -s http://localhost:3000/api/v1/intents | jq
```

With pagination:

```bash
curl -s "http://localhost:3000/api/v1/intents?limit=5" | jq
```

---

## 4. Get a Single Intent

```bash
curl -s http://localhost:3000/api/v1/intents/intent-001 | jq
```

---

## 5. Approve the Intent

```bash
curl -s -X POST http://localhost:3000/api/v1/intents/intent-001/approve \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Budget available, vendor verified" }' | jq
```

---

## 6. Execute the Intent

```bash
curl -s -X POST http://localhost:3000/api/v1/intents/intent-001/execute \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": "evm:1",
    "txHash": "0xabc123def456"
  }' | jq
```

---

## 7. Verify the Intent

```bash
curl -s -X POST http://localhost:3000/api/v1/intents/intent-001/verify \
  -H "Content-Type: application/json" \
  -d '{ "matched": true }' | jq
```

---

## 8. Reconcile

```bash
curl -s -X POST http://localhost:3000/api/v1/reconcile \
  -H "Content-Type: application/json" \
  -d '{
    "intents": [{
      "id": "intent-001",
      "status": "executed",
      "kind": "transfer",
      "declaredAt": "2025-01-15T10:00:00Z",
      "chainId": "evm:1",
      "txHash": "0xabc123def456"
    }],
    "ledgerEntries": [{
      "id": "le-001",
      "accountId": "treasury",
      "type": "debit",
      "money": { "amount": "100000000", "currency": "USDC", "decimals": 6 },
      "timestamp": "2025-01-15T10:00:01Z",
      "intentId": "intent-001",
      "txHash": "0xabc123def456",
      "correlationId": "corr-001"
    }],
    "chainEvents": [{
      "chainId": "evm:1",
      "txHash": "0xabc123def456",
      "from": "0xTreasury",
      "to": "0xVendor",
      "amount": "100000000",
      "decimals": 6,
      "symbol": "USDC",
      "timestamp": "2025-01-15T10:00:02Z"
    }]
  }' | jq
```

---

## 9. Attest (Reconcile + Sign)

Same body as reconcile, but creates a signed attestation record:

```bash
curl -s -X POST http://localhost:3000/api/v1/attest \
  -H "Content-Type: application/json" \
  -d '{
    "intents": [{ "id": "intent-001", "status": "executed", "kind": "transfer", "declaredAt": "2025-01-15T10:00:00Z", "chainId": "evm:1", "txHash": "0xabc123def456" }],
    "ledgerEntries": [{ "id": "le-001", "accountId": "treasury", "type": "debit", "money": { "amount": "100000000", "currency": "USDC", "decimals": 6 }, "timestamp": "2025-01-15T10:00:01Z", "intentId": "intent-001", "txHash": "0xabc123def456", "correlationId": "corr-001" }],
    "chainEvents": [{ "chainId": "evm:1", "txHash": "0xabc123def456", "from": "0xTreasury", "to": "0xVendor", "amount": "100000000", "decimals": 6, "symbol": "USDC", "timestamp": "2025-01-15T10:00:02Z" }]
  }' | jq
```

---

## 10. List Attestations

```bash
curl -s http://localhost:3000/api/v1/attestations | jq
```

---

## 11. Idempotent Requests

Use the `Idempotency-Key` header to prevent duplicate processing:

```bash
curl -s -X POST http://localhost:3000/api/v1/intents \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{ "id": "idem-test", "kind": "swap", "description": "Idempotent", "params": {} }' | jq
```

Repeat the same request — the response is replayed from cache:

```bash
curl -s -X POST http://localhost:3000/api/v1/intents \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{ "id": "idem-test", "kind": "swap", "description": "Idempotent", "params": {} }' \
  -D - 2>&1 | grep X-Idempotent-Replay
# X-Idempotent-Replay: true
```

---

## 12. Metrics (Prometheus)

```bash
curl -s http://localhost:3000/metrics
```

---

## With Authentication

When `API_KEYS` is configured:

```bash
# API key auth
curl -s http://localhost:3000/api/v1/intents \
  -H "X-Api-Key: my-api-key" | jq

# JWT bearer auth
curl -s http://localhost:3000/api/v1/intents \
  -H "Authorization: Bearer <jwt-token>" | jq
```
