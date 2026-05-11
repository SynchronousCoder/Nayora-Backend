const crypto = require("crypto");
const { secret } = require("../config/secret");
const stripe = require("stripe")(secret.stripe_key);
const Order = require("../model/Order");

const MIN_COD_ORDER_AMOUNT = 1000;
const COD_ADVANCE_THRESHOLD = 10000;
const COD_ADVANCE_AMOUNT = 1000;

const getPayUBaseUrl = () => {
  if (secret.payu_base_url) {
    return secret.payu_base_url.replace(/\/$/, "");
  }

  if (secret.payu_mode === "production") {
    return "https://secure.payu.in";
  }

  return "https://test.payu.in";
};

const getFrontendCallbackUrl = () => {
  const baseUrl = (secret.client_url || "http://localhost:3000").replace(/\/$/, "");
  return `${baseUrl}/payu/response`;
};

const getBackendCallbackUrl = () => {
  const baseUrl = (secret.backend_url || "http://localhost:7000").replace(/\/$/, "");
  return `${baseUrl}/api/order/payu/response`;
};

const getHash = (fields) => {
  return crypto.createHash("sha512").update(fields.join("|")).digest("hex");
};

const getPayURequestHash = (payload) => {
  const udfFields = ["udf1", "udf2", "udf3", "udf4", "udf5", "udf6", "udf7", "udf8", "udf9", "udf10"];
  return getHash([
    secret.payu_key,
    payload.txnid,
    payload.amount,
    payload.productinfo,
    payload.firstname,
    payload.email,
    ...udfFields.map((field) => payload[field] || ""),
    secret.payu_salt,
  ]);
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
    return getHash([
      payload.additionalCharges,
      ...responseHashParts,
    ]);
  }

  return getHash(responseHashParts);
};

// create-payment-intent
exports.paymentIntent = async (req, res, next) => {
  try {
    const product = req.body;
    const price = Number(product.price);
    const amount = price * 100;
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      currency: "usd",
      amount: amount,
      payment_method_types: ["card"],
    });
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.log(error);
    next(error)
  }
};

exports.createPayUPayment = async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || Number.isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "A valid amount is required for PayU payment.",
      });
    }

    const txnid = req.body.txnid || crypto.randomUUID().replace(/-/g, "");
    const payload = {
      key: secret.payu_key,
      txnid,
      amount: amount.toFixed(2),
      productinfo: req.body.productinfo || "Jewellery Order",
      firstname: req.body.firstname || req.body.name || "Customer",
      lastname: req.body.lastname || "",
      email: req.body.email || "",
      phone: req.body.phone || "",
      surl: req.body.surl || getBackendCallbackUrl(),
      furl: req.body.furl || getBackendCallbackUrl(),
      udf1: req.body.udf1 || "",
      udf2: req.body.udf2 || "",
      udf3: req.body.udf3 || "",
      udf4: req.body.udf4 || "",
      udf5: req.body.udf5 || "",
      udf6: req.body.udf6 || "",
      udf7: req.body.udf7 || "",
      udf8: req.body.udf8 || "",
      udf9: req.body.udf9 || "",
      udf10: req.body.udf10 || "",
    };

    const hash = getPayURequestHash(payload);

    res.status(200).json({
      success: true,
      paymentUrl: `${getPayUBaseUrl()}/_payment`,
      fields: {
        ...payload,
        hash,
      },
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.handlePayUResponse = async (req, res, next) => {
  try {
    const response = req.body || {};
    const receivedHash = response.hash || "";
    const expectedHash = getPayUResponseHash(response);
    const frontendUrl = (secret.client_url || "http://localhost:3000").replace(/\/$/, "");

    if (!receivedHash || receivedHash !== expectedHash) {
      const redirectUrl = new URL("/payu/response", frontendUrl);
      redirectUrl.searchParams.set("status", "failure");
      redirectUrl.searchParams.set("message", "Invalid payment signature");
      return res.redirect(302, redirectUrl.toString());
    }

    const redirectUrl = new URL("/payu/response", frontendUrl);
    redirectUrl.searchParams.set("status", (response.status || "failure").toLowerCase());
    redirectUrl.searchParams.set("txnid", response.txnid || "");
    redirectUrl.searchParams.set("mihpayid", response.mihpayid || "");
    redirectUrl.searchParams.set("amount", response.amount || "");
    redirectUrl.searchParams.set("productinfo", response.productinfo || "");
    redirectUrl.searchParams.set("firstname", response.firstname || "");
    redirectUrl.searchParams.set("email", response.email || "");
    redirectUrl.searchParams.set("message", response.error_Message || response.field9 || response.message || "");

    return res.redirect(302, redirectUrl.toString());
  } catch (error) {
    console.log(error);
    next(error);
  }
};
// addOrder
exports.addOrder = async (req, res, next) => {
  try {
    const { user, _id, invoice, ...payload } = req.body || {};
    const totalAmount = Number(payload.totalAmount);
    const normalizedPaymentMethod = String(payload.paymentMethod || "").toUpperCase();
    const defaultAmountPaid =
      normalizedPaymentMethod === "PAYU" ? totalAmount : 0;
    const requestedAmountPaid = Number(
      payload.amountPaid ?? defaultAmountPaid
    );
    const safeAmountPaid = Number.isFinite(requestedAmountPaid)
      ? requestedAmountPaid
      : defaultAmountPaid;
    const amountPaid = Number(safeAmountPaid.toFixed(2));
    const amountDue = Number(Math.max(totalAmount - amountPaid, 0).toFixed(2));
    let paymentStatus = payload.paymentStatus;

    if (normalizedPaymentMethod === "COD" && totalAmount < MIN_COD_ORDER_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Cash on Delivery is available only for orders of ${MIN_COD_ORDER_AMOUNT} or more.`,
      });
    }

    if (
      normalizedPaymentMethod === "COD" &&
      totalAmount >= COD_ADVANCE_THRESHOLD &&
      amountPaid < COD_ADVANCE_AMOUNT
    ) {
      return res.status(400).json({
        success: false,
        message: `A minimum advance payment of ${COD_ADVANCE_AMOUNT} is required for Cash on Delivery orders of ${COD_ADVANCE_THRESHOLD} or more.`,
      });
    }

    if (!paymentStatus) {
      paymentStatus = amountDue > 0 ? "partially_paid" : amountPaid > 0 ? "paid" : "pending";
    }

    const orderItems = await Order.create({
      ...payload,
      user: req.user._id,
      status: String(payload.status || "pending").toLowerCase(),
      amountPaid,
      amountDue,
      paymentStatus,
    });

    res.status(200).json({
      success: true,
      message: "Order added successfully",
      order: orderItems,
    });
  }
  catch (error) {
    console.log(error);
    next(error)
  }
};
// get Orders
exports.getOrders = async (req, res, next) => {
  try {
    const orderItems = await Order.find({}).populate('user');
    res.status(200).json({
      success: true,
      data: orderItems,
    });
  }
  catch (error) {
    console.log(error);
    next(error)
  }
};
// get Orders
exports.getSingleOrder = async (req, res, next) => {
  try {
    const orderItem = await Order.findById(req.params.id).populate('user');
    res.status(200).json(orderItem);
  }
  catch (error) {
    console.log(error);
    next(error)
  }
};

exports.updateOrderStatus = async (req, res) => {
  const newStatus = req.body.status;
  try {
    await Order.updateOne(
      {
        _id: req.params.id,
      },
      {
        $set: {
          status: newStatus,
        },
      }, { new: true })
    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
    });
  }
  catch (error) {
    console.log(error);
    next(error)
  }
};
