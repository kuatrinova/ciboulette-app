/* eslint-disable @next/next/no-img-element */
export default function Header() {
  return (
    <header className="flex flex-col items-center pt-10 pb-4">
      <img
        src="/images/logo-ciboulette.png"
        alt="Ciboulette Catering"
        width={400}
        height={130}
        className="object-contain"
      />
    </header>
  );
}
