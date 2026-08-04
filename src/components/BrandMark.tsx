export function BrandMark() {
  return (
    <div className="brand-mark">
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#0D7377" />
        <path
          d="M18 40 L32 16 L46 40"
          stroke="#F5F7F8"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="44" r="3.5" fill="#F5A524" />
      </svg>
      <div className="brand-text">
        <span className="brand-name">Aether</span>
        <span className="brand-tag">US VM quoting, Pricing Calculator accurate</span>
      </div>
    </div>
  )
}
