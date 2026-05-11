// models/metaTagModel.js (SCHEMA FOR SEO META TAGS)
const mongoose = require("mongoose");

/**
 * Stores SEO meta tag data for each page.
 * Example pages: home, about, contact, product-details.
 */
const metaTagSchema = new mongoose.Schema(
  {
    page: {
      type: String,
      required: [true, "Page is required"],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Meta title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    robots: {
      type: String,
      default: "index, follow",
      trim: true,
    },
    ogTitle: {
      type: String,
      default: "",
      trim: true,
    },
    ogDescription: {
      type: String,
      default: "",
      trim: true,
    },
    ogImage: {
      type: String,
      default: "",
      trim: true,
    },
    ogUrl: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const MetaTag =
  mongoose.models.MetaTag || mongoose.model("MetaTag", metaTagSchema);

module.exports = MetaTag;
