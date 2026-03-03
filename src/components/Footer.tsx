import Image from "next/image";

export default function Footer() {
  return (
    <footer className="flex flex-col items-center gap-1 pb-6 pt-8">
      <div className="flex items-center gap-2 opacity-60">
        <Image
          src="/images/logo-kuatrinova.png"
          alt="KUATRINOVA Studio IA"
          width={100}
          height={24}
          className="object-contain"
        />
      </div>
    </footer>
  );
}
