// Sitemap dinâmico do blog: lista todos os posts publicados com lastmod.
const { SITE, fetchPublishedPosts } = require('../lib/blog');

module.exports = async (req, res) => {
  try {
    const posts = await fetchPublishedPosts();
    const urls = [
      `  <url><loc>${SITE}/blog</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`,
      ...posts.map((p) => {
        const lastmod = (p.published_at || '').slice(0, 10);
        return `  <url><loc>${SITE}/blog/${p.slug}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>monthly</changefreq><priority>0.7</priority></url>`;
      }),
    ].join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
    res.end(xml);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
};
