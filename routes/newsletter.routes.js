const express = require("express");
const newsletterController = require("../controller/newsletter.controller");

const router = express.Router();

router.post("/subscribe", newsletterController.subscribe);

module.exports = router;