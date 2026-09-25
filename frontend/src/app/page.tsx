"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/kits" : "/login");
  }, [user, loading, router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-ink-soft">Loading...</p>
    </div>
  );
}