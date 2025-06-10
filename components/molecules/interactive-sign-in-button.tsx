"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react"; // A popular loading spinner icon
import { Button } from "@/components/ui/button";

interface InteractiveSignInButtonProps {
  onNavigateStart?: () => void;
  className?: string;
}

export default function InteractiveSignInButton({
  onNavigateStart,
  className,
}: InteractiveSignInButtonProps) {
  const [isNavigating, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    startTransition(() => {
      router.push("/sign-in");
      if (onNavigateStart) {
        onNavigateStart();
      }
    });
  };

  return (
    <Button
      variant="secondary"
      size="lg"
      onClick={handleClick}
      disabled={isNavigating}
      className={className}
    >
      {isNavigating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        "Sign in"
      )}
    </Button>
  );
}
