const CACHE='wellbeing-support-v1'; const OFFLINE='/offline';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/',OFFLINE,'/manifest.webmanifest']))));
self.addEventListener('fetch',event=>{if(event.request.method==='GET')event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(r=>r||caches.match(OFFLINE))))});
