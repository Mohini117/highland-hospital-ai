// components/Header.tsx
import Link from "next/link";
import Image from "next/image";
import { APP_NAME } from "@/lib/constants/index";
import MenuClient from "@/components/molecules/menu-client";
import SigninOrAvatar from "../molecules/signin-avatar";
import { auth } from "@/auth";

const Header = async () => {
  const session = await auth();
  return (
    <header className="bg-background-2 w-full sticky top-0 z-50">
      <div className="max-w-[1440px] h-[65px] mx-auto px-6 md:px-8 flex items-center justify-between">
        {/* Left Section: Logo and Brand Name */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-3">
            <Image
              priority={true}
              src="/images/Logo.svg"
              width={32}
              height={32}
              alt={`${APP_NAME}logo`}
            />
            <h3 className="hidden lg:block">{APP_NAME}</h3>
          </Link>
        </div>
        {/* Right Section: Navigation Links */}
        <div>
          <MenuClient desktopAvatar={<SigninOrAvatar />} session={session} />
        </div>
      </div>
    </header>
  );
};

export default Header;
