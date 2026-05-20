import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getStoredToken } from '../services/api';

const WS_URL = process.env.REACT_APP_WS_URL?.trim() || 'http://localhost:3001';

interface UseRealtimeEventsOptions {
  onRfqNew?: (data: unknown) => void;
  onRfqUpdated?: (data: unknown) => void;
  onInboxNew?: (data: unknown) => void;
  onInboxUpdated?: (data: unknown) => void;
  onQuotationUpdated?: (data: unknown) => void;
  onSyncProgress?: (data: { status: string; [key: string]: unknown }) => void;
  onWhatsAppQR?: (data: { accountId: string; qr: string }) => void;
}

export function useRealtimeEvents(options: UseRealtimeEventsOptions = {}) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    const token = getStoredToken();
    if (!token) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(`${WS_URL}/events`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[WS] connect_error:', err.message);
      setConnected(false);
    });

    socket.on('rfq.new', (data: unknown) => {
      optionsRef.current.onRfqNew?.(data);
    });

    socket.on('rfq.updated', (data: unknown) => {
      optionsRef.current.onRfqUpdated?.(data);
    });

    socket.on('inbox.new', (data: unknown) => {
      optionsRef.current.onInboxNew?.(data);
    });

    socket.on('inbox.updated', (data: unknown) => {
      optionsRef.current.onInboxUpdated?.(data);
    });

    socket.on('quotation.updated', (data: unknown) => {
      optionsRef.current.onQuotationUpdated?.(data);
    });

    socket.on('sync.progress', (data: { status: string; [key: string]: unknown }) => {
      optionsRef.current.onSyncProgress?.(data);
    });

    socket.on('whatsapp.qr', (data: { accountId: string; qr: string }) => {
      optionsRef.current.onWhatsAppQR?.(data);
    });

    socketRef.current = socket;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  return { connected };
}
