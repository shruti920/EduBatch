import api from "./axios";

// Student: start paying one pending enrollment. Returns what Razorpay Checkout needs.
export const createPaymentOrder = async (enrollmentId) =>
  (await api.post("/payments/create-order", { enrollmentId })).data.data;

// Student: send Checkout's response to the server, which checks the signature
export const verifyPayment = async (response) => (await api.post("/payments/verify", response)).data.data.payment;

// Student: record a failed/abandoned attempt (history only, never changes money state)
export const reportPaymentFailure = async (payload) => (await api.post("/payments/failure", payload)).data;

// Student (own) or admin: ask Razorpay directly whether an order was paid
export const syncPayment = async (paymentId) => (await api.post(`/payments/${paymentId}/sync`)).data;

// Student: own payments. Admin: all payments + summary. Filters: status, batch.
export const getPaymentHistory = async (params = {}) =>
  (await api.get("/payments/history", { params })).data.data;
