const CACHE = 'caselle-v1';
const PRECACHE = [
  './',
  'manifest.json',
  'icon.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
  'cj_model.glb',
  'cj_model_2.glb',
  'cj_model_3.glb'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(PRECACHE.map(u =>
        fetch(new Request(u, { mode: u.startsWith('http') ? 'no-cors' : 'same-origin' }))
          .then(r => (r.ok || r.type === 'opaque') ? c.put(u, r) : null)
          .catch(() => {})
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!/^https?:$/.test(url.protocol)) return;
  // datele și ping-ul Supabase trec direct, neatinse
  if (url.hostname.endsWith('supabase.co')) return;
  // API-uri externe (geolocație, versuri etc.) nu se salvează
  if (url.hostname !== location.hostname && !/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) return;

  const store = res => {
    if (res && (res.status === 200 || res.type === 'opaque')) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  };

  // pagina: întâi rețeaua, fără internet varianta salvată
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(store).catch(() =>
        caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./'))
      )
    );
    return;
  }

  // modelele 3D: din cache, se descarcă o singură dată
  if (/\.glb$/i.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(store)));
    return;
  }

  // restul: din cache instant, reîmprospătat în fundal
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(store).catch(() => hit);
      return hit || net;
    })
  );
});
