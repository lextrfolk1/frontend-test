'use client';

import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';

interface WebSocketListenerProps {
  topic: string;
  onMessage: (payload: any) => void;
  socketPath?: string; // default: '/websocket-endpoint'
  reconnectDelayMs?: number; // default: 5000
  heartbeatMs?: number; // default: 10000
}

const WebSocketListener = ({
  topic,
  onMessage,
  socketPath = '/websocket-endpoint',
  reconnectDelayMs = 5000,
  heartbeatMs = 10000,
}: WebSocketListenerProps) => {
  const stompClientRef = useRef<Client | null>(null);
  const connectedRef = useRef<boolean>(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const isSecure = window.location.protocol === 'https:';
    const scheme = isSecure ? 'wss://' : 'ws://';
    const host = 'localhost:8081'; // gateway
    const url = `${scheme}${host}/proxy/ws${socketPath}`;

    console.log('Connecting to native WebSocket at:', url);

    const connect = () => {
      if (connectedRef.current) return;

      const stompClient = new Client({
        brokerURL: url, // native WebSocket URL
        reconnectDelay: reconnectDelayMs,
        heartbeatIncoming: heartbeatMs,
        heartbeatOutgoing: heartbeatMs,

        onConnect: () => {
          console.log('WebSocket connected');
          connectedRef.current = true;

          stompClient.subscribe(topic, (message) => {
            try {
              const payload = message.body;
              console.log('WebSocket Message:', payload);
              onMessage(payload);
            } catch (err) {
              console.error('Failed to parse WebSocket message:', err);
            }
          });
        },

        onDisconnect: () => {
          console.warn('🔌 WebSocket disconnected');
          connectedRef.current = false;
          attemptReconnect();
        },

        onStompError: (frame) => {
          console.error('STOMP error:', frame);
          connectedRef.current = false;
          attemptReconnect();
        },

        onWebSocketError: (event) => {
          console.error('WebSocket error:', event);
          connectedRef.current = false;
          attemptReconnect();
        },
      });

      stompClient.activate();
      stompClientRef.current = stompClient;
    };

    const attemptReconnect = () => {
      if (reconnectTimeoutRef.current) return;

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        console.log('Attempting reconnection...');
        connect();
      }, reconnectDelayMs);
    };

    connect();

    const reconnectionInterval = setInterval(() => {
      if (!connectedRef.current) {
        console.log('Reconnection check...');
        connect();
      }
    }, 7000);

    return () => {
      clearInterval(reconnectionInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (stompClientRef.current) stompClientRef.current.deactivate();
    };
  }, [topic, onMessage, socketPath, reconnectDelayMs, heartbeatMs]);

  return null;
};

export default WebSocketListener;
