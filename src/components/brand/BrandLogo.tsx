import Image from "next/image";

/** Minimal NoShow Control concept 05 lockup: scalable mark + stacked wordmark. */
export function BrandLogo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <span className={`ns-identity${inverse ? " ns-identity-inverse" : ""}${compact ? " ns-identity-compact" : ""}`}>
      <Image className="ns-identity-symbol" src="/noshow-symbol.svg" alt="" aria-hidden="true" width={40} height={40} priority />
      <span className="ns-identity-words">
        <strong>NoShow</strong>
        <span>Control</span>
      </span>
    </span>
  );
}
