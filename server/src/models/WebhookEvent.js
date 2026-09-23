import mongoose from "mongoose";

// Razorpay can deliver the same webhook more than once. Each x-razorpay-event-id
// is stored once; a duplicate insert tells us the event was already handled.
const webhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  event: { type: String, required: true },
  // Kept for 30 days, then removed automatically (TTL index)
  receivedAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
});

const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);

export default WebhookEvent;
