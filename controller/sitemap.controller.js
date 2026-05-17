const sitemapService = require("../services/sitemap.service");

exports.getSitemap = async (req, res, next) => {
  try {
    const sitemapXml = await sitemapService.generateSitemapXml(req);

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=900, s-maxage=3600");
    res.status(200).send(sitemapXml);
  } catch (error) {
    next(error);
  }
};
