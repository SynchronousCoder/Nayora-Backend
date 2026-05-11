const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env') })

module.exports.secret = {
  port: process.env.PORT,
  env: process.env.NODE_ENV,
  db_url: process.env.MONGO_URI,
  token_secret: process.env.TOKEN_SECRET,
  jwt_secret_for_verify: process.env.JWT_SECRET_FOR_VERIFY,
  google_client_id: process.env.GOOGLE_CLIENT_ID,

  email_service: process.env.SERVICE,
  email_user: process.env.EMAIL_USER,
  email_pass: process.env.EMAIL_PASS,
  email_host: process.env.HOST,
  email_port: process.env.EMAIL_PORT, 

  cloudinary_name: process.env.CLOUDINARY_NAME, 
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY, 
  cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET, 
  cloudinary_upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET, 
  
  stripe_key: process.env.STRIPE_KEY, 
  payu_key: process.env.PAYU_KEY,
  payu_salt: process.env.PAYU_SALT,
  payu_mode: process.env.PAYU_MODE || "sandbox",
  payu_base_url: process.env.PAYU_BASE_URL,
  backend_url: process.env.BACKEND_URL || process.env.API_URL,
  client_url: process.env.STORE_URL, 
  admin_url:process.env.ADMIN_URL, 
}
