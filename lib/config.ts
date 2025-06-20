export function getAppTimeZone(): string {
  const defaultTimeZone = "Asia/Kolkata";
  return process.env.APP_TIMEZONE || defaultTimeZone;
}
