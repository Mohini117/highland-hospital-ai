"use client";
import InteractiveSignInButton from "./interactive-sign-in-button";

interface MobileUserMenuProps {
  onMobileActionComplete?: () => void;
}

export default function MobileUserSignOrAvatar({
  onMobileActionComplete,
}: MobileUserMenuProps) {
  return <InteractiveSignInButton onNavigateStart={onMobileActionComplete} />;
}
