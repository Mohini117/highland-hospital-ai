"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { X, AlertCircle } from "lucide-react";

export default function ErrorNotification(): React.ReactNode {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    // Create a new URLSearchParams object from the current ones
    const newSearchParams = new URLSearchParams(searchParams.toString());
    // Delete the error-related keys
    newSearchParams.delete("error");
    newSearchParams.delete("message");
    // Replace the current URL with the cleaned one
    router.replace(`?${newSearchParams.toString()}`);
  }, [searchParams, router]);

  useEffect(() => {
    // Read the 'message' parameter from the URL
    const encodedMessage = searchParams.get("message");

    if (encodedMessage) {
      const message = decodeURIComponent(encodedMessage);

      // If a message exists, update the state to display the banner
      setErrorMessage(message);
      setIsVisible(true);

      // Set a timer to automatically hide the banner after 10 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 10000); // 10 seconds

      // Cleanup function: clear the timer if the component unmounts
      // or if the user dismisses the banner manually.
      return () => clearTimeout(timer);
    }
  }, [searchParams, handleDismiss]); // Rerun the effect if the URL search params change

  /**
   * Hides the banner and removes the error-related query parameters from the URL
   * without reloading the page or adding to browser history.
   */

  // If the banner is not visible, render nothing.
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl bg-background-1 text-white p-4 rounded-lg shadow-lg z-50 flex items-start justify-between border border-red-500"
      role="alert"
    >
      <div className="flex items-start gap-3 flex-grow min-w-0">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
        {/* Error Message */}
        <p className="font-medium text-sm text-text-title break-words">
          {errorMessage}
        </p>
      </div>
      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss error message"
        className="p-1 rounded-full text-text-title hover:bg-red-100 transition-colors duration-200"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
