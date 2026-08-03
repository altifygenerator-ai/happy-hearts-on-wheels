import Image from "next/image";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={compact ? "brand-mark brand-mark-compact" : "brand-mark"}
      aria-hidden="true"
    >
      <Image
        src="/images/happy-hearts-header-mark.webp"
        alt=""
        width={512}
        height={512}
        className="brand-mark-image"
        priority={!compact}
      />
    </span>
  );
}
