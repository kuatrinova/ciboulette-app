import Image from "next/image";

export default function Header() {
  return (
    <header className="flex flex-col items-center pt-10 pb-4">
      <Image
        src="/images/logo-ciboulette.jpg"
        alt="Ciboulette Catering"
        width={220}
        height={80}
        priority
        className="object-contain"
      />
    </header>
  );
}
