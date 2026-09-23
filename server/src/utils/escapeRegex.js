// Escapes user input before it is used inside a MongoDB $regex query,
// so characters like "(" or "*" are matched literally instead of crashing the query.
const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default escapeRegex;
