const ContactMessage = require("../model/ContactMessage");

exports.createContactMessage = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const contactMessage = await ContactMessage.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: contactMessage,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdminContactMessages = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "", status = "all" } = req.query;

    const pageNumber = Number(page) || 1;
    const pageLimit = Number(limit) || 10;
    const skip = (pageNumber - 1) * pageLimit;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    if (status === "read") {
      query.isRead = true;
    } else if (status === "unread") {
      query.isRead = false;
    }

    const totalDoc = await ContactMessage.countDocuments(query);
    const messages = await ContactMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    res.status(200).json({
      success: true,
      data: messages,
      totalDoc,
      page: pageNumber,
      limit: pageLimit,
      totalPages: Math.ceil(totalDoc / pageLimit),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateContactMessageStatus = async (req, res, next) => {
  try {
    const { isRead } = req.body;

    const updatedMessage = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { isRead: Boolean(isRead) },
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Message marked as ${updatedMessage.isRead ? "read" : "unread"}`,
      data: updatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteContactMessage = async (req, res, next) => {
  try {
    const deletedMessage = await ContactMessage.findByIdAndDelete(req.params.id);

    if (!deletedMessage) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
