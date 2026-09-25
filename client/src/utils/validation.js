
export const passwordProblem = (password = "") => {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 72) return "Use at most 72 characters.";
  if (!/[A-Za-z]/.test(password)) return "Include at least one letter.";
  if (!/[0-9]/.test(password)) return "Include at least one number.";
  return "";
};

export const PASSWORD_HINT = "At least 8 characters, with a letter and a number.";

export const isEmail = (value = "") => /^\S+@\S+\.\S+$/.test(value.trim());

export const isPhone = (value = "") => !value.trim() || /^[0-9+\-\s]{7,20}$/.test(value.trim());
