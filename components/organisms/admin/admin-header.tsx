"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LogOut, Globe, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import { signOutUser } from "@/lib/actions/user.actions";
import { format, startOfMonth, endOfMonth, isValid, parse } from "date-fns";
import { DateRange } from "react-day-picker";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

// Define defaultDateRange
const defaultDateRange: DateRange = {
  from: startOfMonth(new Date()),
  to: endOfMonth(new Date()),
};

export default function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: session, status } = useSession();

  // Local state for the date picker UI display
  const [date, setDate] = useState<DateRange | undefined>(defaultDateRange);

  useEffect(() => {
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    let targetState = defaultDateRange;

    if (fromParam && toParam) {
      try {
        const parsedFrom = parse(fromParam, "yyyy-MM-dd", new Date());
        const parsedTo = parse(toParam, "yyyy-MM-dd", new Date());
        if (isValid(parsedFrom) && isValid(parsedTo)) {
          targetState = { from: parsedFrom, to: parsedTo };
        }
      } catch (error) {
        console.error("[Header Sync Effect] Error parsing date params:", error);
      }
    }

    setDate((currentDate) => {
      const targetFromStr = targetState.from
        ? format(targetState.from, "yyyy-MM-dd")
        : null;
      const targetToStr = targetState.to
        ? format(targetState.to, "yyyy-MM-dd")
        : null;
      const currentFromStr = currentDate?.from
        ? format(currentDate.from, "yyyy-MM-dd")
        : null;
      const currentToStr = currentDate?.to
        ? format(currentDate.to, "yyyy-MM-dd")
        : null;

      if (currentFromStr !== targetFromStr || currentToStr !== targetToStr) {
        return targetState;
      } else {
        return currentDate;
      }
    });
  }, [searchParams]);

  // handleDateSelect pushes new selection to URL (user action)
  const handleDateSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);

    const current = new URLSearchParams(Array.from(searchParams.entries()));

    if (newDate?.from) current.set("from", format(newDate.from, "yyyy-MM-dd"));
    else current.delete("from");

    if (newDate?.to) current.set("to", format(newDate.to, "yyyy-MM-dd"));
    else current.delete("to");

    current.delete("page"); // Reset pagination

    const search = current.toString();

    const query = search ? `?${search}` : "";

    router.push(`${pathname}${query}`);
  };

  const adminName =
    status === "loading" ? "Loading..." : session?.user?.name ?? "Admin";

  return (
    <header className="h-16 border-b border-border-2 bg-background flex items-center justify-between px-6 flex-shrink-0">
      {/* Left side */}
      <div>
        <Button
          variant="outline"
          asChild
          className="border-border-2 px-3 py-2 gap-2 h-8 text-xs rounded-md"
        >
          <Link href="/">
            <Globe className="h-4 w-4" />
            Go to User Website
          </Link>
        </Button>
      </div>

      {/* Middle: Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            size="sm"
            className="justify-start text-left font-normal text-xs border-border-2 rounded-md"
          >
            <CalendarIcon className="mr-2 h-3 w-3" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-border-2" align="center">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <span className="body-small">{adminName}</span>
        <form action={signOutUser}>
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap border-border-2 text-xs rounded-md"
            type="submit"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </form>
      </div>
    </header>
  );
}
