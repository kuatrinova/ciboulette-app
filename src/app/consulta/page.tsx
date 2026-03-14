"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Asignacion {
  asignacion_id: number;
  dia: string;
  turno: string;
  finca: string;
  estado: string;
}

export default function Consulta() {
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [consultado, setConsultado] = useState(false);
  const [encontrado, setEncontrado] = useState(false);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("ciboulette_nombre");
    if (saved) setNombre(saved);
  }, []);

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!nombre.trim()) {
      setError("Escribe tu nombre o teléfono");
      return;
    }

    setLoading(true);
    setConsultado(false);

    try {
      const res = await fetch(
        `/api/consulta?nombre_o_telefono=${encodeURIComponent(nombre.trim())}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al consultar");
        setLoading(false);
        return;
      }

      setEncontrado(data.encontrado);
      setAsignaciones(data.asignaciones || []);
      setConsultado(true);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const responder = async (asignacionId: number, estado: "aceptado" | "rechazado") => {
    try {
      const res = await fetch("/api/consulta/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asignacion_id: asignacionId,
          estado,
          nombre_o_telefono: nombre.trim(),
        }),
      });
      if (res.ok) {
        setAsignaciones((prev) =>
          prev.map((a) =>
            a.asignacion_id === asignacionId ? { ...a, estado } : a
          )
        );
      } else {
        setError("Error al responder");
      }
    } catch {
      setError("Error de conexión");
    }
  };

  const turnoLabel = (turno: string) =>
    turno === "comida" ? "Comida" : "Cena";
  const turnoIcon = (turno: string) =>
    turno === "comida" ? "🍽" : "🌙";
  const diaLabel = (dia: string) =>
    dia === "viernes" ? "Viernes" : "Sábado";

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto px-6">
      <div className="flex-1 flex flex-col">
        <div className="animate-fade-in-up">
          <Header />
        </div>

        <div className="animate-fade-in-up animate-delay-100 mt-2 text-center">
          <p className="text-[#777] text-base">
            Consulta tus asignaciones para eventos
          </p>
        </div>

        <form
          onSubmit={handleConsultar}
          className="animate-fade-in-up animate-delay-200 mt-6 flex flex-col gap-5"
        >
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

          {error && (
            <p className="text-red-500 text-sm text-center animate-fade-in-up">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#6B7B3A] text-white rounded-2xl text-base font-semibold
              shadow-lg shadow-[#6B7B3A]/20 hover:bg-[#5A6A2F]
              active:scale-[0.98] transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Consultando..." : "Consultar"}
          </button>
        </form>

        {/* Resultados */}
        {consultado && (
          <div className="mt-6 flex flex-col gap-4 animate-fade-in-up">
            {!encontrado && (
              <div className="rounded-2xl bg-white border border-[#e0e0e0] px-5 py-6 text-center">
                <p className="text-[#777] text-sm">
                  No se encontró disponibilidad registrada con ese nombre
                </p>
              </div>
            )}

            {encontrado && asignaciones.length === 0 && (
              <div className="rounded-2xl bg-white border border-[#e0e0e0] px-5 py-6 text-center">
                <p className="text-[#777] text-sm">
                  Tu disponibilidad está registrada pero aún no tienes
                  asignaciones
                </p>
              </div>
            )}

            {encontrado && asignaciones.length > 0 && (
              <>
                <p className="text-[#333] text-sm font-medium text-center">
                  Tienes {asignaciones.length}{" "}
                  {asignaciones.length === 1 ? "asignación" : "asignaciones"}
                </p>

                {asignaciones.map((a) => (
                  <div
                    key={a.asignacion_id}
                    className={`rounded-2xl overflow-hidden shadow-lg ${
                      a.estado === "aceptado"
                        ? "shadow-green-500/15"
                        : a.estado === "rechazado"
                        ? "shadow-red-400/15"
                        : "shadow-[#6B7B3A]/15"
                    }`}
                  >
                    <div
                      className={`px-5 py-3 ${
                        a.estado === "aceptado"
                          ? "bg-green-600"
                          : a.estado === "rechazado"
                          ? "bg-red-400"
                          : "bg-[#6B7B3A]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold tracking-wide text-white">
                          {diaLabel(a.dia)}
                        </h3>
                        {a.estado !== "pendiente" && (
                          <span className="text-xs text-white/80 font-medium uppercase">
                            {a.estado === "aceptado"
                              ? "Aceptado"
                              : "Rechazado"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{turnoIcon(a.turno)}</span>
                        <div>
                          <p className="text-[#333] font-semibold text-sm">
                            {turnoLabel(a.turno)}
                          </p>
                          <p className="text-[#6B7B3A] text-sm font-medium">
                            {a.finca}
                          </p>
                        </div>
                      </div>

                      {a.estado === "pendiente" && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() =>
                              responder(a.asignacion_id, "aceptado")
                            }
                            className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-medium
                              hover:bg-green-700 active:scale-[0.98] transition-all"
                          >
                            Aceptar
                          </button>
                          <button
                            onClick={() =>
                              responder(a.asignacion_id, "rechazado")
                            }
                            className="flex-1 py-2 bg-red-400 text-white rounded-xl text-sm font-medium
                              hover:bg-red-500 active:scale-[0.98] transition-all"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Volver */}
        <div className="mt-auto pb-2 pt-6">
          <a
            href="/"
            className="block w-full py-3 text-[#6B7B3A] text-center rounded-2xl text-sm font-medium
              border border-[#6B7B3A]/30 hover:bg-[#E8EBD8]
              active:scale-[0.98] transition-all duration-200"
          >
            Volver al inicio
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
