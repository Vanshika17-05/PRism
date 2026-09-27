import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const events = [
  "review:started",
  "review:analyzing",
  "review:completed",
  "review:failed",
];

export function useReviewProgress(repositoryIds = [], onTerminal) {
  const [progress, setProgress] = useState({});
  const key = repositoryIds.filter(Boolean).sort().join(",");
  useEffect(() => {
    if (!key) return undefined;
    const socket = io(import.meta.env.VITE_API_URL || window.location.origin, {
      withCredentials: true,
    });
    const ids = key.split(",");
    socket.emit("reviews:subscribe", ids);
    const listeners = events.map((event) => {
      const listener = (payload) => {
        setProgress((current) => ({
          ...current,
          [payload.reviewId]: { event, ...payload },
        }));
        if (event === "review:completed" || event === "review:failed")
          onTerminal?.(payload);
      };
      socket.on(event, listener);
      return [event, listener];
    });
    return () => {
      socket.emit("reviews:unsubscribe", ids);
      listeners.forEach(([event, listener]) => socket.off(event, listener));
      socket.disconnect();
    };
  }, [key, onTerminal]);
  return progress;
}
