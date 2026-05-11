const express = require("express");
const router = express.Router();
const { createContactMessage } = require("../controller/contact.controller");

router.post("/", createContactMessage);

module.exports = router;
