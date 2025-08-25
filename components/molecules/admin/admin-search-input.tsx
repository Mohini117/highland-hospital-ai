"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";

interface AdminSearchInputProps {
  initialQuery?: string;
  placeholder?: string;
}

export function AdminSearchInput({
  initialQuery = "",
  placeholder = "Search Patient, Doctor...",
}: AdminSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 750);

  const updateUrl = useCallback(
    (newQuery: string) => {
      // Create a mutable copy of the current search params
      const current = new URLSearchParams(Array.from(searchParams.entries()));

      if (newQuery) {
        current.set("search", newQuery);
      } else {
        current.delete("search");
      }

      // Always reset to the first page on a new search
      current.delete("page");

      // All other params (like date ranges) are already preserved.
      const url = `${pathname}?${current.toString()}`;
      router.push(url, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Effect to trigger URL update when debounced query changes
  useEffect(() => {
    // Only update if the debounced query is different from the current URL param
    const currentSearchParam = searchParams.get("search") || "";
    if (debouncedQuery !== currentSearchParam) {
      updateUrl(debouncedQuery);
    }
  }, [debouncedQuery, searchParams, updateUrl]);

  // Effect to reset local state if initialQuery (from URL) changes externally
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  return (
    <div className="relative w-full max-w-sm px-4 py-2">
      <Input
        type="search"
        placeholder={placeholder}
        className="w-full py-2 border rounded-lg text-text-caption-1 text-xs md:text-sm font-normal"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </div>
  );
}
