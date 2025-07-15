"use client";
import InteractiveSignInButton from "./interactive-sign-in-button";
import { Session } from "next-auth";
import { signOutUser } from "@/lib/actions/user.actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

interface MobileUserMenuProps {
  onMobileActionComplete?: () => void;
  session: Session | null;
}

export default function MobileUserSignOrAvatar({
  onMobileActionComplete,
  session,
}: MobileUserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: sessionData } = useSession();

  if (!session?.user) {
    return <InteractiveSignInButton onNavigateStart={onMobileActionComplete} />;
  }

  session = sessionData || session;

  const { name, image, email, role } = session.user;
  const userName = name ?? "User";
  const firstInitial = userName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setIsOpen(false);
    if (onMobileActionComplete) {
      onMobileActionComplete();
    }
    await signOutUser();
  };

  const handleDialogAction = () => {
    setIsOpen(false);
    if (onMobileActionComplete) {
      onMobileActionComplete();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-3 cursor-pointer justify-start p-0"
        >
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600">
            {image ? (
              <Image
                src={image} // Provide a fallback avatar
                alt={userName}
                fill
                className="rounded-full object-cover"
                unoptimized
              />
            ) : (
              firstInitial
            )}
          </div>
          <span className="font-medium">{userName}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-col items-center text-center">
          <DialogTitle>{userName}</DialogTitle>
          <p className="text-sm text-muted-foreground">{email}</p>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          {role === "PATIENT" && (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleDialogAction}
              asChild
            >
              <Link href="/user/profile">User Profile</Link>
            </Button>
          )}

          {role === "ADMIN" && (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleDialogAction}
              asChild
            >
              <Link href="/admin/dashboard">Admin Dashboard</Link>
            </Button>
          )}
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full justify-start cursor-pointer border border-border"
          >
            Sign Out
          </Button>
        </div>
        <DialogFooter className="justify-end flex-col sm:flex-row gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="w-full">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
