const crypto = require("crypto");
const mongoose = require("mongoose");
const { secret } = require("../config/secret");
const User = require("../model/User");
const Order = require("../model/Order");

const baseUrl = (process.env.TEST_BASE_URL || secret.backend_url || `http://localhost:${secret.port || 7000}`).replace(/\/$/, "");

const getHash = (fields) => {
  return crypto.createHash("sha512").update(fields.join("|")).digest("hex");
};

const getPayUResponseHash = (payload) => {
  const responseHashParts = [
    secret.payu_salt,
    payload.status || "",
    payload.udf10 || "",
    payload.udf9 || "",
    payload.udf8 || "",
    payload.udf7 || "",
    payload.udf6 || "",
    payload.udf5 || "",
    payload.udf4 || "",
    payload.udf3 || "",
    payload.udf2 || "",
    payload.udf1 || "",
    payload.email || "",
    payload.firstname || "",
    payload.productinfo || "",
    payload.amount || "",
    payload.txnid || "",
    secret.payu_key,
  ];

  if (payload.additionalCharges) {
    return getHash([payload.additionalCharges, ...responseHashParts]);
  }

  return getHash(responseHashParts);
};

const logStep = (message) => {
  console.log(`\n[PayU Test] ${message}`);
};

const fail = (message) => {
  console.error(`\n[PayU Test] FAILED: ${message}`);
  process.exitCode = 1;
};

const ensureConfig = () => {
  const missing = ["payu_key", "payu_salt", "client_url", "db_url"].filter((key) => !secret[key]);

  if (missing.length) {
    throw new Error(`Missing required config: ${missing.join(", ")}`);
  }
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    json = null;
  }

  return { response, text, json };
};

const getTestUserId = async () => {
  if (process.env.TEST_USER_ID) {
    return process.env.TEST_USER_ID;
  }

  await mongoose.connect(secret.db_url);
  const user = await User.findOne({ role: "user" }).select("_id email name").lean();
  await mongoose.disconnect();

  if (!user) {
    throw new Error("No user found in the database. Set TEST_USER_ID manually.");
  }

  return user._id.toString();
};

const cleanupOrder = async (orderId) => {
  if (!orderId) {
    return;
  }

  await mongoose.connect(secret.db_url);
  await Order.deleteOne({ _id: orderId });
  await mongoose.disconnect();
};

const main = async () => {
  ensureConfig();

  logStep(`Checking backend reachability at ${baseUrl}`);
  const rootCheck = await fetch(`${baseUrl}/`);
  const rootText = await rootCheck.text();

  if (!rootCheck.ok) {
    throw new Error(`Backend is not reachable. Expected 200 from ${baseUrl}/`);
  }

  console.log(`[PayU Test] Backend responded with: ${rootText}`);

  logStep("Creating PayU payment payload");
  const createPayload = {
    amount: 1,
    firstname: "PayU",
    lastname: "Tester",
    email: "payu.test@example.com",
    phone: "9999999999",
    productinfo: "Jewellery PayU Smoke Test",
  };

  const createResult = await fetchJson(`${baseUrl}/api/order/payu/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createPayload),
  });

  if (!createResult.response.ok || !createResult.json?.success) {
    throw new Error(`PayU create API failed: ${createResult.text}`);
  }

  const { paymentUrl, fields } = createResult.json;

  if (!paymentUrl || !fields?.hash || !fields?.txnid) {
    throw new Error("PayU create API did not return paymentUrl/hash/txnid.");
  }

  console.log(`[PayU Test] PayU payment URL: ${paymentUrl}`);
  console.log(`[PayU Test] Generated txnid: ${fields.txnid}`);

  logStep("Simulating PayU success callback hash and redirect");
  const callbackPayload = {
    status: "success",
    txnid: fields.txnid,
    amount: fields.amount,
    productinfo: fields.productinfo,
    firstname: fields.firstname,
    email: fields.email,
    mihpayid: `TESTMIHPAY${Date.now()}`,
    udf1: fields.udf1 || "",
    udf2: fields.udf2 || "",
    udf3: fields.udf3 || "",
    udf4: fields.udf4 || "",
    udf5: fields.udf5 || "",
    udf6: fields.udf6 || "",
    udf7: fields.udf7 || "",
    udf8: fields.udf8 || "",
    udf9: fields.udf9 || "",
    udf10: fields.udf10 || "",
  };
  callbackPayload.hash = getPayUResponseHash(callbackPayload);

  const callbackResult = await fetch(`${baseUrl}/api/order/payu/response`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(callbackPayload),
    redirect: "manual",
  });

  const redirectUrl = callbackResult.headers.get("location") || "";

  if (callbackResult.status !== 302) {
    throw new Error(`PayU callback did not redirect as expected. Status: ${callbackResult.status}`);
  }

  if (!redirectUrl.includes("/payu/response?status=success")) {
    throw new Error(`Unexpected PayU redirect URL: ${redirectUrl}`);
  }

  console.log(`[PayU Test] PayU callback redirect: ${redirectUrl}`);
  console.log("[PayU Test] Backend PayU request and callback routes are working.");

  logStep("Testing order acceptance with a real API order save");
  const testUserId = await getTestUserId();
  const testOrderPayload = {
    user: testUserId,
    name: "PayU Smoke Tester",
    email: "payu.test@example.com",
    address: "Test Address",
    contact: "9999999999",
    city: "Jaipur",
    country: "India",
    zipCode: "302001",
    shippingOption: "free",
    status: "Pending",
    cart: [
      {
        _id: "payu-smoke-test-item",
        title: "Smoke Test Product",
        price: 1,
        orderQuantity: 1,
      },
    ],
    paymentMethod: "PayU",
    subTotal: 1,
    shippingCost: 0,
    discount: 0,
    totalAmount: 1,
    orderNote: "Temporary PayU smoke test order. Safe to remove.",
    payuTxnId: fields.txnid,
    payuResponse: {
      status: "success",
      txnid: fields.txnid,
      mihpayid: callbackPayload.mihpayid,
      amount: fields.amount,
      productinfo: fields.productinfo,
      firstname: fields.firstname,
      email: fields.email,
      message: "Smoke test success",
    },
  };

  const saveResult = await fetchJson(`${baseUrl}/api/order/saveOrder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(testOrderPayload),
  });

  if (!saveResult.response.ok || !saveResult.json?.success || !saveResult.json?.order?._id) {
    throw new Error(`Order save API failed: ${saveResult.text}`);
  }

  const createdOrderId = saveResult.json.order._id;
  console.log(`[PayU Test] Test order created successfully: ${createdOrderId}`);

  await cleanupOrder(createdOrderId);
  console.log(`[PayU Test] Test order cleaned up successfully: ${createdOrderId}`);

  console.log("\n[PayU Test] PASS: PayU create API, callback redirect, and order acceptance are all working.");
};

main()
  .catch(async (error) => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch (disconnectError) {
      // Ignore disconnect cleanup errors.
    }

    fail(error.message);
  });
