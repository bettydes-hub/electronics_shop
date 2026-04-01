"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getShopContact, phoneToTelHref, type ShopContact } from "@/lib/shop-contact";

function IconTikTok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 7.2c-2.65 0-4.8 2.15-4.8 4.8s2.15 4.8 4.8 4.8 4.8-2.15 4.8-4.8-2.15-4.8-4.8-4.8zm0 7.9c-1.71 0-3.1-1.39-3.1-3.1S10.29 8.9 12 8.9s3.1 1.39 3.1 3.1-1.39 3.1-3.1 3.1zm5-8.3c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zM7.2 3h9.6A4.2 4.2 0 0121 7.2v9.6A4.2 4.2 0 0116.8 21H7.2A4.2 4.2 0 013 16.8V7.2A4.2 4.2 0 017.2 3z" />
    </svg>
  );
}

function IconTelegram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export function ShopCustomerFooter() {
  const [c, setC] = useState<ShopContact>(() => getShopContact());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/shop-settings");
        const data = await res.json();
        if (cancelled || !data || data.error || typeof data.storeName !== "string") return;
        setC({
          storeName: data.storeName,
          address: typeof data.address === "string" ? data.address : "",
          phone: typeof data.phone === "string" ? data.phone : "",
          tiktokUrl: typeof data.tiktokUrl === "string" ? data.tiktokUrl : "",
          instagramUrl: typeof data.instagramUrl === "string" ? data.instagramUrl : "",
          telegramUrl: typeof data.telegramUrl === "string" ? data.telegramUrl : "",
        });
      } catch {
        /* keep env defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addressLines = c.address.split("\n").filter(Boolean);

  return (
    <footer className="relative z-20 mt-auto border-t border-white/15 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-fuchsia-300/90">Visit us</h3>
            <p className="mt-3 font-semibold text-white">{c.storeName}</p>
            <address className="mt-2 not-italic text-sm leading-relaxed text-slate-300">
              {addressLines.length > 0 ? (
                addressLines.map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))
              ) : (
                <span className="block text-slate-500">Address can be set in Admin → Store &amp; footer.</span>
              )}
            </address>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-fuchsia-300/90">Contact</h3>
            {c.phone ? (
              <p className="mt-3">
                <span className="text-slate-400">Phone: </span>
                <a
                  href={phoneToTelHref(c.phone)}
                  className="font-medium text-white underline-offset-2 transition hover:text-fuchsia-200 hover:underline"
                >
                  {c.phone}
                </a>
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Phone not set — add it in Admin → Store &amp; footer (or NEXT_PUBLIC_SHOP_PHONE in .env).
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-fuchsia-300/90">Social</h3>
            <ul className="mt-3 flex flex-wrap gap-3">
              {c.tiktokUrl ? (
                <li>
                  <Link
                    href={c.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:border-fuchsia-400/50 hover:bg-white/10"
                    aria-label="TikTok"
                  >
                    <IconTikTok className="h-5 w-5" />
                  </Link>
                </li>
              ) : null}
              {c.instagramUrl ? (
                <li>
                  <Link
                    href={c.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:border-fuchsia-400/50 hover:bg-white/10"
                    aria-label="Instagram"
                  >
                    <IconInstagram className="h-5 w-5" />
                  </Link>
                </li>
              ) : null}
              {c.telegramUrl ? (
                <li>
                  <Link
                    href={c.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:border-fuchsia-400/50 hover:bg-white/10"
                    aria-label="Telegram"
                  >
                    <IconTelegram className="h-5 w-5" />
                  </Link>
                </li>
              ) : null}
              {!c.tiktokUrl && !c.instagramUrl && !c.telegramUrl ? (
                <li className="text-sm text-slate-500">
                  Social links can be set in Admin → Store &amp; footer (or NEXT_PUBLIC_SHOP_*_URL in .env).
                </li>
              ) : null}
            </ul>
          </div>
        </div>
        <p className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {c.storeName}
        </p>
      </div>
    </footer>
  );
}
