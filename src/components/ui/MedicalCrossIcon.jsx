/**
 * Medical cross (+) icon — bold plus sign for healthcare branding
 */
export function MedicalCrossIcon({ size = 24, color = '#10b981', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      {/* Chunky medical cross — vertical + horizontal bars */}
      <rect x="9" y="0" width="6" height="24" rx="1" fill={color} />
      <rect x="0" y="9" width="24" height="6" rx="1" fill={color} />
    </svg>
  );
}
