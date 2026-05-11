const express = require('express');
const router = express.Router();
const userController= require('../controller/user.controller');
const verifyToken = require('../middleware/verifyToken');


// add a user
router.post("/signup", userController.signup);
// login
router.post("/login", userController.login);
// send otp for login
router.post('/send-otp', userController.sendOtp);
// forget-password
router.patch('/forget-password', userController.forgetPassword);
// confirm-forget-password
router.patch('/confirm-forget-password', userController.confirmForgetPassword);
// change password
router.patch('/change-password', verifyToken, userController.changePassword);
// confirmEmail
router.get('/confirmEmail/:token', userController.confirmEmail);
// updateUser
router.put('/update-user/:id', verifyToken, userController.updateUser);
// register or login with google
router.post("/register/:token", userController.signUpWithProvider);

module.exports = router;
