import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LucideIcon, icons, HelpCircle } from "lucide-react";

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
