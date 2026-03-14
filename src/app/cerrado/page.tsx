import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Cerrado() {
  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto px-6">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="animate-fade-in-up">
          <Header />
        </div>

        <div className="animate-fade-in-up animate-delay-100 mt-8 text-center px-4">
          {/* Clock icon */}
          <div className="w-16 h-16 rounded-full bg-[#E8EBD8] flex items-center justify-center mx-auto mb-5">
            <svg
              className="w-8 h-8 text-[#6B7B3A]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <p className="text-[#555] text-base leading-relaxed">
            El plazo de inscripción para esta semana ha finalizado.
          </p>
          <p className="text-[#999] text-sm mt-3">
            Vuelve a intentarlo cuando se abra el próximo ciclo.
          </p>
        </div>
      </div>

      <div className="animate-fade-in-up animate-delay-200">
        <Footer />
      </div>
    </div>
  );
}
