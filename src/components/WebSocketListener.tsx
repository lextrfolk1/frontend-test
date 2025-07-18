'use client';

import { useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';

interface WebSocketListenerProps {
  topic: string;
  onMessage: (payload: any) => void;
  socketPath?: string; // default: relative path
  reconnectDelayMs?: number;
  heartbeatMs?: number;
}

const WebSocketListener = ({
  topic,
  onMessage,
  socketPath = 'http://localhost:8081/proxy/ws/websocket-endpoint',
  reconnectDelayMs = 5000,
  heartbeatMs = 10000,
}: WebSocketListenerProps) => {
  const stompClientRef = useRef<Client | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const scheduleReconnect = () => {
      if (reconnectTimeoutRef.current) return;

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        console.log('Attempting reconnection...');
        stompClientRef.current?.deactivate();
        stompClientRef.current?.activate();
      }, reconnectDelayMs);
    };

    const stompClient = new Client({
      webSocketFactory: () => new SockJS(socketPath),
      reconnectDelay: 0,
      heartbeatIncoming: heartbeatMs,
      heartbeatOutgoing: heartbeatMs,

      onConnect: () => {
        console.log('✅ WebSocket connected');

        stompClient.subscribe(topic, (message: IMessage) => {
          try {
            const payload = message.body;
            console.log('WebSocket message:', payload);
            onMessageRef.current?.(payload);
          } catch (err) {
            console.error('Failed to parse message:', err);
          }
        });
      },

      onWebSocketClose: () => {
        console.warn('WebSocket closed');
        scheduleReconnect();
      },

      onWebSocketError: (error) => {
        console.error('WebSocket error:', error);
        scheduleReconnect();
      },

      onStompError: (frame) => {
        console.error('STOMP error:', frame);
        scheduleReconnect();
      },
    });

 //   stompClient.debug = (msg) => console.log('[STOMP DEBUG]:', msg);
    stompClient.activate();
    stompClientRef.current = stompClient;

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      stompClient.deactivate();
    };
  }, [topic, socketPath, reconnectDelayMs, heartbeatMs]);

  return null;
};

export default WebSocketListener;
