import { useState, useEffect, useCallback } from "react";

interface SessionInfo {
  id: string;
  session_key: string;
  created_at: string;
  updated_at: string;
  total_tokens: number;
}

export function useSessions() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const res = await fetch("/api/sessions");
        if (res.ok && mounted) {
          const data: SessionInfo[] = await res.json();
          setSessions(data);
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
  }, []);

  const createSession = useCallback(async (): Promise<SessionInfo | null> => {
    try {
      const res = await fetch("/api/sessions", { method: "POST" });
      if (res.ok) {
        const session: SessionInfo = await res.json();
        setSessions((prev) => [session, ...prev]);
        return session;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const loadSessionMessages = useCallback(
    async (
      sessionId: string,
    ): Promise<Array<{ id: string; role: string; content: string }> | null> => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/messages`);
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // ignore
      }
      return null;
    },
    [],
  );

  return {
    sessions,
    loadingSessions,
    createSession,
    loadSessionMessages,
  };
}
