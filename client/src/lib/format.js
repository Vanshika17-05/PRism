export function timeAgo(value) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const ranges = [
    [31536000, "year"],
    [2592000, "month"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [size, unit] of ranges)
    if (Math.abs(seconds) >= size)
      return formatter.format(Math.round(seconds / size), unit);
  return formatter.format(seconds, "second");
}
export const number = (value) => new Intl.NumberFormat().format(value || 0);
