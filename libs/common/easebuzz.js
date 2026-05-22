import crypto from "crypto";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const getEasebuzzUrl = (env) => {
  if (env === "production") {
    return "https://pay.easebuzz.in/payment/initiateLink";
  }
  return "https://testpay.easebuzz.in/payment/initiateLink";
};

const generateHash = (data, salt) => {
  // Hash formula: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
  const hashString = `${data.key}|${data.txnid}|${data.amount}|${data.productinfo}|${data.firstname}|${data.email}|${data.udf1 || ""}|${data.udf2 || ""}|${data.udf3 || ""}|${data.udf4 || ""}|${data.udf5 || ""}|${data.udf6 || ""}|${data.udf7 || ""}|${data.udf8 || ""}|${data.udf9 || ""}|${data.udf10 || ""}|${salt}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
};

const verifyHash = (data, salt) => {
  // Response hash formula: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|ke
  const hashString = `${salt}|${data.status}|${data.udf10 || ""}|${data.udf9 || ""}|${data.udf8 || ""}|${data.udf7 || ""}|${data.udf6 || ""}|${data.udf5 || ""}|${data.udf4 || ""}|${data.udf3 || ""}|${data.udf2 || ""}|${data.udf1 || ""}|${data.email}|${data.firstname}|${data.productinfo}|${data.amount}|${data.txnid}|${data.key}`;
  const generatedHash = crypto
    .createHash("sha512")
    .update(hashString)
    .digest("hex");
  return generatedHash === data.hash;
};

const initiateEasebuzzPayment = async ({
  amount,
  productinfo,
  firstname,
  email,
  phone,
  surl,
  furl,
  key = null,
  salt = null,
  env = null,
  merchantId = null,
}) => {
  try {
    const merchantKey = key || process.env.EASEBUZZ_KEY;
    const merchantSalt = salt || process.env.EASEBUZZ_SALT;
    const environment = env || process.env.EASEBUZZ_ENV || "test";

    const txnid = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const form = new URLSearchParams();
    form.append("key", merchantKey);
    form.append("txnid", txnid);

    const subMerchantId = merchantId || process.env.EASEBUZZ_SUB_MERCHANT_ID;
    if (subMerchantId) {
      form.append("sub_merchant_id", subMerchantId);
      // form.append("submerchant_id", subMerchantId);
    }

    form.append("amount", parseFloat(amount).toFixed(2));
    form.append("productinfo", productinfo);
    form.append("firstname", firstname || "User");
    form.append("phone", phone || "9999999999");
    form.append("email", email || "test@test.com");
    form.append("surl", surl || "http://localhost:3000/payment-success");
    form.append("furl", furl || "http://localhost:3000/payment-failure");

    const hashData = {
      key: merchantKey,
      txnid,
      amount: parseFloat(amount).toFixed(2),
      productinfo,
      firstname: firstname || "User",
      email: email || "test@test.com",
    };

    const hash = generateHash(hashData, merchantSalt);
    form.append("hash", hash);

    const url = getEasebuzzUrl(environment);

    const response = await axios.post(url, form.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    });

    if (response.data && response.data.status === 1) {
      return { success: true, access_key: response.data.data, txnid };
    } else {
      console.error("Easebuzz payment initiation failed:", response.data);
      return { success: false, error: response.data };
    }
  } catch (err) {
    console.error(
      "Error in Easebuzz payment initiation:",
      err.response?.data || err.message,
    );
    return { success: false, error: err.message };
  }
};

const verifyEasebuzzPayment = (paymentData, salt = null) => {
  const merchantSalt = salt || process.env.EASEBUZZ_SALT;
  console.log("paymentData------------", paymentData, merchantSalt);
  return verifyHash(paymentData, merchantSalt);
};

export { initiateEasebuzzPayment, verifyEasebuzzPayment };
