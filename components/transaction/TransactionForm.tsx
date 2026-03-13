"use client";

import { useState } from "react";

type StatusType = "idle" | "loading" | "success" | "error";

export default function TransactionForm() {
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<StatusType>("idle");
  const [loading, setLoading] = useState(false);

  const sendTransaction = async () => {
    if (!recipientId || !amount) {
      setStatus("⚠️ Please fill all fields");
      setStatusType("error");
      return;
    }

    setLoading(true);
    setStatusType("loading");
    setStatus("⏳ Processing transaction...");

    try {
      const res = await fetch("/api/transfer-hbar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, amount: Number(amount) }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(`✅ Success! TX: ${data.transactionId}`);
        setStatusType("success");
        setRecipientId("");
        setAmount("");
      } else {
        setStatus(`❌ Error: ${data.error}`);
        setStatusType("error");
      }
    } catch (err) {
      setStatus("❌ Network error");
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[480px] bg-[#0a0a0f] rounded-3xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[0.06]">

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06] bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent">
        <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/40 flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
          </svg>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 rounded-full border-2 border-[#0a0a0f] shadow-sm shadow-yellow-400/50" />
        </div>
        <div>
          <h2 className="text-white font-semibold text-sm tracking-tight">Send HBAR</h2>
          <p className="text-white/40 text-xs mt-0.5">Hedera Network · Instant transfer</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-yellow-400 text-xs font-medium">Testnet</span>
        </div>
      </div>

      {/* Form */}
      <div className="px-6 pt-6 space-y-4">

        {/* Recipient */}
        <div className="space-y-2">
          <label className="text-white/50 text-xs font-medium tracking-wide uppercase">
            Recipient Account ID
          </label>
          <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-violet-500/50 focus-within:bg-white/[0.06] transition-all duration-200">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/25 flex-shrink-0">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <input
              placeholder="0.0.xxxxx"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm placeholder-white/20 outline-none"
            />
            {recipientId && (
              <button onClick={() => setRecipientId("")} className="text-white/20 hover:text-white/50 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <label className="text-white/50 text-xs font-medium tracking-wide uppercase">
            Amount (HBAR)
          </label>
          <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-violet-500/50 focus-within:bg-white/[0.06] transition-all duration-200">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/25 flex-shrink-0">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
            <input
              placeholder="10"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm placeholder-white/20 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-violet-400 text-xs font-semibold bg-violet-500/10 border border-violet-500/20 rounded-lg px-2 py-1 flex-shrink-0">
              HBAR
            </span>
          </div>
        </div>

        {/* Fee row */}
       
      </div>

      {/* Button */}
      <div className="px-6 pt-4 pb-2">
        <button
          onClick={sendTransaction}
          disabled={loading}
          className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
            loading
              ? "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed"
              : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.01] active:scale-[0.99]"
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
              </svg>
              Send Transaction
            </>
          )}
        </button>
      </div>

      {/* Status */}
      {status && (
        <div className={`mx-6 mb-2 mt-3 flex items-start gap-3 p-3.5 rounded-2xl border text-sm transition-all duration-300 ${
          statusType === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : statusType === "error"
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : "bg-violet-500/10 border-violet-500/20 text-violet-300"
        }`}>
          {statusType === "success" && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          )}
          {statusType === "error" && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>
            </svg>
          )}
          {statusType === "loading" && (
            <svg className="animate-spin flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          )}
          <span>{status}</span>
        </div>
      )}

      {!status && <div className="pb-4" />}

      <p className="text-center text-white/20 text-[10px] pb-4 mt-2">
        Hedera Testnet · Transactions are not real
      </p>
    </div>
  );
}