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

self.addEventListener('push',event=>{
 let message={};try{message=event.data?.json()||{}}catch{message={}}
 const isReminder=message.type==='reminder';
 const title=isReminder?(message.kind==='todo'?'ISP-Ⅰ｜ToDo通知':'ISP-Ⅰ｜スケジュール通知'):'ISP-Ⅰ テスト通知';
 const body=isReminder?(message.kind==='todo'?'ToDoの締切60分前です。':'予定開始30分前です。'):'SupabaseからWeb Push通知が届きました。';
 event.waitUntil(self.registration.showNotification(title,{body,icon:'./icon.svg',badge:'./icon.svg',tag:isReminder?'ispi-reminder-'+String(message.jobId||''): 'ispi-server-push-test',data:{url:new URL('./?window=notifications',self.registration.scope).href}}));
});
