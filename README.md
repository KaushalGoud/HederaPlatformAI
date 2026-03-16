# HBAR AI Wallet 🤖💸

**Manage and transfer HBAR on the Hedera network using the power of conversational AI.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 💡 Inspiration

Cryptocurrency transactions can be intimidating for new users. Complex wallet addresses, gas fees, and multiple steps create a steep learning curve. We wanted to simplify this process and make crypto as easy as sending a text message. Our inspiration was to build a wallet that leverages the power of Large Language Models (LLMs) to create a truly user-friendly experience for the Hedera ecosystem.

## 🚀 What it does

HBAR AI Wallet is a Next.js application that provides two ways to interact with the Hedera network:

1.  **Manual Transfer:** A clean, modern, and intuitive form for traditional HBAR transfers. It includes real-time validation and clear feedback on transaction status.

2.  **AI Agent:** A conversational interface where you can instruct the AI to perform transactions for you. Simply type commands in plain English, like:
    *   *"Send 50 HBAR to 0.0.12345"*
    *   *"Transfer 12.5 HBAR to my friend's account 0.0.98765"*

The AI parses your request, asks for confirmation, and executes the transaction on the Hedera network, providing a seamless and natural user experience.

## ✨ Key Features

*   **Dual-Mode Interface:** Switch between a traditional form and an AI-powered chat.
*   **Natural Language Processing:** Uses LangChain and OpenAI/Hugging Face to understand and execute transaction commands.
*   **Secure Backend:** Leverages AWS KMS for secure management of private keys, ensuring they are never exposed on the client-side.
*   **Real-time Feedback:** Get instant updates on your transaction's progress, from submission to confirmation.
*   **Modern Tech Stack:** Built with Next.js, React, and Tailwind CSS for a fast, responsive, and beautiful user interface.
*   **Error Handling:** Robust error handling to guide the user in case of failed transactions or invalid commands.

## 🛠️ How We Built It (Tech Stack)

We chose a modern, robust, and scalable tech stack to bring HBAR AI Wallet to life:

*   **Frontend:** Next.js, React, TypeScript, Tailwind CSS, Shadcn/UI
*   **Backend & API:** Next.js API Routes
*   **Blockchain Integration:** Hedera SDK (`@hashgraph/sdk`)
*   **Artificial Intelligence:** LangChain, OpenAI / Hugging Face Inference
*   **Security:** AWS KMS for private key management
*   **Form Handling:** React Hook Form & Zod for validation

## 챌 Challenges We Ran Into

*   **Natural Language to Transaction:** The biggest challenge was reliably parsing unstructured natural language into a structured transaction object (recipient ID and amount). We solved this by using LangChain's function-calling capabilities to extract the necessary parameters from the user's input.
*   **Secure Key Management:** Handling private keys is a critical security concern. We architected the application to use AWS KMS, ensuring that the signing key never leaves the secure environment of our backend. The backend requests signatures from KMS, which adds a layer of security.
*   **Asynchronous UX:** Blockchain transactions aren't instant. We built a real-time feedback system in the UI to keep the user informed about the transaction status (pending, success, or failure) without needing to refresh the page.

## 🏆 Accomplishments We're Proud Of

*   **A Truly Conversational Wallet:** We successfully created an AI agent that can handle real-world financial transactions on a public blockchain, which we believe is a significant step forward in user-friendly crypto applications.
*   **Security-First Design:** Integrating AWS KMS demonstrates a commitment to security and best practices, which is paramount in the web3 space.
*   **Polished User Experience:** We're proud of the clean, intuitive, and responsive UI that makes a complex process feel simple and elegant.

## 🔮 What's Next for HBAR AI Wallet

We're just getting started! Here are some features we're excited to build next:

*   **Transaction History & Queries:** Allow users to ask questions like, *"What was my last transaction?"* or *"How much did I send to 0.0.12345 last week?"*
*   **Support for Other Hedera Services:** Integrate support for the Hedera Token Service (HTS) and Hedera Consensus Service (HCS).
*   **Wallet Integration:** Add support for connecting existing wallets like HashPack and Blade.
*   **Scheduled & Recurring Transactions:** Enable commands like, *"Send 10 HBAR to my savings account every Friday."*

## 🏁 Getting Started

### Prerequisites

*   Node.js 18+
*   pnpm (or npm/yarn)
*   An AWS account with KMS set up
*   An OpenAI or Hugging Face API key
*   A Hedera testnet account

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd hedera-hbar-transaction-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root of the project and add the following variables:

    ```env
    # Hedera Credentials
    HEDERA_ACCOUNT_ID=...
    HEDERA_PRIVATE_KEY=... # Your account's private key (for local signing if not using KMS)

    # AWS KMS Credentials (Recommended)
    AWS_ACCESS_KEY_ID=...
    AWS_SECRET_ACCESS_KEY=...
    AWS_REGION=...
    AWS_KMS_KEY_ID=... # The ID of the KMS key used for signing

  

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Open your browser** and navigate to `http://localhost:3000`.

---

