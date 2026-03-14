/* eslint-disable @next/next/no-img-element */
export default function Footer() {
  return (
    <footer className="flex flex-col items-center gap-1 pb-6 pt-8">
      <div className="flex items-center gap-2">
        <img
          src="/images/logo-kuatrinova.png"
          alt="KUATRINOVA Studio IA"
          width={160}
          height={78}
          className="object-contain"
        />
      </div>
    </footer>
  );
}
