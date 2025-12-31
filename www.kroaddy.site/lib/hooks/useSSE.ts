'use client';

import { useState, useEffect, useRef } from 'react';

interface UseSSEOptions {
  enabled?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useSSE<T = any>(
  url: string,
  options: UseSSEOptions = {}
) {
  const { enabled = true, reconnect = true, reconnectInterval = 3000 } = options;
  
  const [data, setData] = useState<T[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const connect = () => {
      try {
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data) as T;
            setData((prev) => [...prev, parsed]);
          } catch (err) {
            console.error('SSE message parse error:', err);
          }
        };

        eventSource.onerror = (err) => {
          setIsConnected(false);
          setError(new Error('SSE connection error'));
          
          if (reconnect && eventSource.readyState === EventSource.CLOSED) {
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, reconnectInterval);
          }
        };
      } catch (err) {
        setError(err instanceof Error ? err : new Error('SSE connection failed'));
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [url, enabled, reconnect, reconnectInterval]);

  return { data, isConnected, error };
}

