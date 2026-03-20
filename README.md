# HASHFLOW 🌊💸

**A secure, conversational HBAR wallet for the Hedera network — powered by local AI and AWS KMS.**

> Focused on AWS KMS asymmetric key signing for maximum security.
> AI agent won't work its only show cased locally using LM Studio AI model

---

## 💡 Inspiration

Cryptocurrency transactions can be intimidating for new users. Complex wallet addresses, gas fees, and multiple confirmation steps create a steep learning curve. We wanted to simplify this by building a wallet that combines enterprise-grade key management with conversational AI — making crypto as easy as sending a text message, without ever compromising on security.

---

## 🚀 What It Does

HASHFLOW is a Next.js application that provides two ways to interact with the Hedera Testnet:

1. **Manual Transfer:** A clean, intuitive form for traditional HBAR transfers with real-time validation and transaction feedback.

2. **AI Agent:** A conversational interface powered by a locally running LLM (via LM Studio) where you can instruct the AI in plain English:
   - *"Send 50 HBAR to 0.0.12345"*
   - *"What's my balance?"*
   - *"Show my recent transactions"*
   - *"Is account 0.0.98765 safe?"*

   HASHFLOW parses your intent and executes the transaction securely on the Hedera network.

---

## 🔐 Secure Key Management Architecture (AWS KMS)

HASHFLOW was built for the **Secure Key Management for Onchain Applications** bounty. Here's how we meet every requirement:

### Key Generation & Storage
- An **asymmetric ECC_SECG_P256K1 key** is generated and stored exclusively inside AWS KMS
- The private key **never exists outside AWS** — not in memory, not in env vars, not anywhere
- HASHFLOW never has access to the raw private key at any point — ever

### Transaction Signing Without Key Exposure
- When a transaction is ready to be signed, the backend calls the **AWS KMS Sign API** directly
- KMS performs the ECDSA signing operation internally using the HSM-protected key
- Only the **64-byte signature** is returned — the private key never leaves AWS hardware
- Even if the application server is fully compromised, the private key cannot be extracted

### How It Works
```
User Request
     │
     ▼
Next.js API Route (/api/transfer-hbar)
     │
     ├── Validates recipient & amount
     │
     ├── getKmsPublicKey() → AWS KMS GetPublicKey API
     │        └── Returns public key only — no private key involved
     │
     ├── setOperatorWith(accountId, publicKey, kmsSign)
     │        └── Hedera SDK calls kmsSign() for every transaction
     │
     ├── kmsSign() → AWS KMS Sign API (ECDSA_SHA_256)
     │        └── KMS signs internally → returns signature only
     │        └── CloudTrail logs this Sign event automatically
     │
     ├── Hedera SDK submits signed transaction to Testnet
     │
     └── Returns TX ID + HashScan URL to client
```

### Access Controls
- AWS IAM policies restrict which identities can call `kms:Sign` and `kms:GetPublicKey`
- The KMS Key Policy enforces **least privilege** — only the HASHFLOW backend IAM user has signing permissions

### Audit Logging
- Every `Sign` operation is automatically logged to **AWS CloudTrail**
- This provides a complete, tamper-proof audit trail of every transaction signing event including timestamps, caller identity, and key ID

### Key Rotation
- AWS KMS automatic key rotation is enabled — backing key material rotates annually with zero downtime

---

## ✨ Key Features

- **Conversational AI Agent** — natural language transaction commands powered by a local LLM
- **AWS KMS Asymmetric Signing** — private key lives in AWS HSM forever, never exposed anywhere
- **Real-time Balance** — live HBAR balance fetched directly from Hedera Testnet
- **Transaction History** — recent transactions with HashScan links, pulled from the Hedera Mirror Node
- **Address Safety Check** — validates recipient accounts before sending
- **HashScan Links** — every confirmed transaction links directly to the Hedera Testnet explorer
- **CloudTrail Audit Trail** — every KMS Sign call logged automatically

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Blockchain | Hedera SDK (`@hashgraph/sdk`) |
| AI (Local) | LM Studio — `google/gemma-3-4b` running locally |
| Key Management | AWS KMS — `ECC_SECG_P256K1` asymmetric key, ECDSA signing |
| Audit Trail | AWS CloudTrail |
| Transaction Data | Hedera Mirror Node REST API |
| Validation | Zod |
| Crypto | `elliptic`, `asn1.js`, `keccak256` — ASN1 DER signature parsing |

---

## 🤖 How the AI Works (LM Studio)

Instead of sending data to a third-party AI API, HASHFLOW runs the LLM **entirely on your local machine** using [LM Studio](https://lmstudio.ai):

- LM Studio exposes a local OpenAI-compatible API at `http://127.0.0.1:1234/v1`
- The model used is `google/gemma-3-4b`
- The backend calls this local endpoint — **no data leaves your machine**
- Intent detection parses commands like "send 10 HBAR to 0.0.12345" directly
- For general questions, Gemma answers naturally without tool calls

---

## 챌 Challenges We Ran Into

- **ASN1 DER Signature Parsing:** AWS KMS returns ECDSA signatures in ASN1 DER format but Hedera expects raw 64-byte r+s format. We built a parser using `asn1.js` to decode and reformat the signature correctly.
- **Clock Skew on Hedera:** Hedera nodes reject transactions with timestamps too far from network time. We solved this by setting the transaction valid start to 30 seconds in the past using `TransactionId.withValidStart()`.
- **KMS Key Linking:** The Hedera account must be updated to recognize the KMS public key as its authorized signer. We built a one-time `AccountUpdateTransaction` script signed by both the old key and the new KMS key simultaneously.
- **Lazy KMS Client Initialization:** The KMS client must be initialized after environment variables are loaded — not at module import time — to ensure credentials are available.
- **Local LLM Reliability:** Gemma 3 4B has weak tool-calling reliability so we replaced tool calling with direct intent detection using regex and keyword matching for wallet commands.

---

## 🏆 Accomplishments We're Proud Of

- **Zero Key Exposure:** The private key never exists outside AWS KMS hardware — not in env vars, not in memory, not anywhere
- **Official Hedera KMS Pattern:** Implements the exact signing architecture from the official Hedera AWS KMS documentation
- **Fully Local AI:** The entire AI pipeline runs on-device via LM Studio — no external API calls
- **Complete Audit Trail:** Every KMS Sign operation is logged in CloudTrail automatically
- **Production-Grade UX:** Address validation, error handling, HashScan links, and real-time balance

---

## 🔮 What's Next

- **HTS Support:** Manage Hedera Token Service tokens through natural language
- **HashPack / Blade Wallet Integration:** Connect existing wallets
- **Scheduled Transactions:** *"Send 10 HBAR every Friday"*
- **Multi-account Support:** Manage multiple Hedera accounts under one HASHFLOW interface
- **On-chain AI Queries:** *"How much did I send last week?"* answered from real transaction history

---

## 🏁 Getting Started

### Prerequisites

- Node.js 18+
- npm
- [LM Studio](https://lmstudio.ai) installed and running locally with `google/gemma-3-4b` loaded
- AWS account with KMS configured
- Hedera Testnet account from [portal.hedera.com](https://portal.hedera.com)

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd hashflow
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**

   Create a `.env.local` file:
```env
# Hedera
HEDERA_ACCOUNT_ID=0.0.xxxxxxx

# AWS KMS — asymmetric ECC_SECG_P256K1 key
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_KMS_KEY_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

> No `HEDERA_PRIVATE_KEY` needed — the private key lives in AWS KMS forever.

4. **Start LM Studio:**
   - Open LM Studio
   - Load the `google/gemma-3-4b` model
   - Start the local server on port `1234` from the Developer tab

5. **Run the development server:**
```bash
npm run dev
```

6. **Open** `http://localhost:3000`

---

## 🔑 AWS KMS Setup Guide

1. **Create an asymmetric ECC key:**
```bash
aws kms create-key \
  --key-spec ECC_SECG_P256K1 \
  --key-usage SIGN_VERIFY \
  --description "HASHFLOW Hedera signing key"
```

2. **Create an alias:**
```bash
aws kms create-alias \
  --alias-name alias/hashflow-signing-key \
  --target-key-id YOUR_KEY_ID
```

3. **Enable key rotation:**
```bash
aws kms enable-key-rotation --key-id YOUR_KEY_ID
```

4. **Attach IAM policy** restricting `kms:Sign` and `kms:GetPublicKey` to your backend only

5. **Link the KMS key to your Hedera account** — run the one-time setup script:
```bash
npx tsx scripts/link-kms-key.ts
```

6. **Enable CloudTrail** in your AWS account to capture all KMS Sign events

---

## 🔒 Security Notes

- Private key is **generated inside AWS KMS HSM and never exported** — not even to the application
- No `HEDERA_PRIVATE_KEY` in environment variables — nothing to steal
- All KMS `Sign` operations are logged automatically to CloudTrail
- Zod validation on all API routes prevents malformed input
- IAM least-privilege policy — only the backend user can call `kms:Sign`

---

