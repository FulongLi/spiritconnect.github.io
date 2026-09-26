import { assetPath } from "@/components/shared/assetPath";
import { BRAND } from "@/content/site";

type Props = {
  /** height in px; the width follows the mark's proportions */
  size?: number;
  className?: string;
};

/**
 * The Spirit Connect mark (BRAND.logo), drawn in `currentColor` via a CSS
 * mask so the single black source file works on light and dark surfaces.
 */
export default function BrandMark({ size = 16, className }: Props) {
  const mask = `url(${assetPath(BRAND.logo)}) center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "inline-block",
        flex: "none",
        width: size * BRAND.aspect,
        height: size,
        backgroundColor: "currentColor",
        mask,
        WebkitMask: mask,
      }}
    />
  );
}
