/**
 * Stable formatting utilities to prevent Next.js hydration mismatches
 */

export const formatCurrencyIDR = (amount: number) => {
  // Use a stable, hardcoded local for server/client consistency
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDateFullID = (dateString?: string | Date | null) => {
  if (!dateString) return "No Date";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "Invalid Date";
  
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const formatTimeID = (dateString?: string | Date | null) => {
  if (!dateString) return "";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "";
  
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
