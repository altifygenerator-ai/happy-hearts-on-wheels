export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "brand-mark brand-mark-compact" : "brand-mark"} aria-hidden="true">
      <svg viewBox="0 0 120 120" role="img">
        <circle cx="60" cy="60" r="54" className="brand-mark-sun" />
        <path
          className="brand-mark-heart"
          d="M60 84C46 71 31 61 31 45c0-10 7-18 18-18 6 0 11 3 15 8 4-5 9-8 15-8 11 0 18 8 18 18 0 16-15 26-37 39Z"
        />
        <path
          className="brand-mark-wave"
          d="M19 78c13-9 25-9 37 0 12 9 24 9 45-2v17c-15 8-30 8-43-1-13-9-25-9-39 0Z"
        />
        <path className="brand-mark-shine" d="M25 31c8-10 17-16 28-18" />
      </svg>
    </span>
  );
}
