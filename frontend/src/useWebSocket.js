import { useEffect, useRef } from 'react';

const WS_URL = 'ws://localhost:5000';
const RECONNECT_DELAY = 3000;

export function useWebSocket(onMessage) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let ws;
    let timer;
    let destroyed = false;

    function connect() {
      if (destroyed) return;

      ws = new WebSocket(WS_URL);

      ws.onopen = () => console.log('WebSocket connected');

      ws.onmessage = (e) => {
        try { onMessageRef.current(JSON.parse(e.data)); } catch {}
      };

      ws.onerror = () => {}; // suppress console error — onclose handles retry

      ws.onclose = () => {
        if (!destroyed) {
          timer = setTimeout(connect, RECONNECT_DELAY);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(timer);
      ws?.close();
    };
  }, []);
}
