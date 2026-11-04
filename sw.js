/* ISP-I stage 1: notification display/click only. No caching or push subscription. */
self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const target=new URL('./?window=notifications',self.registration.scope).href;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const existing=windows.find(w=>w.url.startsWith(self.registration.scope));
  if(existing){await existing.focus();return;}
  await self.clients.openWindow(target);
 })());
});
