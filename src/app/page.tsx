import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="animate-fade-in-up">
          <Header />
        </div>

        <div className="animate-fade-in-up animate-delay-100 mt-8 text-center">
          <p className="text-[#777] text-lg leading-relaxed">
            Confirma tu disponibilidad
            <br />
            para eventos
          </p>
        </div>

        <div className="animate-fade-in-up animate-delay-200 mt-12 w-full">
          <Link
            href="/formulario"
            className="block w-full py-4 bg-[#6B7B3A] text-white text-center rounded-2xl text-base font-medium
              shadow-lg shadow-[#6B7B3A]/20 hover:bg-[#5A6A2F] active:scale-[0.98]
              transition-all duration-200"
          >
            Comenzar
          </Link>
        </div>
      </div>

      <div className="animate-fade-in-up animate-delay-300">
        <Footer />
      </div>
    </>
  );
}
