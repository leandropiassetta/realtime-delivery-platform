import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { useAuth } from '../auth/auth-context';

export function useOrderRealtime(orderId?: number) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return undefined;
    const socket = io(import.meta.env.VITE_SOCKET_URL ?? '/', {
      auth: { accessToken },
      withCredentials: true,
    });
    const refreshOrders = () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (orderId) void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    };
    socket.on('order:created', refreshOrders);
    socket.on('order:updated', refreshOrders);
    if (orderId) {
      socket.on('connect', () => socket.emit('order:subscribe', { orderId }));
    }
    return () => {
      if (orderId) socket.emit('order:unsubscribe', { orderId });
      socket.disconnect();
    };
  }, [accessToken, orderId, queryClient]);
}
