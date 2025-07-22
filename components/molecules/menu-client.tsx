"use client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/molecules/theme-toggle";
import { EllipsisVertical } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import MobileUserSignOrAvatar from "@/components/molecules/mobile-user-signinoravatar";
import { Session } from "next-auth";

interface MenuClientProps {
  desktopAvatar: React.ReactNode;
  session: Session | null;
}

export default function MenuClient({
  desktopAvatar,
  session,
}: MenuClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSheetCloseAutoFocus = (event: Event) => {
    event.preventDefault();
  };

  return (
    <div>
      {/* Desktop & Tablet Nav */}
      <nav className="hidden items-center gap-3 md:flex">
        <ThemeToggle />

        <Link
          href="/"
          className="body-regular text-text-body hover:text-primary"
        >
          Home
        </Link>

        {/* Book Appointment Button */}
        <Button asChild variant="brand" size="lg">
          <Link href="/#our-doctors" className="text-text-caption-2">
            Book Appointment
          </Link>
        </Button>

        {/* Sign In Button */}
        {desktopAvatar}
      </nav>
      {/* Mobile Nav*/}
      <nav className="md:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger
            className="align-middle"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <EllipsisVertical />
          </SheetTrigger>
          <SheetContent
            side="right"
            className="flex flex-col items-start p-4 bg-background-2"
            onCloseAutoFocus={handleSheetCloseAutoFocus}
          >
            <SheetHeader className="w-full justify-start flex flex-row items-center border-b">
              <SheetTitle className="text-2xl font-bold">Menu</SheetTitle>
            </SheetHeader>
            <ThemeToggle />
            <Link
              href="/"
              className="body-regular text-text-body hover:text-primary py-3"
              onClick={closeMobileMenu}
            >
              Home
            </Link>

            <Button asChild variant="brand" size="sm" className="w-full my-2">
              <Link
                href="/#our-doctors"
                onClick={closeMobileMenu}
                className="text-text-caption-2"
              >
                Book Appointment
              </Link>
            </Button>

            <SheetFooter className="w-full p-0">
              <MobileUserSignOrAvatar
                key={session?.user?.id}
                onMobileActionComplete={closeMobileMenu}
                session={session}
              />
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
