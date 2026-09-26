
export const REQUIRED_ATTENDANCE = 75;


export const attendanceNote = (attended, total) => {
  if (!total) return "No classes recorded yet";
  const needed = 3 * total - 4 * attended;
  if (needed > 0) {
    return `Below the ${REQUIRED_ATTENDANCE}% required. Attend the next ${needed} ${needed === 1 ? "class" : "classes"} to catch up.`;
  }
  return `${attended} of ${total} classes. ${REQUIRED_ATTENDANCE}% is required.`;
};
