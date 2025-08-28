import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LucideIcon, icons, HelpCircle } from "lucide-react";
import * as LucideIcons from "lucide-react"; // Import all icons

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getIconComponent(iconName: string): LucideIcon {
  console.log("Looking for icon with name:", `|${iconName}|`);
  if (!iconName) {
    return HelpCircle; // Default fallback icon if no iconName is provided
  }

  const IconComponent = icons[iconName as keyof typeof icons];

  if (IconComponent) {
    return IconComponent;
  }

  console.warn(`Icon "${iconName}" not found. Falling back to default icon.`);
  return HelpCircle; // Default fallback icon
}

export function formatBookingId(uuid: string): string {
  // const datePart = format(new Date(), "yyyyMMdd");
  const seqPart = uuid.slice(-8).toUpperCase();
  return `HH-${seqPart}`;
}

export function getAvailableIconNames(): (keyof typeof LucideIcons)[] {
  // 1. Define your whitelist directly.
  // By typing the array, TypeScript will error-check each string for you.
  const whitelist: (keyof typeof LucideIcons)[] = [
    "Heart",
    "Brain",
    "Eye",
    "Stethoscope",
    "Thermometer",
    "Activity",
    "Scissors",
    "Bone",
    "Baby",
    "Pill",
    "Syringe",
    "Bandage",
    "Microscope",
    "ClipboardList",
    "Users",
    "FlaskConical",
    "Dna",
    "Ear",
    "PersonStanding",
  ];

  // 2. Return the sorted list. The sort is optional but good for consistency.
  return whitelist.sort();
}
