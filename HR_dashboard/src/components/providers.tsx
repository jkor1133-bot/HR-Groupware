"use client";

import { CurrentUserProvider } from "@/hooks/use-current-user";
import { HomeLayoutProvider } from "@/hooks/use-home-layout";
import { MembersProvider } from "@/hooks/use-members";
import { ViewPrefsProvider } from "@/hooks/use-view-prefs";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ViewPrefsProvider>
      <MembersProvider>
        <CurrentUserProvider>
          <HomeLayoutProvider>{children}</HomeLayoutProvider>
        </CurrentUserProvider>
      </MembersProvider>
    </ViewPrefsProvider>
  );
}
