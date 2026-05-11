const dns = require("dns").promises;
const nodemailer = require("nodemailer");
const validator = require("validator");
const Newsletter = require("../model/Newsletter");
const { secret } = require("../config/secret");

const disposableDomains = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com",
  "fakeinbox.com",
]);

const createTransporter = () => {
  const transporterOptions = {
    secure: true,
    auth: {
      user: secret.email_user,
      pass: secret.email_pass,
    },
  };

  if (secret.email_service) {
    transporterOptions.service = secret.email_service;
  } else {
    transporterOptions.host = secret.email_host;
    transporterOptions.port = Number(secret.email_port) || 465;
  }

  return nodemailer.createTransport(transporterOptions);
};

const hasRealDomain = async (domain) => {
  try {
    const mx = await dns.resolveMx(domain);
    if (mx && mx.length > 0) {
      return true;
    }
  } catch (error) {
    // no-op
  }

  try {
    const aRecord = await dns.resolve4(domain);
    return Array.isArray(aRecord) && aRecord.length > 0;
  } catch (error) {
    return false;
  }
};

exports.subscribe = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }

    const domain = email.split("@")[1];
    if (!domain) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }

    if (disposableDomains.has(domain)) {
      return res.status(400).json({ message: "Please use a real email address" });
    }

    const realDomain = await hasRealDomain(domain);
    if (!realDomain) {
      return res.status(400).json({ message: "Please use a valid, working email domain" });
    }

    const existing = await Newsletter.findOne({ email });
    if (existing && existing.subscribed) {
      return res.status(200).json({ message: "This email is already subscribed" });
    }

    if (existing && !existing.subscribed) {
      existing.subscribed = true;
      await existing.save();
    }

    if (!existing) {
      await Newsletter.create({ email, subscribed: true });
    }

    let emailSent = false;
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: secret.email_user,
        to: email,
        subject: "Welcome to Nayora Newsletter",
        html: `
          <h2>Welcome to Nayora</h2>
          <p>Thanks for subscribing to our newsletter.</p>
          <p>You will now receive updates about new drops and exclusive launches.</p>
          <p>Regards,<br/>Nayora Team</p>
        `,
      });
      emailSent = true;
    } catch (error) {
      emailSent = false;
    }

    return res.status(200).json({
      message: emailSent
        ? "Subscribed successfully. A confirmation email was sent."
        : "Subscribed successfully. Confirmation email could not be sent right now.",
      emailSent,
    });
  } catch (error) {
    next(error);
  }
};