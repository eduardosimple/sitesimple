// Server-render de um artigo do blog: HTML completo com title/H1/conteúdo/meta/canonical/JSON-LD.
const {
  SITE, BRAND, marked, fetchPostBySlug, esc, fmtDate, readTime, firstImage, extractFaq, renderPage,
} = require('../lib/blog');

module.exports = async (req, res) => {
  const isPreviewHost = /vercel\.app$/i.test(req.headers.host || '');
  let slug = (req.query && req.query.slug) || '';
  if (!slug) {
    const path = (req.url || '').split('?')[0];
    slug = decodeURIComponent(path.replace(/^\/blog\//, '').replace(/\/$/, ''));
  }

  try {
    const post = slug ? await fetchPostBySlug(slug) : null;

    if (!post) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(renderPage({
        title: `Artigo não encontrado — ${BRAND}`,
        description: 'O artigo que você procura não existe ou foi movido.',
        canonicalPath: '/blog',
        indexable: false,
        body: `<main class="article-wrap"><div style="text-align:center;padding:5rem 0;color:var(--muted)"><p style="font-size:3rem;margin-bottom:1rem">404</p><p>Artigo não encontrado.</p><a href="/blog" style="color:var(--accent);display:inline-block;margin-top:1rem">← Voltar ao blog</a></div></main>`,
      }));
      return;
    }

    const title = `${post.seo_title || post.title} — ${BRAND}`;
    const description = post.seo_description || post.excerpt || '';
    const canonicalPath = `/blog/${post.slug}`;
    const cover = post.cover_image || firstImage(post.content);
    const contentHtml = marked.parse(post.content || '');

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description,
      datePublished: post.published_at,
      dateModified: post.updated_at || post.published_at,
      author: { '@type': 'Organization', name: post.author || BRAND, url: SITE },
      publisher: {
        '@type': 'Organization',
        name: BRAND,
        url: SITE,
        logo: { '@type': 'ImageObject', url: `${SITE}/img_6860-removebg-preview.png` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}${canonicalPath}` },
      inLanguage: 'pt-BR',
    };
    if (cover) jsonLd.image = cover;

    // FAQPage schema (a partir da seção "Perguntas Frequentes") — forte para IA e featured snippets.
    const faq = extractFaq(post.content);
    const schemas = [jsonLd];
    if (faq.length) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      });
    }

    const body = `
<div class="breadcrumb">
  <a href="/">Início</a><span class="sep">/</span>
  <a href="/blog">Blog</a><span class="sep">/</span>
  <span>${esc(post.title)}</span>
</div>
<main class="article-wrap">
  <article>
    <header>
      <div class="article-meta">
        <span>${esc(post.author || BRAND)}</span><span class="dot"></span>
        <span>${fmtDate(post.published_at)}</span><span class="dot"></span>
        <span>${readTime(post.content)}</span>
      </div>
      <h1 class="article-title">${esc(post.title)}</h1>
      ${post.excerpt ? `<p class="article-excerpt">${esc(post.excerpt)}</p>` : ''}
    </header>
    <hr class="article-divider" />
    ${cover ? `<img class="cover-image" src="${esc(cover)}" alt="${esc(post.title)}" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;margin-bottom:2.5rem;border:1px solid var(--border)" />` : ''}
    <div class="prose">${contentHtml}</div>
    <div class="author-box">
      <div class="avatar">S</div>
      <div class="who">
        <strong>${esc(post.author || BRAND)}</strong>
        <p>Agência de tráfego pago e marketing digital em Chapecó (SC). Ajudamos pequenas e médias empresas da região a transformar investimento em anúncios em clientes reais, com estratégia de performance e dados. <a href="/#contato">Fale com a Simple</a>.</p>
      </div>
    </div>
    <div class="cta-box">
      <h3>Quer crescer com performance digital em Chapecó?</h3>
      <p>Agende uma análise estratégica gratuita e descubra o potencial do seu negócio.</p>
      <a href="/#contato" class="cta-btn">Quero uma análise gratuita →</a>
    </div>
  </article>
</main>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache na CDN por 5min, revalida em background por 1 dia.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    res.end(renderPage({
      title, description, canonicalPath, ogType: 'article', ogImage: cover, jsonLd: schemas, body,
      indexable: !isPreviewHost,
    }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(renderPage({
      title: `Erro — ${BRAND}`, description: '', canonicalPath: '/blog', indexable: false,
      body: `<main class="article-wrap"><p style="text-align:center;color:var(--muted);padding:4rem 0">Erro ao carregar o artigo.</p></main>`,
    }));
  }
};
