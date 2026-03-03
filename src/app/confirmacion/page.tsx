import Footer from "@/components/Footer";

export default function Confirmacion() {
  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Check icon */}
        <div className="animate-fade-in-up">
          <div className="w-20 h-20 rounded-full bg-[#6B7B3A] flex items-center justify-center shadow-lg shadow-[#6B7B3A]/25">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <div className="animate-fade-in-up animate-delay-100 mt-6 text-center">
          <h2 className="text-lg font-semibold text-[#333]">
            Disponibilidad enviada correctamente
          </h2>
          <p className="text-[#777] text-sm mt-2">
            Gracias por tu colaboración
          </p>
        </div>

        <div className="animate-fade-in-up animate-delay-200 mt-10 w-full">
          <a
            href="/"
            className="block w-full py-4 bg-[#6B7B3A] text-white text-center rounded-2xl text-base font-medium
              shadow-lg shadow-[#6B7B3A]/20 hover:bg-[#5A6A2F] active:scale-[0.98]
              transition-all duration-200"
          >
            Cerrar
          </a>
        </div>
      </div>

      <div className="animate-fade-in-up animate-delay-300">
        <Footer />
      </div>
    </>
  );
}
