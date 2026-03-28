export function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toLocaleString("zh-CN");
}

export function formatCurrency(num: number, currency = "¥"): string {
  if (num >= 10000) {
    return currency + (num / 10000).toFixed(1) + "万";
  }
  return currency + num.toLocaleString("zh-CN", { minimumFractionDigits: 0 });
}

export function formatPercent(num: number): string {
  return (num >= 0 ? "+" : "") + num.toFixed(1) + "%";
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}
