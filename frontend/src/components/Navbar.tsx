"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <header className="border-b border-line bg-paper sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={user ? "/kits" : "/"} className="flex items-center gap-2">
          <span className="text-xl font-serif font-medium tracking-tight">
            Interview Prep Kit
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          {user ? (
            <>
              <Link
                href="/kits"
                className={`hover:text-periwinkle transition-colors ${
                  pathname === "/kits" ? "text-ink font-medium" : "text-ink-soft"
                }`}
              >
                Your kits
              </Link>
              <Link
                href="/kits/new"
                className="bg-amber text-ink rounded-md px-3 py-1.5 font-medium hover:bg-amber/90 transition-colors"
              >
                New kit
              </Link>
              <span className="text-ink-soft hidden sm:inline">{user.email}</span>
              <button
                onClick={() => logout()}
                className="text-ink-soft hover:text-brick transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            !isAuthPage && (
              <>
                <Link href="/login" className="text-ink-soft hover:text-ink transition-colors">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="bg-amber text-ink rounded-md px-3 py-1.5 font-medium hover:bg-amber/90 transition-colors"
                >
                  Sign up
                </Link>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  );
}