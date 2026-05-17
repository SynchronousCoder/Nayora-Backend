const Category = require("../model/Category");
const Product = require("../model/Products");
const { secret } = require("../config/secret");

const DEFAULT_STATIC_PATHS = [
  "/",
  "/shop",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-and-conditions",
  "/refund-policy",
  "/shipping-policy",
];

const PRODUCT_BASE_PATH = process.env.SITEMAP_PRODUCT_BASE_PATH || "/product";
const CATEGORY_BASE_PATH = process.env.SITEMAP_CATEGORY_BASE_PATH || "/category";

const normalizeBaseUrl = (req) => {
  const configuredBaseUrl =
    process.env.SITEMAP_BASE_URL ||
    secret.client_url ||
    `${req.protocol}://${req.get("host")}`;

  return configuredBaseUrl.replace(/\/+$/, "");
};

const normalizePath = (pathname = "") => {
  const [pathWithoutQuery] = String(pathname).split(/[?#]/);
  const trimmedPath = pathWithoutQuery.trim();
  const withLeadingSlash = trimmedPath.startsWith("/")
    ? trimmedPath
    : `/${trimmedPath}`;

  if (withLeadingSlash === "/") {
    return "/";
  }

  return withLeadingSlash.replace(/\/+$/, "");
};

const encodePath = (pathname) =>
  normalizePath(pathname)
    .split("/")
    .map((segment, index) => (index === 0 ? "" : encodeURIComponent(segment)))
    .join("/");

const escapeXml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const formatDate = (value) => {
  if (!value) {
    return new Date().toISOString().split("T")[0];
  }

  return new Date(value).toISOString().split("T")[0];
};

const getStaticPaths = () => {
  if (!process.env.SITEMAP_STATIC_PATHS) {
    return DEFAULT_STATIC_PATHS;
  }

  return process.env.SITEMAP_STATIC_PATHS.split(",")
    .map((path) => path.trim())
    .filter(Boolean);
};

const buildUrl = (baseUrl, pathname) =>
  new URL(encodePath(pathname), `${baseUrl}/`).toString();

const addUrl = (urlMap, baseUrl, pathname, options = {}) => {
  const cleanPath = normalizePath(pathname);

  if (!cleanPath || cleanPath.includes("?")) {
    return;
  }

  const loc = buildUrl(baseUrl, cleanPath);

  if (!urlMap.has(loc)) {
    urlMap.set(loc, {
      loc,
      lastmod: formatDate(options.lastmod),
      changefreq: options.changefreq || "weekly",
      priority: options.priority || "0.7",
    });
  }
};

const buildUrlXml = ({ loc, lastmod, changefreq, priority }) => [
  "  <url>",
  `    <loc>${escapeXml(loc)}</loc>`,
  `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
  `    <changefreq>${escapeXml(changefreq)}</changefreq>`,
  `    <priority>${escapeXml(priority)}</priority>`,
  "  </url>",
].join("\n");

exports.generateSitemapXml = async (req) => {
  const baseUrl = normalizeBaseUrl(req);
  const urlMap = new Map();

  getStaticPaths().forEach((pathname) => {
    addUrl(urlMap, baseUrl, pathname, {
      changefreq: pathname === "/" ? "daily" : "weekly",
      priority: pathname === "/" ? "1.0" : "0.7",
    });
  });

  const [categories, products] = await Promise.all([
    Category.find({
      status: "Show",
      slug: { $exists: true, $nin: [null, ""] },
    })
      .select("slug updatedAt createdAt")
      .sort({ updatedAt: -1 })
      .lean(),
    Product.find({
      status: { $ne: "discontinued" },
      slug: { $exists: true, $nin: [null, ""] },
    })
      .select("slug updatedAt createdAt")
      .sort({ updatedAt: -1 })
      .lean(),
  ]);

  categories.forEach((category) => {
    addUrl(urlMap, baseUrl, `${CATEGORY_BASE_PATH}/${category.slug}`, {
      lastmod: category.updatedAt || category.createdAt,
      changefreq: "weekly",
      priority: "0.8",
    });
  });

  products.forEach((product) => {
    addUrl(urlMap, baseUrl, `${PRODUCT_BASE_PATH}/${product.slug}`, {
      lastmod: product.updatedAt || product.createdAt,
      changefreq: "weekly",
      priority: "0.9",
    });
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...Array.from(urlMap.values()).map(buildUrlXml),
    "</urlset>",
    "",
  ].join("\n");
};
