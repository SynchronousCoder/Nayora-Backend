const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../model/User");
const { sendEmail } = require("../config/email");
const { generateToken, tokenForVerify } = require("../utils/token");
const { secret } = require("../config/secret");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(secret.google_client_id);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizePhoneInput = (value = "") => String(value).replace(/\D/g, "");

const normalizeCountryCode = (value = "") => {
  const digits = String(value).replace(/\D/g, "");
  return digits ? `+${digits}` : "";
};

const buildPhoneNormalized = (countryCode = "", phone = "") => {
  const phoneDigits = normalizePhoneInput(phone);
  if (!phoneDigits) return "";

  return `${normalizeCountryCode(countryCode)}${phoneDigits}`;
};

const findUserByEmailOrPhone = async (identifier = "") => {
  const value = String(identifier).trim();
  if (!value) {
    return null;
  }

  if (emailRegex.test(value)) {
    return User.findOne({ email: value.toLowerCase() });
  }

  const phoneDigits = normalizePhoneInput(value);
  const normalizedWithCode = value.startsWith("+") ? `+${phoneDigits}` : "";

  return User.findOne({
    $or: [
      { phone: phoneDigits },
      ...(normalizedWithCode ? [{ phoneNormalized: normalizedWithCode }] : []),
    ],
  });
};

// register user
// sign up
exports.signup = async (req, res,next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = normalizePhoneInput(req.body.phone);
    const countryCode = normalizeCountryCode(req.body.countryCode);

    if (!phone || !countryCode) {
      return res.status(400).json({
        status: "fail",
        error: "Phone number and country code are required",
      });
    }

    const phoneNormalized = buildPhoneNormalized(countryCode, phone);
    const user = await User.findOne({
      $or: [{ email }, { phoneNormalized }],
    });

    if (user?.email === email) {
      return res.status(409).json({ status: "fail", error: "Email already exists" });
    }

    if (user?.phoneNormalized === phoneNormalized) {
      return res.status(409).json({ status: "fail", error: "Phone number already exists" });
    }

    if (!user) {
      const saved_user = await User.create({
        ...req.body,
        email,
        phone,
        countryCode,
        phoneNormalized,
      });
      const token = saved_user.generateConfirmationToken();

      await saved_user.save({ validateBeforeSave: false });

      const mailData = {
        from: secret.email_user,
        to: `${req.body.email}`,
        subject: "Email Activation",
        subject: "Verify Your Email",
        html: `<h2>Hello ${req.body.name}</h2>
        <p>Verify your email address to complete the signup and login into your <strong>shofy</strong> account.</p>
  
          <p>This link will expire in <strong> 10 minute</strong>.</p>
  
          <p style="margin-bottom:20px;">Click this link for active your account</p>
  
          <a href="${secret.client_url}/email-verify/${token}" style="background:#0989FF;color:white;border:1px solid #0989FF; padding: 10px 15px; border-radius: 4px; text-decoration:none;">Verify Account</a>
  
          <p style="margin-top: 35px;">If you did not initiate this request, please contact us immediately at support@shofy.com</p>
  
          <p style="margin-bottom:0px;">Thank you</p>
          <strong>shofy Team</strong>
           `,
      };
      const message = "Please check your email to verify!";
      sendEmail(mailData, res, message);
    }
  } catch (error) {
    next(error)
  }
};

/**
 * 1. Check if Email and password are given
 * 2. Load user with email
 * 3. if not user send res
 * 4. compare password
 * 5. if password not correct send res
 * 6. check if user is active
 * 7. if not active send res
 * 8. generate token
 * 9. send user and token
 */
module.exports.login = async (req, res,next) => {
  try {
    const { email, identifier, password, otp } = req.body;
    const loginIdentifier = String(identifier || email || "").trim();

    if (!loginIdentifier) {
      return res.status(401).json({
        status: "fail",
        error: "Please provide your email or phone number",
      });
    }

    if (otp && !emailRegex.test(loginIdentifier)) {
      return res.status(400).json({
        status: "fail",
        error: "OTP login is available only with email",
      });
    }

    const user = await findUserByEmailOrPhone(loginIdentifier);

    if (!user) {
      return res.status(401).json({
        status: "fail",
        error: "No user found. Please create an account",
      });
    }

    // If OTP provided, validate OTP login
    if (otp) {
      if (!user.otpCode) {
        return res.status(400).json({ status: "fail", error: "No OTP requested for this user" });
      }

      const now = new Date();
      if (!user.otpExpires || now > new Date(user.otpExpires)) {
        return res.status(401).json({ status: "fail", error: "OTP expired" });
      }

      if (String(user.otpCode) !== String(otp)) {
        return res.status(403).json({ status: "fail", error: "Invalid OTP" });
      }

      // clear OTP
      user.otpCode = undefined;
      user.otpExpires = undefined;
      await user.save({ validateBeforeSave: false });

      if (user.status != "active") {
        return res.status(401).json({ status: "fail", error: "Your account is not active yet." });
      }

      const token = generateToken(user);
      const { password: pwd, ...others } = user.toObject();

      return res.status(200).json({
        status: "success",
        message: "Successfully logged in",
        data: { user: others, token },
      });
    }

    // Otherwise follow password-based login (password is optional but preferred second option)
    if (!password) {
      return res.status(401).json({ status: "fail", error: "Please provide password or OTP" });
    }

    const isPasswordValid = user.comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(403).json({
        status: "fail",
        error: "Password is not correct",
      });
    }

    if (user.status != "active") {
      return res.status(401).json({
        status: "fail",
        error: "Your account is not active yet.",
      });
    }

    const token = generateToken(user);

    const { password: pwd, ...others } = user.toObject();

    res.status(200).json({
      status: "success",
      message: "Successfully logged in",
      data: {
        user: others,
        token,
      },
    });
  } catch (error) {
    next(error)
  }
};

// send OTP to login
exports.sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: "fail", error: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: "fail", error: "User not found" });
    }

    // generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otpCode = otp;
    user.otpExpires = expires;

    await user.save({ validateBeforeSave: false });

    const mailData = {
      from: secret.email_user,
      to: `${email}`,
      subject: "Your OTP Code",
      html: `<p>Your OTP code is <strong>${otp}</strong>. It will expire in 10 minutes.</p>`,
    };

    // Use sendEmail which will send an HTTP response on success — we want to respond with message too
    sendEmail(mailData, res, "OTP sent to your email");
  } catch (error) {
    next(error);
  }
};

// confirmEmail
exports.confirmEmail = async (req, res,next) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ confirmationToken: token });

    if (!user) {
      return res.status(403).json({
        status: "fail",
        error: "Invalid token",
      });
    }

    const expired = new Date() > new Date(user.confirmationTokenExpires);

    if (expired) {
      return res.status(401).json({
        status: "fail",
        error: "Token expired",
      });
    }

    user.status = "active";
    user.confirmationToken = undefined;
    user.confirmationTokenExpires = undefined;

    await user.save({ validateBeforeSave: false });

    const accessToken = generateToken(user);

    const { password: pwd, ...others } = user.toObject();

    res.status(200).json({
      status: "success",
      message: "Successfully activated your account.",
      data: {
        user: others,
        token: accessToken,
      },
    });
  } catch (error) {
    next(error)
  }
};

// forgetPassword
exports.forgetPassword = async (req, res,next) => {
  try {
    const { verifyEmail } = req.body;
    const user = await User.findOne({ email: verifyEmail });
    if (!user) {
      return res.status(404).send({
        message: "User Not found with this email!",
      });
    } else {
      const token = tokenForVerify(user);
      const body = {
        from: secret.email_user,
        to: `${verifyEmail}`,
        subject: "Password Reset",
        html: `<h2>Hello ${verifyEmail}</h2>
        <p>A request has been received to change the password for your <strong>Shofy</strong> account </p>

        <p>This link will expire in <strong> 10 minute</strong>.</p>

        <p style="margin-bottom:20px;">Click this link for reset your password</p>

        <a href=${secret.client_url}/forget-password/${token} style="background:#0989FF;color:white;border:1px solid #0989FF; padding: 10px 15px; border-radius: 4px; text-decoration:none;">Reset Password</a>

        <p style="margin-top: 35px;">If you did not initiate this request, please contact us immediately at support@shofy.com</p>

        <p style="margin-bottom:0px;">Thank you</p>
        <strong>Shofy Team</strong>
        `,
      };
      user.confirmationToken = token;
      const date = new Date();
      date.setDate(date.getDate() + 1);
      user.confirmationTokenExpires = date;
      await user.save({ validateBeforeSave: false });
      const message = "Please check your email to reset password!";
      sendEmail(body, res, message);
    }
  } catch (error) {
    next(error)
  }
};

// confirm-forget-password
exports.confirmForgetPassword = async (req, res,next) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({ confirmationToken: token });

    if (!user) {
      return res.status(403).json({
        status: "fail",
        error: "Invalid token",
      });
    }

    const expired = new Date() > new Date(user.confirmationTokenExpires);

    if (expired) {
      return res.status(401).json({
        status: "fail",
        error: "Token expired",
      });
    } else {
      const newPassword = bcrypt.hashSync(password);
      await User.updateOne(
        { confirmationToken: token },
        { $set: { password: newPassword } }
      );

      user.confirmationToken = undefined;
      user.confirmationTokenExpires = undefined;

      await user.save({ validateBeforeSave: false });

      res.status(200).json({
        status: "success",
        message: "Password reset successfully",
      });
    }
  } catch (error) {
    next(error)
  }
};

// change password
exports.changePassword = async (req, res,next) => {
  try {
    const {password,googleSignIn,newPassword} = req.body || {};
    const user = await User.findById(req.user?._id);
    // Check if the user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if(googleSignIn){
      const hashedPassword = bcrypt.hashSync(newPassword);
      await User.updateOne({_id:req.user._id},{password:hashedPassword})
      return res.status(200).json({ message: "Password changed successfully" });
    }
    if(!bcrypt.compareSync(password, user?.password)){
      return res.status(401).json({ message: "Incorrect current password" });
    }
    else {
      const hashedPassword = bcrypt.hashSync(newPassword);
      await User.updateOne({_id:req.user._id},{password:hashedPassword})
      res.status(200).json({ message: "Password changed successfully" });
    }
  } catch (error) {
    next(error)
  }
};

// update a profile
exports.updateUser = async (req, res,next) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId);
    if (user) {
      user.name = req.body.name;
      user.email = req.body.email;
      user.phone = req.body.phone;
      user.countryCode = req.body.countryCode ?? user.countryCode;
      user.phoneNormalized = buildPhoneNormalized(user.countryCode, req.body.phone);
      user.address = req.body.address;
      user.bio = req.body.bio; 
      const updatedUser = await user.save();
      const token = generateToken(updatedUser);
      res.status(200).json({
        status: "success",
        message: "Successfully updated profile",
        data: {
          user: updatedUser,
          token,
        },
      });
    }
  } catch (error) {
    next(error)
  }
};

// signUpWithProvider
exports.signUpWithProvider = async (req, res,next) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: req.params.token,
      audience: secret.google_client_id,
    });
    const user = ticket.getPayload();
    const isAdded = await User.findOne({ email: user.email });
    if (isAdded) {
      const token = generateToken(isAdded);
      res.status(200).send({
        status: "success",
        data: {
          token,
          user: {
            _id: isAdded._id,
            name: isAdded.name,
            email: isAdded.email,
            address: isAdded.address,
            phone: isAdded.phone,
            imageURL: isAdded.imageURL,
            googleSignIn:true,
          },
        },
      });
    } else {
      const newUser = new User({
        name: user.name,
        email: user.email,
        imageURL: user.picture,
        status: 'active'
      });

      const signUpUser = await newUser.save();
      // console.log(signUpUser)
      const token = generateToken(signUpUser);
      res.status(200).send({
        status: "success",
        data: {
          token,
          user: {
            _id: signUpUser._id,
            name: signUpUser.name,
            email: signUpUser.email,
            imageURL: signUpUser.imageURL,
            googleSignIn:true,
          }
        },
      });
    }
  } catch (error) {
    next(error)
  }
};
