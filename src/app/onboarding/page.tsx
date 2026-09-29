"use client";

import { Loading } from "@/components/Loading";
import { ProfileWizard } from "@/components/onboarding/ProfileWizard";
import { useAppData } from "@/lib/store";

export default function OnboardingPage() {
  const data = useAppData();
  if (!data) return <Loading />;
  const { body, style, budgets, onboarded } = data.user;
  return <ProfileWizard initial={{ body, style, budgets }} editing={onboarded} />;
}
