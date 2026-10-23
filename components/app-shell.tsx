"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, ArrowUpRight, Command } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { defaultExample } from "@/lib/examples";

const subscribeTheme = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("clear-theme", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("clear-theme", callback);
  };
};
const readTheme = () => {
  try {
    return localStorage.getItem("clear-theme") === "dark";
  } catch {
    return document.documentElement.dataset.theme === "dark";
  }
};

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        solscan<span className="brand-slash">/</span>
        <strong>CLEAR</strong>
      </span>
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dark = useSyncExternalStore(subscribeTheme, readTheme, () => false);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  function toggleTheme() {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("clear-theme", next ? "dark" : "light");
    } catch {
      /* The page still works when browser storage is disabled. */
    }
    window.dispatchEvent(new Event("clear-theme"));
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo-link" aria-label="Solscan CLEAR home">
            <Logo />
          </Link>
          <nav aria-label="Main navigation">
            <Link className={pathname === "/" ? "active" : ""} href="/">
              Explore
            </Link>
            <Link
              className={pathname.startsWith("/tx") ? "active" : ""}
              href={defaultExample}
            >
              Transaction MRI<span className="tiny-pill">NEW</span>
            </Link>
            <Link
              className={pathname === "/compare" ? "active" : ""}
              href="/compare"
            >
              Address compare
            </Link>
          </nav>
          <div className="header-actions">
            <span className="network-pill">
              <span className="status-dot" />
              Mainnet
            </span>
            <button
              className="icon-button"
              onClick={toggleTheme}
              aria-label={dark ? "Use light theme" : "Use dark theme"}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link
              href="/#search"
              className="header-search"
              aria-label="Go to search"
            >
              <Command size={16} />
              <span>Search</span>
            </Link>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <Logo small />
        <p>See what happened. Understand why. Verify everything.</p>
        <a href="https://solscan.io" target="_blank" rel="noreferrer">
          A Solscan redesign concept <ArrowUpRight size={13} />
        </a>
      </footer>
    </>
  );
}
