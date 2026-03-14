"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Footer from "@/components/Footer";

function ConfirmacionContent() {
  const searchParams = useSearchParams();
  const nombre = searchParams.get("nombre");
  const turnos: string[] = [];
  if (searchParams.get("vc")) turnos.push("Viernes Comida");
  if (searchParams.get("vn")) turnos.push("Viernes Cena");
  if (searchParams.get("sc")) turnos.push("Sábado Comida");
  if (searchParams.get("sn")) turnos.push("Sábado Cena");

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto px-6">
      <div className="flex-1 flex flex-col items-center justify-center">
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
          {nombre && (
            <p className="text-[#6B7B3A] text-sm font-medium mt-1">
              {nombre}
            </p>
          )}
          <p className="text-[#777] text-sm mt-2">
            Gracias por tu colaboración
          </p>
        </div>

        {turnos.length > 0 && (
          <div className="animate-fade-in-up animate-delay-200 mt-6 w-full">
            <p className="text-xs text-[#777] uppercase tracking-wide text-center mb-2">
              Turnos registrados
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {turnos.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1.5 bg-[#E8EBD8] text-[#6B7B3A] text-sm font-medium rounded-xl"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="animate-fade-in-up animate-delay-200 mt-10 w-full flex flex-col gap-3">
          <a
            href="/"
            className="block w-full py-4 bg-[#6B7B3A] text-white text-center rounded-2xl text-base font-medium
              shadow-lg shadow-[#6B7B3A]/20 hover:bg-[#5A6A2F] active:scale-[0.98]
              transition-all duration-200"
          >
            Cerrar
          </a>
          <a
            href="/consulta"
            className="block w-full py-3 text-[#6B7B3A] text-center rounded-2xl text-sm font-medium
              border border-[#6B7B3A]/30 hover:bg-[#E8EBD8]
              active:scale-[0.98] transition-all duration-200"
          >
            Consultar mis asignaciones
          </a>
        </div>
      </div>

      <div className="animate-fade-in-up animate-delay-300">
        <Footer />
      </div>
    </div>
  );
}

export default function Confirmacion() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-[#aaa]">Cargando...</p>
        </div>
      }
    >
      <ConfirmacionContent />
    </Suspense>
  );
}
