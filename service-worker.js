// 刷题宝 Service Worker —— 离线缓存（cache-first）
// 改了 index.html / 图标 / manifest 后，把 CACHE 版本号 +1，用户下次联网打开即自动更新。
// 【新增·AI 语音朗读功能】版本号 v10 → v11，使新版 index.html（含 TTS 模块）对已安装用户生效
// 【修改·TTS 优化】版本号 v11 → v12：防剧透 + 音质优化 + 自动播放 + 翻译朗读 + 小米15适配
// 【修改·音色展示优化】版本号 v12 → v13：音色列表加试听按钮 + 缺微软云系列提示装 Edge
// 【修改·装机指引】版本号 v13 → v14：补充装第三方 TTS 引擎详细步骤
// 【修改·Xiaoyi特调】版本号 v14 → v15：Xiaoyi/Natural 音色置顶 + 在线音色标注「需Edge」
// 【修改·卡顿优化】版本号 v15 → v16：keep-alive 间隔 10s→25s 减少打断 + 分段合并短句减少网络请求
// 【修改·强化检测】版本号 v16 → v17：音色加载轮询兜底 + 区分浏览器不支持/未加载 + 无中文音色回退任意音色
const CACHE = 'shuatibao-v17';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  // KaTeX 数学公式渲染（CDN 支持 CORS，可被预缓存，缓存后离线也能渲染公式）
  'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
  'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
  'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js'
];

// 安装：预缓存静态资源。本地资源必须成功；KaTeX（CDN）尽力而为，失败也不阻塞安装
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(ASSETS.map((url) =>
        c.add(url).catch(() => { /* 某个资源（如 CDN）暂时取不到就跳过，联网使用时再缓存 */ })
      ))
    ).then(() => self.skipWaiting())
  );
});

// 激活：清掉旧版本缓存
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 取数据：缓存优先，命中即返回；未命中则联网，并把成功的同源响应写入缓存
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((resp) => {
        // 缓存同源资源(basic)与可缓存的跨源资源(cors，如 KaTeX 及其字体)；opaque 不缓存
        if (resp && (resp.status === 200 && (resp.type === 'basic' || resp.type === 'cors'))) {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => caches.match('./index.html')); // 离线兜底回首页
    })
  );
});
