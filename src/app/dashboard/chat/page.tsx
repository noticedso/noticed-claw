"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState, useCallback } from "react";

interface SessionInfo {
  id: string;
  session_key: string;
  created_at: string;
  updated_at: string;
  total_tokens: number;
}

export default function DashboardChatPage() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
  } = useChat({
    api: "/api/chat",
    body: { sessionId: activeSessionId },
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  const loadSessionMessages = useCallback(
    async (sessionId: string) => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/messages`);
        if (res.ok) {
          const data: Array<{ id: string; role: string; content: string }> =
            await res.json();
          setMessages(
            data.map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          );
        } else {
          setMessages([]);
        }
      } catch {
        setMessages([]);
      }
    },
    [setMessages]
  );

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const res = await fetch("/api/sessions");
        if (res.ok && mounted) {
          const data: SessionInfo[] = await res.json();
          setSessions(data);
          if (data.length > 0) {
            setActiveSessionId(data[0].id);
            loadSessionMessages(data[0].id);
          }
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoadingSessions(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [loadSessionMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleNewSession() {
    try {
      const res = await fetch("/api/sessions", { method: "POST" });
      if (res.ok) {
        const session: SessionInfo = await res.json();
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.id);
        setMessages([]);
      }
    } catch {
      // ignore
    }
  }

  async function handleSessionChange(sessionId: string) {
    setActiveSessionId(sessionId);
    await loadSessionMessages(sessionId);
  }

  function formatSessionLabel(session: SessionInfo) {
    const date = new Date(session.created_at);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] max-w-2xl">
      {/* Header with session selector */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold">chat</h2>
        <div className="flex items-center gap-2 ml-auto">
          {loadingSessions ? (
            <span className="text-xs text-zinc-400">loading...</span>
          ) : (
            <>
              <select
                value={activeSessionId ?? ""}
                onChange={(e) => handleSessionChange(e.target.value)}
                className="border border-zinc-300 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sessions.length === 0 && (
                  <option value="">no sessions</option>
                )}
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatSessionLabel(s)}
                  </option>
                ))}
              </select>
              <button
                onClick={handleNewSession}
                className="border border-zinc-300 rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
              >
                + new
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <p className="text-lg mb-2">hey, i&apos;m noticed-claw</p>
              <p className="text-sm">
                {sessions.length === 0
                  ? "click '+ new' to start a session"
                  : "ask me anything about your developer network"}
              </p>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-[80%] ${
                m.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-zinc-100 text-zinc-900"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 rounded-lg px-4 py-2">
              <p className="text-sm text-zinc-500">thinking...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="message..."
          disabled={!activeSessionId}
          className="flex-1 border border-zinc-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-zinc-50 disabled:text-zinc-400"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim() || !activeSessionId}
          className="bg-blue-500 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50 hover:bg-blue-600"
        >
          send
        </button>
      </form>
    </div>
  );
}
