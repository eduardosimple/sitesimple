// Server-render da listagem do blog, com links <a href> rastreáveis para cada post.
const {
  SITE, BRAND, fetchPublishedPosts, esc, fmtDate, readTime, renderPage,
} = require('../lib/blog');

module.exports = async (req, res) => {
  const isPreviewHost = /vercel\.app$/i.test(req.headers.host || '');
  try {
    const posts = await fetchPublishedPosts();

    const cards = posts.length
      ? posts.map((p) => `
        <a class="post-card" href="/blog/${esc(p.slug)}">
          <div>
            <div class="post-meta">
              <span>${fmtDate(p.published_at)}</span><span class="dot"></span>
              <span>${readTime(p.content)}</span>
            </div>
            <h2 class="post-title">${esc(p.title)}</h2>
            <p class="post-excerpt">${esc(p.excerpt || '')}</p>
          </div>
          <span class="post-arrow">↗</span>
        </a>`).join('')
      : '<p style="color:var(--muted);padding:2rem 0">Nenhum artigo publicado ainda. Volte em breve.</p>';

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: `Blog — ${BRAND}`,
      url: `${SITE}/blog`,
      inLanguage: 'pt-BR',
      blogPost: posts.slice(0, 20).map((p) => ({
        '@type': 'BlogPosting',
        headline: p.title,
        url: `${SITE}/blog/${p.slug}`,
        datePublished: p.published_at,
      })),
    };

    const body = `
<section class="hero">
  <span class="badge">Blog</span>
  <h1>Marketing de Performance em Chapecó</h1>
  <p>Estratégias, cases e aprendizados sobre tráfego pago, SEO e crescimento para empresas de Chapecó e região.</p>
</section>
<section class="posts-section"><div class="posts-grid">${cards}</div></section>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    res.end(renderPage({
      title: `Blog — ${BRAND} | Marketing Digital em Chapecó`,
      description: 'Insights sobre tráfego pago, SEO e marketing digital para empresas de Chapecó e do oeste de Santa Catarina.',
      canonicalPath: '/blog',
      ogType: 'website',
      jsonLd,
      body,
      indexable: !isPreviewHost,
    }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(renderPage({
      title: `Blog — ${BRAND}`, description: '', canonicalPath: '/blog', indexable: false,
      body: '<section class="posts-section"><p style="color:var(--muted);padding:4rem 0">Erro ao carregar os artigos.</p></section>',
    }));
  }
};
