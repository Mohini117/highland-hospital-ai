"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react"; // A common icon for loading spinners

interface ViewProfileButtonProps {
  doctorId: string;
}

export default function ViewProfileButton({
  doctorId,
}: ViewProfileButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleNavigate = () => {
    startTransition(() => {
      router.push(`/doctors/${doctorId}`);
    });
  };

  return (
    <Button
      onClick={handleNavigate}
      disabled={isPending}
      className="w-full h-9 md:h-10 text-text-caption-2"
      variant="brand"
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        "View Profile"
      )}
    </Button>
  );
}
