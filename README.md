# HASHFLOW 🌊💸

**A secure, conversational HBAR wallet for the Hedera network — powered by the Hedera Agent Kit, Gemini AI, and AWS KMS.**

> Private key never leaves AWS hardware. Real-time streaming AI. Enterprise-grade signing.

---

## 💡 Inspiration

Cryptocurrency transactions are intimidating for new users. Complex wallet addresses, gas fees, and confirmation steps create a steep learning curve. HASHFLOW fixes this by combining enterprise-grade AWS KMS key management with a conversational AI agent — making HBAR transactions as easy as sending a text message, without ever compromising security.

---

## 🚀 What It Does

HASHFLOW is a Next.js application with two ways to interact with the Hedera Testnet:

**1. Manual Transfer** — A clean form for traditional HBAR transfers with real-time validation and HashScan links.

**2. AI Agent** — A streaming conversational interface powered by Gemini 2.5 Flash via the Hedera Agent Kit:
- *"What's my HBAR balance?"*
- *"Send 5 HBAR to 0.0.12345"*
- *"Show my recent transactions"*
- *"What is Hedera Hashgraph?"*

The agent streams responses in real-time (SSE), executes on-chain actions, and always asks for confirmation before sending HBAR.

---

## 🤖 How the AI Agent Works

HASHFLOW uses the **Hedera Agent Kit** (`hedera-agent-kit`) with LangChain to build a tool-calling AI agent:

```
User message
     │
     ▼
Hedera Agent Kit (LangChain toolkit)
     │
     ├── coreQueriesPlugin   → balance, account info
     ├── transfer_hbar tool  → sends HBAR via KMS-signed tx
     │
     ▼
Gemini 2.5 Flash 
     │
     ▼
SSE stream → real-time UI update
```

- The agent decides which tools to call based on the user's message
- Tool results feed back into the LLM for a natural final response
- All Hedera transactions are signed via AWS KMS — never a raw private key

---

## 🔐 AWS KMS Security Architecture

### Key Generation & Storage
- An **asymmetric ECC_SECG_P256K1 key** lives exclusively in AWS KMS (HSM)
- The private key **never exists outside AWS** — not in memory, not in env vars, ever
- All signing uses `kmsSign` callback with `setOperatorWith` from the Hedera SDK

### Signing Flow
```
Hedera SDK needs signature
     │
     ▼
kmsSign(bytesToSign)
     │
     ├── keccak256(bytesToSign) → 32-byte digest
     ├── AWS KMS Sign API (ECDSA_SHA_256, MessageType=DIGEST)
     ├── Returns 64-byte r+s signature (ASN1 DER decoded)
     │
     ▼
Transaction submitted to Hedera Testnet
CloudTrail logs every Sign event ✅
```

### Bootstrap vs Production

**Bootstrap (one-time):**
1. Create Hedera account with temporary ECDSA key
2. Create AWS KMS `ECC_SECG_P256K1` key
3. Run `npx tsx scripts/link-kms-key.ts` — links KMS key to Hedera account
4. Delete `HEDERA_PRIVATE_KEY` from `.env.local` permanently

**Production (permanent):**
- Zero private keys in the app
- All signing delegated to AWS KMS
- IAM least-privilege policy — only backend can call `kms:Sign`
- Annual automatic key rotation enabled

---

## ✨ Features

- 🤖 **Hedera Agent Kit** — official Hedera AI toolkit with `coreQueriesPlugin`
- 💬 **Streaming AI** — real-time SSE word-by-word response like ChatGPT
- 🔐 **AWS KMS Signing** — HSM-protected private key, never exposed
- 💰 **Live Balance** — fetched directly from Hedera Testnet
- 📋 **Transaction History** — from Hedera Mirror Node with HashScan links
- ✅ **Human-in-the-loop** — confirms before every HBAR transfer
- 🪵 **CloudTrail Audit** — every KMS Sign call logged automatically
- 🔄 **LLM** — Gemini 2.5 Flash 
---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Blockchain | `@hashgraph/sdk`, Hedera Agent Kit |
| AI Agent | `hedera-agent-kit` + LangChain |
| LLM | Google Gemini 2.5 Flash (`@langchain/google-genai`) |
| Key Management | AWS KMS — `ECC_SECG_P256K1`, ECDSA signing |
| Streaming | Server-Sent Events (SSE) |
| Audit Trail | AWS CloudTrail |
| Transaction Data | Hedera Mirror Node REST API |
| Crypto | `elliptic`, `asn1.js`, `keccak256` |

---

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- AWS account with KMS configured
- Google AI Studio API key (for Gemini) — [aistudio.google.com](https://aistudio.google.com)
- Groq API key (optional fallback) — [console.groq.com](https://console.groq.com) (If not using gemini)
- Hedera Testnet account — [portal.hedera.com](https://portal.hedera.com)

### Installation

```bash
git clone <repository-url>
cd HederaPlatformAI
npm install
```

### Environment Setup

Create `.env.local`:

```env
# Hedera
HEDERA_ACCOUNT_ID=0.0.xxxxxxx

# AWS KMS (no private key needed after bootstrap)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_KMS_KEY_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# AI
GEMINI_API_KEY=...


# App URL (change for production)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Bootstrap — Link KMS Key to Hedera Account

```bash
# Add temporarily to .env.local:
# HEDERA_PRIVATE_KEY=302e...

npx tsx scripts/link-kms-key.ts

# After success — DELETE HEDERA_PRIVATE_KEY from .env.local!
```

### Run

```bash
npm run dev
# Open http://localhost:3000
```

---

## 🔑 AWS KMS Setup

```bash
# Create asymmetric key
aws kms create-key \
  --key-spec ECC_SECG_P256K1 \
  --key-usage SIGN_VERIFY \
  --description "HASHFLOW Hedera signing key"

# Create alias
aws kms create-alias \
  --alias-name alias/hashflow-signing-key \
  --target-key-id YOUR_KEY_ID

# Enable annual rotation
aws kms enable-key-rotation --key-id YOUR_KEY_ID
```

**IAM Policy (least privilege):**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["kms:Sign", "kms:GetPublicKey"],
    "Resource": "arn:aws:kms:REGION:ACCOUNT_ID:key/KEY_ID"
  }]
}
```

---

## 🏆 What We're Proud Of

- **Hedera Agent Kit integration** — official toolkit powering real on-chain queries and transfers
- **Zero key exposure** — private key deleted after bootstrap, KMS does all signing forever
- **Production streaming** — SSE pipeline streams AI responses word-by-word with live cursor
- **Dual LLM architecture** — Gemini primary with Groq fallback for resilience
- **Human-in-the-loop** — agent always confirms before executing transfers

---

## 🔮 What's Next

- **HTS Token Support** — manage Hedera Token Service tokens via chat
- **HashPack Integration** — connect existing wallets
- **Scheduled Transfers** — *"Send 10 HBAR every Friday"*
- **Multi-account Support** — manage multiple Hedera accounts
- **x402 Payment Protocol** — pay-gated AI services on Hedera

---

## 챌 Challenges We Ran Into

- **ASN1 DER Parsing** — AWS KMS returns ECDSA signatures in ASN1 DER format; Hedera needs raw 64-byte r+s. Built a custom parser with `asn1.js`
- **secp256k1 Hashing** — `ECC_SECG_P256K1` requires keccak256 digest (not SHA-256) before KMS signing
- **Clock Skew** — Hedera rejects transactions with timestamps too far from network time; solved with `TransactionId.withValidStart()` set 30s in the past
- **Hedera Agent Kit Tool Schemas** — Gemini requires simplified Zod schemas; removed `.positive()` and `.min()` constraints that caused tool call failures
- **SSE Streaming** — coordinating LangChain's synchronous tool loop with an async SSE writer required careful async/await management

---

## 🔒 Security Summary

| Phase | Model |
|---|---|
| Bootstrap | Temp private key signs `AccountUpdateTransaction`, then deleted |
| Production | Zero private keys — all signing in AWS KMS HSM |
| Audit | Every `kms:Sign` logged to CloudTrail with timestamp + caller |
| Access | IAM least-privilege — only backend IAM user can sign |
| Rotation | AWS KMS annual automatic key rotation |

---

## 📋 Architecture

```
┌──────────────────────────────────────────────┐
│              HASHFLOW (Next.js)               │
│                                              │
│  ChatInterface → SSE stream → useChat hook  │
│         │                                    │
│   /api/ai (Hedera Agent Kit + Gemini)        │
│         │                                    │
│   ┌─────┴──────┐    ┌────────────────┐       │
│   │ Hedera     │    │  AWS KMS (HSM) │       │
│   │ Testnet    │    │  ECC_P256K1    │       │
│   │ ✓ Submit   │    │  ✓ Sign only   │       │
│   │   TX       │    │  ✓ No export   │       │
│   └────────────┘    └───────┬────────┘       │
└─────────────────────────────┼────────────────┘
                              │
                     ┌────────▼────────┐
                     │  CloudTrail     │
                     │  Audit Log (S3) │
                     └─────────────────┘
```
