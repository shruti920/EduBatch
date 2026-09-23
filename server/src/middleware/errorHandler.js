// Unique-index violations, keyed by the index's fields
const DUPLICATE_MESSAGES = {
  email: "An account with this email already exists.",
  "student,batch": "This student is already enrolled in this batch.",
  "batch,date": "Attendance for this day was just saved by someone else. Reload and try again.",
  razorpayOrderId: "This payment order already exists.",
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong.";
  let errors = err.errors || null;

  // Mongo duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyPattern || err.keyValue || {}).join(",");
    message = DUPLICATE_MESSAGES[fields] || "This record already exists.";
    errors = null;
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages[0] || "Validation failed.";
    errors = messages;
  }

  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}.`;
    errors = null;
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Session expired. Please log in again.";
  }

  if (statusCode >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === "production") message = "Something went wrong.";
  }

  res.status(statusCode).json({
    success: false,
    data: null,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
