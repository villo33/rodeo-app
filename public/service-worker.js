// 🔥 INSTALACIÓN
self.addEventListener("install", event => {
  console.log("✅ Service Worker instalado");
  self.skipWaiting();
});

// 🔥 ACTIVACIÓN
self.addEventListener("activate", event => {
  console.log("✅ Service Worker activo");
});

// ❌ ELIMINAMOS FETCH VACÍO (NO LO NECESITAS)
// ❌ NO pongas fetch si no vas a usar cache

// 🔔 PUSH NOTIFICATIONS
self.addEventListener("push", event => {

  let data = {
    title: "📋 Notificación",
    body: "Nueva tarea disponible"
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.log("Error leyendo push:", e);
    }
  }

  const options = {
    body: data.body,
    icon: "/logo.png",
    badge: "/logo.png",
    vibrate: [200, 100, 200] // 🔥 hace vibrar en celular
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 👆 CLICK EN NOTIFICACIÓN
self.addEventListener("notificationclick", event => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow("/")
  );
});