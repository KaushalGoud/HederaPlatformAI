# HASHFLOW 🌊💸

**A secure, conversational HBAR wallet for the Hedera network — powered by local AI and AWS KMS.**

> Focused on AWS KMS asymmetric key signing for maximum security.
> AI agent showcased locally using LM Studio AI model
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
- The private key **never exists outside AWS** — not in memory, not in env vars, not anywhere (after bootstrap)
- HASHFLOW never has access to the raw private key at any point during normal operations

### Bootstrap vs. Production State

#### Bootstrap Phase (One-time, temporary)
```
Initial Setup:
  1. Create Hedera account with a temporary ECDSA key
  2. Keep HEDERA_PRIVATE_KEY in .env temporarily
  3. Create AWS KMS asymmetric key
  4. Run link-kms-key.ts script:
     - Signs AccountUpdateTransaction with OLD private key
     - Authorizes KMS key as new signer on the account
  5. ✅ Account now trusts KMS public key for transactions
  6. 🗑️ DELETE HEDERA_PRIVATE_KEY from .env and repo
```

#### Production Phase (Permanent)
```
Normal Operations:
  - No HEDERA_PRIVATE_KEY anywhere
  - All transactions signed by AWS KMS
  - Private key never exposed, even to application code
```

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
- **AWS KMS Asymmetric Signing** — private key lives in AWS HSM forever, never exposed after setup
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

## 🏁 Getting Started

### Prerequisites

- Node.js 18+
- npm
- [LM Studio](https://lmstudio.ai) installed and running locally with `google/gemma-3-4b` loaded
- AWS account with KMS configured
- Hedera Testnet account from [portal.hedera.com](https://portal.hedera.com)
- **Temporary:** Your Hedera account's current private key (needed ONLY for bootstrap)

### Installation & Initial Setup

#### Step 1: Clone and Install
```bash
git clone <repository-url>
cd HederaPlatformAI
npm install
```

#### Step 2: Create Initial Hedera Account (if you don't have one)
```bash
# Create account with a temporary ECDSA private key
# You'll get: 0.0.xxxxxx (account ID) and a private key
```

#### Step 3: Set Up AWS KMS Key
```bash
# Create an asymmetric ECC key in AWS KMS
aws kms create-key \
  --key-spec ECC_SECG_P256K1 \
  --key-usage SIGN_VERIFY \
  --description "HASHFLOW Hedera signing key"

# Create an alias
aws kms create-alias \
  --alias-name alias/hashflow-signing-key \
  --target-key-id YOUR_KEY_ID

# Enable key rotation
aws kms enable-key-rotation --key-id YOUR_KEY_ID

# Attach IAM policy (see section below)
```

#### Step 4: Bootstrap — Link KMS Key to Your Hedera Account

Create `.env.local` with **temporary credentials**:
```env
# Hedera Account (existing)
HEDERA_ACCOUNT_ID=0.0.xxxxxxx

# ⚠️ TEMPORARY — Only needed for bootstrap setup, delete after Step 5
HEDERA_PRIVATE_KEY=302e020100300506032b6570042204203... 

# AWS KMS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_KMS_KEY_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Run the bootstrap script to authorize the KMS key on your account:
```bash
npx tsx scripts/link-kms-key.ts
```

What this script does:
1. Signs an `AccountUpdateTransaction` using your old private key
2. Authorizes the AWS KMS public key as a signer on your Hedera account
3. Both keys sign the transaction simultaneously (old + new)
4. ✅ Your account now recognizes KMS as an authorized signer

**Output:**
```
✅ KMS key authorized on account 0.0.xxxxxxx
Transaction ID: 0.0.xxxxx@xxxxx.xxxxx
HashScan: https://hashscan.io/testnet/transaction/...
```

#### Step 5: Delete the Private Key (Critical!)

⚠️ **This is the most important step:**

```bash
# Remove the line from .env.local
HEDERA_PRIVATE_KEY=...  # ❌ DELETE THIS LINE

# Git — ensure it's never committed
git rm --cached .env.local
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "Secure: remove private key from version control"

# Verify the private key is gone from your machine
grep -r "HEDERA_PRIVATE_KEY" .env* # Should return nothing
```

#### Step 6: Start the Application

```bash
npm run dev
```

Open `http://localhost:3000`

You're now running with **zero private keys in the application** — all signing happens in AWS KMS.

---

## 🔑 AWS KMS & IAM Setup

### Create the Asymmetric Key

```bash
aws kms create-key \
  --key-spec ECC_SECG_P256K1 \
  --key-usage SIGN_VERIFY \
  --description "HASHFLOW Hedera signing key" \
  --region us-east-1
```

Save the `KeyId` — you'll need it for `.env.local`.

### Create an Alias (Optional but Recommended)

```bash
aws kms create-alias \
  --alias-name alias/hashflow-signing-key \
  --target-key-id xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Attach IAM Policy (Least Privilege)

Create or update an IAM user's inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "KMSSignAndGetPublicKey",
      "Effect": "Allow",
      "Action": [
        "kms:Sign",
        "kms:GetPublicKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:ACCOUNT_ID:key/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  ]
}
```

### Enable CloudTrail (Audit Logging)

In the AWS Console:
1. Go to CloudTrail
2. Create or configure a trail
3. Enable logging to S3
4. All KMS `Sign` operations are now logged with timestamps and caller identity

---

## 🏆 Accomplishments We're Proud Of

- **Zero Key Exposure (After Bootstrap):** The private key exists only during one-time setup, then is permanently deleted. After bootstrap, no private keys in code, env vars, or memory
- **Official Hedera KMS Pattern:** Implements the exact signing architecture from the official Hedera AWS KMS documentation
- **Secure Bootstrap Process:** Uses a temporary key only for AccountUpdateTransaction, then removes it
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

## 챌 Challenges We Ran Into

- **Hedera Account Authorization:** AWS KMS keys must be authorized on the Hedera account using an existing key — requires temporary private key, then deletion after bootstrap
- **ASN1 DER Signature Parsing:** AWS KMS returns ECDSA signatures in ASN1 DER format but Hedera expects raw 64-byte r+s format. We built a parser using `asn1.js` to decode and reformat the signature correctly
- **Clock Skew on Hedera:** Hedera nodes reject transactions with timestamps too far from network time. We solved this by setting the transaction valid start to 30 seconds in the past using `TransactionId.withValidStart()`
- **Lazy KMS Client Initialization:** The KMS client must be initialized after environment variables are loaded — not at module import time — to ensure credentials are available
- **Local LLM Reliability:** Gemma 3 4B has weak tool-calling reliability so we replaced tool calling with direct intent detection using regex and keyword matching for wallet commands

---

## 🔒 Security Notes

| Phase | Security Model |
|-------|---|
| **Bootstrap** | Private key temporary in `.env.local`, signs AccountUpdateTransaction, then deleted |
| **Production** | Zero private keys anywhere — all signing in AWS KMS HSM |
| **Audit** | Every KMS `Sign` call logged to CloudTrail with timestamps and caller ID |
| **Access** | IAM least-privilege policy restricts `kms:Sign` to backend user only |
| **Rotation** | AWS KMS automatic annual key rotation with zero downtime |

**Critical Security Checklist:**
- ✅ `.env.local` is in `.gitignore`
- ✅ `HEDERA_PRIVATE_KEY` removed after bootstrap
- ✅ AWS CloudTrail enabled and logging KMS operations
- ✅ AWS IAM policy restricts `kms:Sign` to backend user only
- ✅ All transaction signing delegates to AWS KMS, never local

---

## 📋 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    HASHFLOW Application                      │
│  (Next.js + Hedera SDK + AWS SDK)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                ┌──────┴──────┐
                │             │
         ┌──────▼────┐  ┌─────▼─────────┐
         │ Hedera    │  │ AWS KMS       │
         │ Network   │  │ (HSM)         │
         │ Testnet   │  │               │
         │           │  │ Private Key:  │
         │ ✓ Submit  │  │ ECC_P256K1    │
         │   TX      │  │ ✓ Sign only   │
         └───────────┘  │ ✓ Never export│
                        └───────────────┘
                               │
                        ┌──────▼──────┐
                        │ CloudTrail  │
                        │ Audit Log   │
                        │ (S3)        │
                        └─────────────┘
```

---

## 🚀 Quick Reference

| Task | Command | Notes |
|------|---------|-------|
| Create KMS key | `aws kms create-key --key-spec ECC_SECG_P256K1 --key-usage SIGN_VERIFY` | One-time |
| Bootstrap account | `npx tsx scripts/link-kms-key.ts` | Requires temp private key |
| Remove private key | Delete `HEDERA_PRIVATE_KEY` from `.env.local` | ⚠️ Critical! |
| Start app | `npm run dev` | Private key no longer needed |
| Check audit trail | AWS CloudTrail console | View all `Sign` operations |
| Rotate KMS key | `aws kms enable-key-rotation --key-id KEY_ID` | Automatic annually |

---
