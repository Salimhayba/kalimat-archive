// كلمات أعجبتني — Service Worker
// نسخة الكاش: غيّر الرقم ده كل ما تحدّث index.html أو أي ملف بيانات (year.json) عشان يوصل التحديث للمستخدمين
const CACHE_VERSION = 'kalimat-archive-v8';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    // نجلب meta.json أولًا عشان نعرف أسماء ملفات السنوات ديناميكيًا (بدل تثبيتها يدويًا هنا،
    // فلو زادت سنة جديدة مستقبلًا هتتخزّن تلقائيًا بدون تعديل هذا الملف)
    fetch('./meta.json').then(function(r){ return r.json(); }).then(function(meta){
      var dataAssets = ['./meta.json'].concat((meta.years || []).map(function(y){ return './' + y + '.json'; }));
      var allAssets = CORE_ASSETS.concat(dataAssets);
      return caches.open(CACHE_VERSION).then(function(cache){
        return Promise.all(allAssets.map(function(url){
          return cache.add(url).catch(function(){}); // فشل ملف واحد ما يوقفش الباقي
        }));
      });
    }).catch(function(){
      // لو فشل الوصول لـ meta.json وقت التثبيت (مثلاً أول تثبيت بدون شبكة)، نخزّن الأساسيات على الأقل
      return caches.open(CACHE_VERSION).then(function(cache){
        return Promise.all(CORE_ASSETS.map(function(url){ return cache.add(url).catch(function(){}); }));
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_VERSION; })
        .map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Cache-first مع تحديث في الخلفية (stale-while-revalidate)
// نطاق مقيَّد: نخزّن فقط أصول نفس الموقع (نفس origin) وبأنماط أسماء معروفة —
// عشان الكاش ما يكبرش بلا حدود لو التطبيق لاحقًا حمّل أي مورد خارجي.
function isCacheable(url){
  try{
    var u = new URL(url);
    if(u.origin !== self.location.origin) return false;
    return /\.(html|js|json|json5|css|png|jpg|jpeg|svg|webp|woff2?)$/.test(u.pathname) || u.pathname.endsWith('/');
  }catch(e){ return false; }
}
self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  if(!isCacheable(event.request.url)) return; // اترك الطلب يمر عادي بدون كاش
  event.respondWith(
    caches.match(event.request).then(function(cached){
      var networkFetch = fetch(event.request).then(function(response){
        if(response && response.status === 200){
          var copy = response.clone();
          caches.open(CACHE_VERSION).then(function(cache){ cache.put(event.request, copy); });
        }
        return response;
      }).catch(function(){ return cached; });
      return cached || networkFetch;
    })
  );
});
