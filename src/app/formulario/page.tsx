"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function DayCard({
  day,
  comidaSelected,
  cenaSelected,
  onToggleComida,
  onToggleCena,
}: {
  day: string;
  comidaSelected: boolean;
  cenaSelected: boolean;
  onToggleComida: () => void;
  onToggleCena: () => void;
}) {
  const anySelected = comidaSelected || cenaSelected;

  return (
    <div
      className={`
        rounded-2xl overflow-hidden transition-all duration-300
        ${anySelected ? "shadow-lg shadow-[#6B7B3A]/15" : "shadow-sm"}
      `}
    >
      {/* Cabecera del dia */}
      <div
        className={`
          px-5 py-3 transition-all duration-300
          ${anySelected ? "bg-[#6B7B3A]" : "bg-[#E8EBD8]"}
        `}
      >
        <h3
          className={`
            text-lg font-bold tracking-wide
            ${anySelected ? "text-white" : "text-[#6B7B3A]"}
          `}
        >
          {day}
        </h3>
      </div>

      {/* Opciones de turno */}
      <div className="bg-white px-4 py-4 flex gap-3">
        <button
          type="button"
          onClick={onToggleComida}
          className={`
            flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl
            transition-all duration-200 text-center
            ${
              comidaSelected
                ? "bg-[#6B7B3A] text-white shadow-md scale-[1.02]"
                : "bg-[#f5f5f0] text-[#888] hover:bg-[#eeeee8]"
            }
          `}
        >
          <span className="text-2xl">{comidaSelected ? "🍽" : "🍽"}</span>
          <span className="text-sm font-semibold">Comida</span>
        </button>

        <button
          type="button"
          onClick={onToggleCena}
          className={`
            flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl
            transition-all duration-200 text-center
            ${
              cenaSelected
                ? "bg-[#6B7B3A] text-white shadow-md scale-[1.02]"
                : "bg-[#f5f5f0] text-[#888] hover:bg-[#eeeee8]"
            }
          `}
        >
          <span className="text-2xl">{cenaSelected ? "🌙" : "🌙"}</span>
          <span className="text-sm font-semibold">Cena</span>
        </button>
      </div>
    </div>
  );
}

export default function Formulario() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [seleccion, setSeleccion] = useState({
    viernes_comida: false,
    viernes_cena: false,
    sabado_comida: false,
    sabado_cena: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggle = (key: keyof typeof seleccion) => {
    setSeleccion({ ...seleccion, [key]: !seleccion[key] });
  };

  const alMenosUno = Object.values(seleccion).some(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!nombre.trim()) {
      setError("Escribe tu nombre o teléfono");
      return;
    }
    if (!alMenosUno) {
      setError("Selecciona al menos un turno");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/disponibilidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_o_telefono: nombre.trim(),
          ...seleccion,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al enviar");
        setLoading(false);
        return;
      }

      router.push("/confirmacion");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col">
        <div className="animate-fade-in-up">
          <Header />
        </div>

        <div className="animate-fade-in-up animate-delay-100 mt-2 text-center">
          <p className="text-[#777] text-base">
            Confirma tu disponibilidad para eventos
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="animate-fade-in-up animate-delay-200 mt-6 flex flex-col gap-5 flex-1"
        >
          {/* Campo nombre/teléfono */}
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Escribe tu nombre o teléfono"
            className="w-full px-5 py-4 rounded-2xl border border-[#e0e0e0] bg-white
              text-[#333] placeholder-[#aaa] text-base
              focus:outline-none focus:border-[#6B7B3A] focus:ring-2 focus:ring-[#6B7B3A]/20
              transition-all duration-200"
            maxLength={100}
          />

          {/* Viernes */}
          <DayCard
            day="Viernes"
            comidaSelected={seleccion.viernes_comida}
            cenaSelected={seleccion.viernes_cena}
            onToggleComida={() => toggle("viernes_comida")}
            onToggleCena={() => toggle("viernes_cena")}
          />

          {/* Sábado */}
          <DayCard
            day="Sábado"
            comidaSelected={seleccion.sabado_comida}
            cenaSelected={seleccion.sabado_cena}
            onToggleComida={() => toggle("sabado_comida")}
            onToggleCena={() => toggle("sabado_cena")}
          />

          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm text-center animate-fade-in-up">
              {error}
            </p>
          )}

          {/* Botón enviar */}
          <div className="mt-auto pb-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#6B7B3A] text-white rounded-2xl text-base font-semibold
                shadow-lg shadow-[#6B7B3A]/20 hover:bg-[#5A6A2F]
                active:scale-[0.98] transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Enviando..." : "Enviar disponibilidad"}
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </>
  );
}
