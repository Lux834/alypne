import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="Alypne home">
      <Image src="/alypne-logo.png" width={25} height={25} alt="" priority />
      {!compact && <span className="brand-name">alypne</span>}
    </Link>
  );
}
