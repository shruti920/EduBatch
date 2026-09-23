// console.assert only prints and lets the script exit 0, so a broken assertion
// never failed `npm test`. check() throws, which fails the suite.
export const check = (condition, message) => {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
};
