// Firebase Cloud Messaging service worker — handles background push notifications.
// Firebase config is injected via URL search params when this SW is registered.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});

const messaging = firebase.messaging();

// Show a notification when the app is in the background or closed
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title ?? 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body ?? '',
    icon: '/companyLogo/CompanyLogo.png',
    data: payload.data ?? {},
  };
  self.registration.showNotification(notificationTitle, notificationOptions);

  // Forward the payload to any open app tabs so the Zustand store is updated
  // even when the push arrived while the tab was in the background.
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    clientList.forEach((client) => {
      client.postMessage({
        type: 'PUSH_NOTIFICATION',
        title: notificationTitle,
        body: notificationOptions.body,
        data: notificationOptions.data,
      });
    });
  });
});

// On notification click: focus/open the app and forward the payload
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};
  const url = '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const send = (client) => client.postMessage({
        type: 'PUSH_NOTIFICATION',
        title: event.notification.title,
        body: event.notification.body,
        data,
      });
      for (const client of clientList) {
        if ('focus' in client) {
          send(client);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url).then((client) => client && send(client));
      }
    })
  );
});
