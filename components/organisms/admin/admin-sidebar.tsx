"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Stethoscope,
  CalendarCheck,
  Calendar,
  Settings,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { APP_NAME } from "@/lib/constants";

// Define navigation items
const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LineChart },
  { name: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  {
    name: "Appointment Actions",
    href: "/admin/appointments",
    icon: CalendarCheck,
  },
  { name: "All Appointments", href: "/admin/appointments/all", icon: Calendar },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams(); // Hook to get current params

  // Function to generate href, preserving 'from' and 'to'
  const generateHref = (basePath: string): string => {
    const current = new URLSearchParams();
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (from) current.set("from", from);
    if (to) current.set("to", to);

    const queryString = current.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  return (
    <div className="w-[200px] bg-primary text-text-caption-2 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-4 flex items-center h-16 flex-shrink-0">
        <div className="flex items-center justify-center mr-2">
          <Image
            priority={true}
            src="/images/Logo.svg"
            alt={`${APP_NAME} logo`}
            width={32}
            height={32}
          />
        </div>
        <div className="body-semibold text-text-caption-2">MedAdmin</div>
      </div>
      {/* Navigation */}
      <ScrollArea className="flex-1 space-y-1 overflow-y-auto pt-6">
        <nav>
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            const hrefWithParams = generateHref(item.href);

            return (
              <Link
                key={item.name}
                href={hrefWithParams}
                className={cn(
                  "flex items-center p-4  font-medium rounded-md transition-colors duration-150 ease-in-out text-white",
                  isActive
                    ? "bg-positive-3"
                    : " hover:bg-blue-700/50 hover:text-white"
                )}
              >
                <item.icon
                  className="mr-3 flex-shrink-0 h-4 w-4"
                  aria-hidden="true"
                />
                <div className="body-regular text-text-caption-2">
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}
