"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await signOut({
      redirect: false,
    });

    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
    >
      Logout
    </button>
  );
}
