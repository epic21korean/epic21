/* EPIC21 교재 허브 — 서비스 워커
   페이지: 인터넷 먼저, 안 되면 저장본 / 표지·아이콘: 저장본 먼저
   (PDF는 archive.org 에 있어 저장하지 않는다) */
const V = 'epic21-e8a53558';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  const keep = res => { if (res && res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); } return res; };
  if (r.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('.html')) {
    e.respondWith(fetch(r, { cache: 'no-cache' }).then(keep).catch(() => caches.match(r).then(m => m || caches.match(new URL('./', self.registration.scope)))));
    return;
  }
  if (/\/(covers|icons)\//.test(u.pathname) || u.pathname.endsWith('.webmanifest')) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(keep)));
  }
});
