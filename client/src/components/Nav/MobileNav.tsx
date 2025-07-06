import React from 'react';
import type { Dispatch, SetStateAction } from 'react';

export default function MobileNav({
  setNavVisible,
}: {
  setNavVisible: Dispatch<SetStateAction<boolean>>;
}) {
  // Mobile navigation is now handled by the main Header component
  // Return null to hide this component on mobile
  return null;
}