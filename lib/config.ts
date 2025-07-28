import { redirect } from "next/navigation";

export function getAppTimeZone(): string {
  const defaultTimeZone = "Asia/Kolkata";
  return process.env.APP_TIMEZONE || defaultTimeZone;
}

export const redirectToErrorPage = (
  errorType: string,
  errorMessage: string
) => {
  const searchParams = new URLSearchParams({
    error: errorType,
    message: encodeURIComponent(errorMessage),
  });
  // Redirect to the root path with error info
  redirect(`/?${searchParams.toString()}`);
};
