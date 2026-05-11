  // META TAG CONTROLLER
  const MetaTag = require("../model/MetaTagModel");

  /**
   * Small helper to normalize incoming meta tag data.
   * This keeps stored values clean and consistent.
   */
  const buildMetaTagPayload = (body = {}) => ({
    page: body.page ? body.page.toLowerCase().trim() : "",
    title: body.title ? body.title.trim() : "",
    description: body.description ? body.description.trim() : "",
    robots: body.robots ? body.robots.trim() : "index, follow",
    ogTitle: body.ogTitle ? body.ogTitle.trim() : "",
    ogDescription: body.ogDescription ? body.ogDescription.trim() : "",
    ogImage: body.ogImage ? body.ogImage.trim() : "",
    ogUrl: body.ogUrl ? body.ogUrl.trim() : "",
  });

  /**
   * GET all meta tags
   * Used by admin panel to list all page SEO entries.
   */
  const getAllMetaTags = async (req, res, next) => {
    try {
      const metaTags = await MetaTag.find({})
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        message: "Meta tags fetched successfully",
        data: metaTags,
      });
    } catch (error) {
      console.error("getAllMetaTags error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch meta tags",
      });
    }
  };

  /**
   * GET single meta tag by page key
   * Example: home, about, contact
   */
  const getMetaTagByPage = async (req, res, next) => {
    try {
      const page = req.params.page?.toLowerCase().trim();

      const metaTag = await MetaTag.findOne({ page });

      if (!metaTag) {
        return res.status(404).json({
          success: false,
          message: "Meta tag not found for this page",
        });
      }

      res.status(200).json({
        success: true,
        message: "Meta tag fetched successfully",
        data: metaTag,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST create new meta tag
   * One page should ideally have only one meta tag record.
   */
  const createMetaTag = async (req, res, next) => {
    try {
      const payload = buildMetaTagPayload(req.body);

      if (!payload.page || !payload.title) {
        return res.status(400).json({
          success: false,
          message: "Page and title are required",
        });
      }

      const existingMetaTag = await MetaTag.findOne({ page: payload.page });

      if (existingMetaTag) {
        return res.status(409).json({
          success: false,
          message: "Meta tag already exists for this page",
        });
      }

      const metaTag = await MetaTag.create(payload);

      res.status(201).json({
        success: true,
        message: "Meta tag created successfully",
        data: metaTag,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH update existing meta tag by ID
   * This is used from the admin panel edit button.
   */
  const updateMetaTag = async (req, res, next) => {
    try {
      const { id } = req.params;
      const payload = buildMetaTagPayload(req.body);

      if (!payload.page || !payload.title) {
        return res.status(400).json({
          success: false,
          message: "Page and title are required",
        });
      }

      // Prevent duplicate page key while updating
      const duplicatePage = await MetaTag.findOne({
        page: payload.page,
        _id: { $ne: id },
      });

      if (duplicatePage) {
        return res.status(409).json({
          success: false,
          message: "Another meta tag already exists for this page",
        });
      }

      const updatedMetaTag = await MetaTag.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      });

      if (!updatedMetaTag) {
        return res.status(404).json({
          success: false,
          message: "Meta tag not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Meta tag updated successfully",
        data: updatedMetaTag,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE meta tag by ID
   */
  const deleteMetaTag = async (req, res, next) => {
    try {
      const { id } = req.params;

      const deletedMetaTag = await MetaTag.findByIdAndDelete(id);

      if (!deletedMetaTag) {
        return res.status(404).json({
          success: false,
          message: "Meta tag not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Meta tag deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  module.exports = {
    getAllMetaTags,
    getMetaTagByPage,
    createMetaTag,
    updateMetaTag,
    deleteMetaTag,
  };