export function formatDate(value, options = {}) {
  if (!value) return "—";
  const date = value && typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: options.month || "short",
    day: "numeric",
    year: "numeric"
  });
}

export function formatLongDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? "—");
  const dateText = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeText = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return dateText + " at " + timeText;
}

export function statusClass(status = "") {
  return String(status).toLowerCase().replaceAll(" ", "-");
}

export function safeErrorMessage(error) {
  const code = error && error.code;
  const messages = {
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Check your internet connection and try again.",
    "permission-denied": "Your account does not have permission to perform this action."
  };
  return messages[code] || error?.message || "Something went wrong. Please try again.";
}