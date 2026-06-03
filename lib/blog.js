// Helpers compartilhados pelo blog server-rendered (Vercel serverless functions).
const { marked } = require('marked');

const SUPABASE_URL = process.env.BLOG_SUPABASE_URL || 'https://eojieekveynyilhxnsyn.supabase.co';
const SUPABASE_ANON_KEY = process.env.BLOG_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvamllZWt2ZXlueWlsaHhuc3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTg0NDYsImV4cCI6MjA4OTQ5NDQ0Nn0.blVsJ2HZZKEEJ5mFHqq7iEumxc5vzhM5_FIICJPLRYA';

const SITE = 'https://mktsimple.com.br';
const BRAND = 'Simple MKT Digital';

marked.setOptions({ mangle: false, headerIds: true, headerPrefix: '' });

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

const fetchPostBySlug = (slug) =>
  sbGet(`blog_posts?slug=eq.${encodeURIComponent(slug)}&published=eq.true&limit=1`).then((r) => r[0] || null);

const fetchPublishedPosts = () =>
  sbGet('blog_posts?published=eq.true&order=published_at.desc&select=title,slug,excerpt,published_at,content');

function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

function readTime(content) {
  const words = (content || '').split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min de leitura`;
}

// Primeira imagem do markdown vira capa / og:image.
function firstImage(content = '') {
  const m = content.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/);
  return m ? m[1] : null;
}

// Remove markdown básico de um trecho (para texto de schema/FAQ).
function stripMd(s = '') {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extrai perguntas/respostas da seção "Perguntas Frequentes" (H3 terminando em "?").
function extractFaq(content = '') {
  const lines = content.split('\n');
  let inFaq = false;
  const items = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      inFaq = /perguntas\s+frequentes|faq/i.test(h2[1]);
      if (cur) { items.push(cur); cur = null; }
      continue;
    }
    if (!inFaq) continue;
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      if (cur) items.push(cur);
      cur = { q: stripMd(h3[1]), a: '' };
    } else if (cur && line.trim()) {
      cur.a += (cur.a ? ' ' : '') + stripMd(line);
    }
  }
  if (cur) items.push(cur);
  return items.filter((i) => i.q && i.a).slice(0, 8);
}

const STYLES = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0d0d0d;--bg2:#161616;--border:#262626;--text:#e5e5e5;--muted:#737373;--accent:#22c55e;--accent-dim:#16a34a}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;line-height:1.6}
a{color:inherit;text-decoration:none}
nav{border-bottom:1px solid var(--border);padding:0 1.5rem;display:flex;align-items:center;justify-content:space-between;height:64px;position:sticky;top:0;background:rgba(13,13,13,.95);backdrop-filter:blur(8px);z-index:10}
.logo{font-weight:700;font-size:1.1rem;letter-spacing:-.02em}.logo span{color:var(--accent)}
.nav-links{display:flex;gap:2rem;font-size:.9rem;color:var(--muted)}.nav-links a:hover{color:var(--text)}
.breadcrumb{max-width:760px;margin:0 auto;padding:1.25rem 1.5rem 0;font-size:.82rem;color:var(--muted);display:flex;gap:.4rem;align-items:center}
.breadcrumb a:hover{color:var(--text)}.breadcrumb .sep{color:var(--border)}
.hero{max-width:760px;margin:0 auto;padding:4rem 1.5rem 2rem}
.badge{display:inline-block;font-size:.75rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);border:1px solid var(--accent-dim);border-radius:999px;padding:.25rem .75rem;margin-bottom:1.25rem}
.hero h1{font-size:clamp(2rem,5vw,3rem);font-weight:700;letter-spacing:-.03em;line-height:1.15;margin-bottom:1rem}
.hero p{font-size:1.1rem;color:var(--muted);max-width:540px}
.posts-section{max-width:760px;margin:0 auto;padding:0 1.5rem 5rem}
.post-card{display:grid;grid-template-columns:1fr auto;gap:1rem;align-items:start;padding:1.75rem 0;border-bottom:1px solid var(--border)}
.post-card:first-child{border-top:1px solid var(--border)}
.post-card:hover .post-title{color:var(--accent)}
.post-meta{display:flex;align-items:center;gap:.5rem;font-size:.78rem;color:var(--muted);margin-bottom:.5rem}
.post-meta .dot{width:3px;height:3px;border-radius:50%;background:var(--border)}
.post-title{font-size:1.15rem;font-weight:600;letter-spacing:-.02em;margin-bottom:.4rem}
.post-excerpt{font-size:.9rem;color:var(--muted)}
.post-arrow{font-size:1.2rem;color:var(--border);padding-top:.25rem}
.article-wrap{max-width:720px;margin:0 auto;padding:2.5rem 1.5rem 5rem}
.article-meta{display:flex;align-items:center;gap:.5rem;font-size:.82rem;color:var(--muted);margin-bottom:1rem}
.article-meta .dot{width:3px;height:3px;border-radius:50%;background:var(--border)}
.article-title{font-size:clamp(1.75rem,4vw,2.5rem);font-weight:700;letter-spacing:-.03em;line-height:1.2;margin-bottom:1rem}
.article-excerpt{font-size:1.1rem;color:var(--muted);line-height:1.7}
.article-divider{border:none;border-top:1px solid var(--border);margin:2rem 0}
.prose{font-size:1.05rem;line-height:1.8}
.prose h1,.prose h2,.prose h3,.prose h4{font-weight:700;letter-spacing:-.02em;margin:2.5rem 0 .75rem;line-height:1.3}
.prose h2{font-size:1.5rem}.prose h3{font-size:1.2rem}.prose h4{font-size:1rem;color:var(--muted)}
.prose p{margin-bottom:1.25rem}
.prose a{color:var(--accent);text-decoration:underline;text-underline-offset:3px}.prose a:hover{color:var(--accent-dim)}
.prose strong{color:#fff;font-weight:600}
.prose ul,.prose ol{padding-left:1.5rem;margin-bottom:1.25rem}.prose li{margin-bottom:.4rem}
.prose blockquote{border-left:3px solid var(--accent);padding:.75rem 1.25rem;background:var(--bg2);border-radius:0 6px 6px 0;margin:1.5rem 0;font-style:italic}
.prose img{max-width:100%;border-radius:8px;border:1px solid var(--border);margin:1.5rem 0}
.prose hr{border:none;border-top:1px solid var(--border);margin:2.5rem 0}
.prose table{width:100%;border-collapse:collapse;margin-bottom:1.25rem;font-size:.92rem}
.prose th{background:var(--bg2);padding:.6rem .9rem;text-align:left;font-weight:600;border-bottom:2px solid var(--border)}
.prose td{padding:.6rem .9rem;border-bottom:1px solid var(--border);color:var(--muted)}
.author-box{margin-top:3rem;padding:1.5rem;background:var(--bg2);border:1px solid var(--border);border-radius:12px;display:flex;gap:1rem;align-items:flex-start}
.author-box .avatar{width:44px;height:44px;border-radius:50%;background:var(--accent);color:#000;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.1rem}
.author-box .who{font-size:.95rem}.author-box .who strong{color:#fff}
.author-box .who p{color:var(--muted);font-size:.85rem;margin:.25rem 0 0;line-height:1.6}
.author-box .who a{color:var(--accent)}
.cta-box{margin-top:2rem;padding:2rem;background:var(--bg2);border:1px solid var(--border);border-radius:12px;text-align:center}
.cta-box h3{font-size:1.2rem;font-weight:700;margin-bottom:.5rem}
.cta-box p{color:var(--muted);font-size:.9rem;margin-bottom:1.25rem}
.cta-btn{display:inline-block;background:var(--accent);color:#000;font-weight:700;font-size:.9rem;padding:.7rem 1.5rem;border-radius:6px}
footer{border-top:1px solid var(--border);padding:2rem 1.5rem;text-align:center;font-size:.85rem;color:var(--muted)}
footer a{color:var(--accent)}
@media(max-width:600px){.nav-links{display:none}.post-card{grid-template-columns:1fr}.post-arrow{display:none}}
`;

const NAV = `
<nav>
  <a href="/" class="logo">SIMPLE<span>.</span></a>
  <div class="nav-links">
    <a href="/">Início</a>
    <a href="/blog" style="color:var(--text)">Blog</a>
    <a href="/#contato">Contato</a>
  </div>
</nav>`;

const FOOTER = `<footer><p>© 2026 ${BRAND} · <a href="mailto:eduardo@mktsimple.com.br">eduardo@mktsimple.com.br</a></p></footer>`;

// Monta a página completa com todo o SEO já no HTML do servidor.
function renderPage({ title, description, canonicalPath, ogType = 'website', ogImage, jsonLd, body, indexable = true }) {
  const canonical = `${SITE}${canonicalPath}`;
  const robots = indexable ? 'index, follow' : 'noindex, nofollow';
  const og = [
    ['og:type', ogType],
    ['og:title', title],
    ['og:description', description || ''],
    ['og:url', canonical],
    ['og:locale', 'pt_BR'],
    ['og:site_name', BRAND],
  ];
  if (ogImage) og.push(['og:image', ogImage]);
  const ogTags = og.map(([p, c]) => `<meta property="${p}" content="${esc(c)}" />`).join('\n  ');
  const ldArr = Array.isArray(jsonLd) ? jsonLd : (jsonLd ? [jsonLd] : []);
  const ld = ldArr.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n  ');
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description || '')}" />
  <meta name="robots" content="${robots}" />
  <link rel="canonical" href="${canonical}" />
  ${ogTags}
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>${STYLES}</style>
  ${ld}
</head>
<body>
${NAV}
${body}
${FOOTER}
</body>
</html>`;
}

module.exports = {
  SITE, BRAND, marked, fetchPostBySlug, fetchPublishedPosts,
  esc, fmtDate, readTime, firstImage, extractFaq, renderPage,
};
