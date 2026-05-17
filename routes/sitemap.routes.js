const express = require("express");
const sitemapController = require("../controller/sitemap.controller");

const router = express.Router();

router.get("/sitemap.xml", sitemapController.getSitemap);

module.exports = router;
