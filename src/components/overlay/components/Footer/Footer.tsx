import Link from "next/link";
import { COMPANY, MAIN_NAV } from "@/content/site";

type Props = {
  /** "fixed": thin bar over the immersive journey. "page": in-flow footer on content pages. */
  variant?: "fixed" | "page";
};

const year = 2026;

const Footer = ({ variant = "fixed" }: Props) => {
  if (variant === "fixed") {
    return (
      <footer className="fixed bottom-0 left-0 z-[65] w-full flex justify-center items-center px-8 py-3 border-t border-[#3a3836] bg-[#0a0a0a] font-plex text-[8px] tracking-[2.5px] text-[#f5f2ed]/30 uppercase">
        <span>
          © {year} {COMPANY.legalName}. All rights reserved.
        </span>
      </footer>
    );
  }

  return (
    <footer className="relative border-t border-white/10 bg-[#030509] px-[clamp(16px,6vw,96px)] py-10 font-[family-name:var(--font-ibm-mono)] text-[10px] uppercase tracking-[0.2em] text-[#e8f2ff]/55">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[#e8f2ff]/85 tracking-[0.26em]">SPIRIT CONNECT</div>
          <div className="mt-2 normal-case tracking-[0.12em]">{COMPANY.vision}</div>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {MAIN_NAV.map((item) => (
              <li key={item.id}>
                {item.external ? (
                  <a
                    className="hover:text-white"
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.label} ↗
                  </a>
                ) : (
                  <Link className="hover:text-white" href={item.href}>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="mt-8 text-[8px] tracking-[0.25em] text-[#e8f2ff]/35">
        © {year} {COMPANY.legalName}. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
