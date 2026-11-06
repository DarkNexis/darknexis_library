/* ============================================================
   Этот файл — «уборщик» старого офлайн-кэша.

   Ранние версии сайта использовали service worker. Если он остался
   у кого-то в браузере, тот мог подсовывать устаревшие файлы после
   обновления сайта. Этот скрипт удаляет все старые кэши и
   разрегистрирует сам себя. Удалять файл не нужно: пусть лежит.
   ============================================================ */

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.claim(); })
  );
});
