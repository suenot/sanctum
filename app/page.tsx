"use client";

import { useVaultStore } from "@/store/vault-store";
import { LoginScreen } from "@/components/auth/login-screen";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";

export default function Home() {
  const status = useVaultStore((s) => s.status);

  if (status === "unlocked") {
    return <WorkspaceLayout />;
  }

  return <LoginScreen />;
}
