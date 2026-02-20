"use client";

import { useState } from "react";

export default function TransactionForm() {
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const sendTransaction = async () => {
    if (!recipientId || !amount) {
      setStatus("⚠️ Please fill all fields");
      return;
    }

    setLoading(true);
    setStatus("⏳ Processing transaction...");

    try {
      const res = await fetch("/api/transfer-hbar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId,
          amount: Number(amount),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(`✅ Success! TX: ${data.transactionId}`);
        setRecipientId("");
        setAmount("");
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setStatus("❌ Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-2xl">

      <h2 className="text-2xl font-bold text-center text-white">
        🚀 Send HBAR
      </h2>

      {/* Recipient */}
      <div className="space-y-1">
        <label className="text-sm text-zinc-400">Recipient Account ID</label>
        <input
          placeholder="0.0.xxxxx"
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 p-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Amount */}
      <div className="space-y-1">
        <label className="text-sm text-zinc-400">Amount (HBAR)</label>
        <input
          placeholder="10"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 p-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Button */}
      <button
        onClick={sendTransaction}
        disabled={loading}
        className={`w-full py-3 rounded-xl font-semibold transition-all duration-300
          ${
            loading
              ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/50"
          }`}
      >
        {loading ? "Processing..." : "Send Transaction"}
      </button>

      {/* Status */}
      {status && (
        <div className="text-center text-sm text-zinc-300 bg-zinc-800/60 p-3 rounded-lg border border-zinc-700">
          {status}
        </div>
      )}
    </div>
  );
}
