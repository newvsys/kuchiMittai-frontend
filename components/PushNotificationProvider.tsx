'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { firebaseConfig, getFirebaseMessaging } from '@/lib/firebase';
import { registerFcmToken, unregisterFcmToken } from '@/lib/push-notification';
import { useNotificationStore } from '@/app/_zustand/notificationStore';
import { NotificationType, NotificationPriority } from '@/types/notification';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const FCM_TOKEN_KEY = 'fcm_token';

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (_) {}
}

export default function PushNotificationProvider() {
  const { data: session, status } = useSession();
  const tokenRef = useRef<string | null>(null);
  const addNotification = useNotificationStore(s => s.addNotification);

  // Listen for messages posted by the service worker (background push / notification click)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSwMessage = (event: MessageEvent) => {
      console.log('[push] SW message received:', event.data);
      if (event.data?.type !== 'PUSH_NOTIFICATION') return;
      const { title, body, data } = event.data;
      const orderId = data?.orderId as string | undefined;

      playNotificationSound();
      addNotification({
        id: `push-${Date.now()}`,
        userId: '',
        title: title ?? 'New Notification',
        message: body ?? '',
        type: NotificationType.ORDER_UPDATE,
        isRead: false,
        priority: NotificationPriority.HIGH,
        metadata: orderId ? { orderId } : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast(`${title ?? 'New Notification'}${body ? ': ' + body : ''}`, { duration: 8000 });
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    console.log('[push] SW message listener registered');
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, [addNotification]);

  // Register FCM token when an admin session becomes active
  useEffect(() => {
    if (status !== 'authenticated') {
      console.log('[push] skip: session status =', status);
      return;
    }

    const role = (session?.user as any)?.role;
    if (role !== 'admin') {
      console.log('[push] skip: role is not admin, got =', role);
      return;
    }
    console.log('[push] admin session detected, initializing FCM...');

    let unsubscribeMessage: (() => void) | undefined;

    const init = async () => {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.log('[push] skip: Notification or serviceWorker API not supported');
        return;
      }

      // Register the service worker, injecting Firebase config via query params
      const swParams = new URLSearchParams({
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId,
      });

      const swRegistration = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?${swParams.toString()}`,
        { scope: '/' }
      );
      console.log('[push] SW registered:', swRegistration.scope);
      await navigator.serviceWorker.ready;
      console.log('[push] SW ready');

      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        console.log('[push] skip: getFirebaseMessaging() returned null');
        return;
      }

      const permission = await Notification.requestPermission();
      console.log('[push] notification permission:', permission);
      if (permission !== 'granted') return;

      const { getToken, onMessage } = await import('firebase/messaging');

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration,
      });
      console.log('[push] getToken result:', token ? token.substring(0, 20) + '...' : 'null/empty');
      if (!token) return;

      const storedToken = localStorage.getItem(FCM_TOKEN_KEY);
      const tokenRotated = storedToken !== null && storedToken !== token;
      if (tokenRotated) console.log('[push] FCM token rotated, re-registering');

      tokenRef.current = token;
      localStorage.setItem(FCM_TOKEN_KEY, token);

      const userId = (session?.user as any)?.id;
      console.log('[push] registering token with backend, userId =', userId);
      await registerFcmToken(token, userId);
      console.log('[push] token registered with backend successfully');

      // Handle foreground notifications
      unsubscribeMessage = onMessage(messaging, (payload) => {
        console.log('[push] onMessage fired, payload =', payload);
        const title = payload.notification?.title ?? 'New Notification';
        const body  = payload.notification?.body  ?? '';
        const orderId = payload.data?.orderId as string | undefined;

        playNotificationSound();
        addNotification({
          id: `push-${Date.now()}`,
          userId: String((session?.user as any)?.id ?? ''),
          title,
          message: body,
          type: NotificationType.ORDER_UPDATE,
          isRead: false,
          priority: NotificationPriority.HIGH,
          metadata: orderId ? { orderId } : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        toast(`${title}${body ? ': ' + body : ''}`, { duration: 8000 });
      });
      console.log('[push] onMessage listener registered, ready to receive foreground pushes');
    };

    init().catch(e => console.error('[push] init error:', e));

    return () => {
      unsubscribeMessage?.();
    };
  }, [status, session, addNotification]);

  // Unregister FCM token on logout
  useEffect(() => {
    if (status !== 'unauthenticated') return;

    const storedToken = tokenRef.current ?? localStorage.getItem(FCM_TOKEN_KEY);
    if (!storedToken) return;

    unregisterFcmToken(storedToken)
      .then(() => {
        localStorage.removeItem(FCM_TOKEN_KEY);
        tokenRef.current = null;
      })
      .catch(console.error);
  }, [status]);

  return null;
}
