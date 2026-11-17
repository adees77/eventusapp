import { HOME_BY_ROLE } from "@/components/layout/nav-items";
import { readUser } from "@/lib/data/views/users";
import { routes } from "@/lib/routes";

/** Where a freshly signed-in account goes: its onboarding (the vendor form for «Я исполнитель») or its home */
export function homeAfterSignIn(userId: string | null, asVendor: boolean): string {
  const user = readUser(userId);
  if (!user || user.needsOnboarding) return asVendor ? routes.onboardingVendor : routes.onboarding;
  return HOME_BY_ROLE[user.role];
}
