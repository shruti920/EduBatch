import Razorpay from "razorpay";
import AppError from "../utils/AppError.js";

let client = null;

export const isRazorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

// Created lazily so the API still boots (and every non-payment route works) without keys
export const getRazorpay = () => {
  if (!isRazorpayConfigured()) {
    throw new AppError("Online payments aren't set up yet. Contact the institute office.", 503);
  }
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return client;
};
