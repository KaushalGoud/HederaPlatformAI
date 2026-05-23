"use client";

import { useState } from "react";

type StatusType = "idle" | "loading" | "success" | "error";

export default function TransactionForm() {
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<StatusType>("idle");
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState("");
  const [hashscanUrl, setHashscanUrl] = useState("");

  const sendTransaction = async () => {
    if (!recipientId || !amount) {
      setStatus("Please fill all fields");
      setStatusType("error");
      return;
    }

    setLoading(true);
    setStatusType("loading");
    setStatus("Signing with AWS KMS...");
    setTxId("");
    setHashscanUrl("");

    try {
      const res = await fetch("/api/transfer-hbar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, amount: Number(amount) }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("Transaction confirmed");
        setStatusType("success");
        setTxId(data.transactionId || "");
        setHashscanUrl(data.hashscanUrl || "");
        setRecipientId("");
        setAmount("");
      } else {
        setStatus(data.error || "Transfer failed");
        setStatusType("error");
      }
    } catch {
      setStatus("Network error — check connection");
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        .tf-root {
          font-family: 'Syne', sans-serif;
          background: #080b12;
          border: 1px solid rgba(99,210,255,0.08);
          border-radius: 20px;
          overflow: hidden;
          width: 100%;
          max-width: 480px;
          position: relative;
          box-shadow:
            0 0 0 1px rgba(99,210,255,0.04),
            0 40px 80px -20px rgba(0,0,0,0.8),
            inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .tf-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(255,255,255,0.007) 2px, rgba(255,255,255,0.007) 4px
          );
          pointer-events: none;
          z-index: 0;
          border-radius: 20px;
        }

        .tf-root::after {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,210,255,0.5), rgba(168,85,247,0.4), transparent);
          pointer-events: none;
          z-index: 10;
        }

        .tf-header {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: linear-gradient(180deg, rgba(99,210,255,0.035) 0%, transparent 100%);
        }

        .tf-logo {
          width: 44px; height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, #0ea5e9, #6366f1, #a855f7);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          position: relative;
          box-shadow: 0 0 20px rgba(99,210,255,0.2), 0 4px 12px rgba(0,0,0,0.4);
        }

        .tf-logo::after {
          content: '';
          position: absolute; inset: 0;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
        }

        .tf-logo-ring {
          position: absolute;
          inset: -4px;
          border-radius: 18px;
          border: 1px solid rgba(99,210,255,0.18);
          animation: ring-pulse 3s ease-in-out infinite;
        }

        @keyframes ring-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }

        .tf-title { font-size: 15px; font-weight: 700; color: #f0f4ff; letter-spacing: -0.01em; }
        .tf-subtitle { font-size: 11px; color: rgba(255,255,255,0.28); margin-top: 2px; font-weight: 400; letter-spacing: 0.02em; }

        .tf-badge {
          margin-left: auto;
          display: flex; align-items: center; gap: 7px;
          background: rgba(234,179,8,0.07);
          border: 1px solid rgba(234,179,8,0.14);
          border-radius: 100px;
          padding: 5px 12px;
        }

        .tf-badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #eab308;
          box-shadow: 0 0 6px #eab308;
          animation: blink 2s ease-in-out infinite;
        }

        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.35} }

        .tf-badge-text { font-size: 11px; color: #eab308; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }

        .tf-body {
          position: relative;
          z-index: 1;
          padding: 22px 22px 18px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .tf-field { display: flex; flex-direction: column; gap: 8px; }

        .tf-label {
          font-size: 10.5px;
          font-weight: 600;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .tf-input-row {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 0 14px;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }

        .tf-input-row:focus-within {
          border-color: rgba(99,210,255,0.22);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 0 0 3px rgba(99,210,255,0.04);
        }

        .tf-input-icon { color: rgba(255,255,255,0.2); flex-shrink: 0; }

        .tf-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: rgba(240,244,255,0.88);
          padding: 13px 0;
        }

        .tf-input::placeholder { color: rgba(255,255,255,0.18); }
        .tf-input:disabled { opacity: 0.4; }

        /* hide number spinners */
        .tf-input[type=number] { appearance: textfield; }
        .tf-input[type=number]::-webkit-outer-spin-button,
        .tf-input[type=number]::-webkit-inner-spin-button { appearance: none; }

        .tf-tag {
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: rgba(99,210,255,0.7);
          background: rgba(99,210,255,0.07);
          border: 1px solid rgba(99,210,255,0.15);
          border-radius: 8px;
          padding: 4px 9px;
          flex-shrink: 0;
          letter-spacing: 0.05em;
        }

        .tf-clear {
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.2);
          padding: 4px;
          display: flex; align-items: center;
          transition: color 0.15s;
          flex-shrink: 0;
        }
        .tf-clear:hover { color: rgba(255,255,255,0.5); }

        .tf-divider {
          display: flex; align-items: center; gap: 12px;
          padding: 2px 0;
        }
        .tf-divider-line {
          flex: 1; height: 1px;
          background: rgba(255,255,255,0.05);
        }
        .tf-divider-icon {
          width: 28px; height: 28px;
          border-radius: 8px;
          background: rgba(99,210,255,0.06);
          border: 1px solid rgba(99,210,255,0.1);
          display: flex; align-items: center; justify-content: center;
          color: rgba(99,210,255,0.4);
        }

        .tf-btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: none;
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.18s;
          letter-spacing: 0.02em;
        }

        .tf-btn:not(:disabled) {
          background: linear-gradient(135deg, #0ea5e9, #6366f1, #a855f7);
          color: white;
          box-shadow: 0 4px 20px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15);
        }

        .tf-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.15);
        }

        .tf-btn:not(:disabled):active { transform: translateY(0) scale(0.99); }

        .tf-btn:disabled {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.25);
          cursor: not-allowed;
        }

        .tf-status {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.5;
          animation: status-in 0.2s ease both;
        }

        @keyframes status-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .tf-status.success {
          background: rgba(16,185,129,0.07);
          border: 1px solid rgba(16,185,129,0.15);
          color: #34d399;
        }
        .tf-status.error {
          background: rgba(239,68,68,0.07);
          border: 1px solid rgba(239,68,68,0.15);
          color: #f87171;
        }
        .tf-status.loading {
          background: rgba(99,210,255,0.05);
          border: 1px solid rgba(99,210,255,0.12);
          color: rgba(99,210,255,0.7);
        }

        .tf-status-icon { flex-shrink: 0; margin-top: 1px; }

        .tf-tx {
          margin-top: 6px;
          display: flex; flex-direction: column; gap: 4px;
        }

        .tf-tx-id {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          color: rgba(255,255,255,0.3);
          word-break: break-all;
        }

        .tf-hashscan {
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: rgba(99,210,255,0.6);
          text-decoration: none;
          display: inline-flex; align-items: center; gap: 4px;
          transition: color 0.15s;
        }
        .tf-hashscan:hover { color: rgba(99,210,255,1); }

        .tf-footer {
          text-align: center;
          font-size: 10px;
          color: rgba(255,255,255,0.1);
          padding: 0 22px 16px;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          position: relative; z-index: 1;
        }
        .tf-footer span { color: rgba(99,210,255,0.25); }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>

      <div className="tf-root">
        {/* Header */}
        <div className="tf-header">
          <div className="tf-logo">
            <div className="tf-logo-ring" />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L4 7.5V16.5L12 21L20 16.5V7.5L12 3Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M12 3V21M4 7.5L20 16.5M20 7.5L4 16.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="tf-title">Send HBAR 💸</div>
            <div className="tf-subtitle">Manual transfer · AWS KMS signed</div>
          </div>
          <div className="tf-badge">
            <span className="tf-badge-dot" />
            <span className="tf-badge-text">Testnet</span>
          </div>
        </div>

        {/* Body */}
        <div className="tf-body">

          {/* Recipient */}
          <div className="tf-field">
            <label className="tf-label">Recipient Account ID</label>
            <div className="tf-input-row">
              <svg className="tf-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                className="tf-input"
                placeholder="0.0.xxxxx"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                disabled={loading}
              />
              {recipientId && (
                <button className="tf-clear" onClick={() => setRecipientId("")}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="tf-divider">
            <div className="tf-divider-line" />
            <div className="tf-divider-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
            </div>
            <div className="tf-divider-line" />
          </div>

          {/* Amount */}
          <div className="tf-field">
            <label className="tf-label">Amount</label>
            <div className="tf-input-row">
              <svg className="tf-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <input
                className="tf-input"
                placeholder="0.00"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
              />
              <span className="tf-tag">HBAR</span>
            </div>
          </div>

          {/* Button */}
          <button className="tf-btn" onClick={sendTransaction} disabled={loading}>
            {loading ? (
              <>
                <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Signing with KMS...
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

          {/* Status */}
          {statusType !== "idle" && (
            <div className={`tf-status ${statusType}`}>
              <span className="tf-status-icon">
                {statusType === "success" && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                )}
                {statusType === "error" && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
                )}
                {statusType === "loading" && (
                  <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                )}
              </span>
              <div>
                {status}
                {statusType === "success" && txId && (
                  <div className="tf-tx">
                    <div className="tf-tx-id">TX: {txId}</div>
                    {hashscanUrl && (
                      <a className="tf-hashscan" href={hashscanUrl} target="_blank" rel="noreferrer">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        View on HashScan
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="tf-footer">secured by <span>AWS KMS · Hedera Hashgraph</span></div>
      </div>
    </>
  );
}