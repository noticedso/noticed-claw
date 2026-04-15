"use client";

import { useChat } from "ai/react";
import { useEffect, useRef } from "react";

export default function DashboardChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({ api: "/api/chat" });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] max-w-2xl">
      <h2 className="text-lg font-semibold mb-4">chat</h2>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <p className="text-lg mb-2">hey, i&apos;m claw</p>
              <p className="text-sm">ask me anything about your developer network</p>
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

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="message..."
          className="flex-1 border border-zinc-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-blue-500 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50 hover:bg-blue-600"
        >
          send
        </button>
      </form>
    </div>
  );
}
