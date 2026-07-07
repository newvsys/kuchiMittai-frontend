"use client";

import React, { useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/env";

interface FlashMsg {
  id: number;
  message: string;
  bgColor: string | null;
  textColor: string | null;
  speed: string | null;
  linkUrl: string | null;
  priority: number;
}

const DURATION_MAP: Record<string, number> = { slow: 45, normal: 30, fast: 18 };

const displayMs = (msg: FlashMsg) => {
  const speed = msg.speed?.toLowerCase() ?? "normal";
  const duration = DURATION_MAP[speed] ?? 18;
  // Give longer messages more time to scroll fully
  const extra = Math.floor(msg.message.length / 20) * 2;
  return (duration + extra) * 1000;
};

const FlashMessageBanner = () => {
  const [messages, setMessages] = useState<FlashMsg[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/flash-messages?status=A`, { cache: "no-store" });
        if (!res.ok) { setMessages([]); return; }
        const data = await res.json();
        setMessages(
          Array.isArray(data.flashMessages) && data.flashMessages.length > 0
            ? data.flashMessages : []
        );
      } catch { setMessages([]); }
    };
    load();
  }, []);

  useEffect(() => { setActiveIdx(0); setVisible(true); }, [messages]);

  useEffect(() => {
    if (messages.length <= 1) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => { setActiveIdx(prev => (prev + 1) % messages.length); setVisible(true); }, 400);
    }, displayMs(messages[activeIdx]));
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [activeIdx, messages]);

  if (messages.length === 0) return null;

  const msg = messages[activeIdx];
  const speed = msg.speed?.toLowerCase() ?? "normal";
  const duration = DURATION_MAP[speed] ?? 18;
  const extra = Math.floor(msg.message.length / 20) * 2;
  const animDuration = `${duration + extra}s`;

  return (
    <>
      <style>{`
        @keyframes flash-scroll {
          0%   { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        .flash-ticker {
          display: inline-block;
          white-space: nowrap;
          animation: flash-scroll linear infinite;
        }
      `}</style>

      <div className="w-full flex items-center text-lg border-b border-gray-100 overflow-hidden">
        {/* Dots */}
        {messages.length > 1 && (
          <div className="flex-shrink-0 flex items-center gap-1 px-2">
            {messages.map((_, i) => (
              <span key={i} className="rounded-full transition-all duration-300" style={{
                width: i === activeIdx ? "14px" : "5px",
                height: "5px",
                backgroundColor: i === activeIdx ? "#2563eb" : "#93c5fd",
              }} />
            ))}
          </div>
        )}

        {/* Ticker */}
        <div
          className="flex-1 overflow-hidden py-2"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease" }}
        >
          {msg.linkUrl ? (
            <a
              key={msg.id}
              href={msg.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flash-ticker font-bold text-blue-600 hover:underline"
              style={{ animationDuration: animDuration }}
            >
              {msg.message}
            </a>
          ) : (
            <span
              key={msg.id}
              className="flash-ticker font-bold text-blue-600"
              style={{ animationDuration: animDuration }}
            >
              {msg.message}
            </span>
          )}
        </div>
      </div>
    </>
  );
};

export default FlashMessageBanner;

