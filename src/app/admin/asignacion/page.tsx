"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Ciclo {
  id: number;
  semana: number;
  ano: number;
  estado: string;
}

interface Evento {
  id: number;
  ciclo_id: number;
  dia: string;
  turno: string;
  finca: string;
  num_camareros: number;
  asignados: number;
}

interface Camarero {
  id: number;
  nombre_o_telefono: string;
}

const DIAS_LABEL: Record<string, string> = {
  viernes: "Viernes",
  sabado: "Sábado",
};

const TURNOS_LABEL: Record<string, string> = {
  comida: "Comida",
  cena: "Cena",
};

export default function Asignacion() {
  const [password, setPassword] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [ciclo, setCiclo] = useState<Ciclo | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  // Form nuevo evento
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoDia, setNuevoDia] = useState("viernes");
  const [nuevoTurno, setNuevoTurno] = useState("comida");
  const [nuevaFinca, setNuevaFinca] = useState("FINCA EL SOTO DE MOZANAQUE");
  const [fincaPersonalizada, setFincaPersonalizada] = useState("");
  const [nuevoNum, setNuevoNum] = useState(1);

  const FINCAS_PRESET = [
    "FINCA EL SOTO DE MOZANAQUE",
    "FINCA CHAPARRAL",
  ];

  // Evento expandido
  const [eventoActivo, setEventoActivo] = useState<number | null>(null);
  const [asignados, setAsignados] = useState<Camarero[]>([]);
  const [disponibles, setDisponibles] = useState<Camarero[]>([]);
  const [loadingAsignacion, setLoadingAsignacion] = useState(false);

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${password}`,
  }), [password]);

  // Intentar recuperar sesion
  useEffect(() => {
    const saved = sessionStorage.getItem("ciboulette_admin_pwd");
    if (saved) {
      setPassword(saved);
      setAutenticado(true);
    }
  }, []);

  const cargarEventos = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/eventos", { headers: headers() });
      if (res.status === 401) {
        setAutenticado(false);
        return;
      }
      const data = await res.json();
      setEventos(data.eventos || []);
      setCiclo(data.ciclo || null);
    } catch {
      setMensaje("Error al cargar eventos");
    }
  }, [headers]);

  useEffect(() => {
    if (autenticado) cargarEventos();
  }, [autenticado, cargarEventos]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/eventos", {
      headers: headers(),
    });
    if (res.ok) {
      sessionStorage.setItem("ciboulette_admin_pwd", password);
      setAutenticado(true);
    } else {
      setMensaje("Contraseña incorrecta");
    }
  };

  const crearEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    const fincaFinal = nuevaFinca === "__otra__" ? fincaPersonalizada.trim() : nuevaFinca;
    if (!fincaFinal || !ciclo) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/eventos", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          ciclo_id: ciclo.id,
          dia: nuevoDia,
          turno: nuevoTurno,
          finca: fincaFinal,
          num_camareros: nuevoNum,
        }),
      });
      if (res.ok) {
        setNuevaFinca("FINCA EL SOTO DE MOZANAQUE");
        setFincaPersonalizada("");
        setNuevoNum(1);
        setMostrarForm(false);
        await cargarEventos();
      } else {
        const data = await res.json();
        setMensaje(data.error || "Error al crear evento");
      }
    } catch {
      setMensaje("Error de conexión");
    }
    setLoading(false);
  };

  const eliminarEvento = async (eventoId: number) => {
    if (!confirm("¿Eliminar este evento y sus asignaciones?")) return;
    await fetch("/api/admin/eventos", {
      method: "DELETE",
      headers: headers(),
      body: JSON.stringify({ evento_id: eventoId }),
    });
    if (eventoActivo === eventoId) setEventoActivo(null);
    await cargarEventos();
  };

  const expandirEvento = async (eventoId: number) => {
    if (eventoActivo === eventoId) {
      setEventoActivo(null);
      return;
    }
    setEventoActivo(eventoId);
    setLoadingAsignacion(true);
    try {
      const res = await fetch(`/api/admin/asignaciones?evento_id=${eventoId}`, {
        headers: headers(),
      });
      const data = await res.json();
      setAsignados(data.asignados || []);
      setDisponibles(data.disponibles || []);
    } catch {
      setMensaje("Error al cargar asignaciones");
    }
    setLoadingAsignacion(false);
  };

  const asignar = async (disponibilidadId: number) => {
    if (!eventoActivo) return;
    await fetch("/api/admin/asignaciones", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ evento_id: eventoActivo, disponibilidad_id: disponibilidadId }),
    });
    await expandirEvento(eventoActivo);
    await cargarEventos();
  };

  const desasignar = async (disponibilidadId: number) => {
    if (!eventoActivo) return;
    await fetch("/api/admin/asignaciones", {
      method: "DELETE",
      headers: headers(),
      body: JSON.stringify({ evento_id: eventoActivo, disponibilidad_id: disponibilidadId }),
    });
    await expandirEvento(eventoActivo);
    await cargarEventos();
  };

  const descargarExcel = async () => {
    const res = await fetch(`/api/admin/excel-asignacion?ciclo_id=${ciclo?.id}`, {
      headers: headers(),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Asignacion_Semana_${ciclo?.semana}_${ciclo?.ano}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      setMensaje("Error al descargar Excel");
    }
  };

  // Agrupar eventos por dia/turno
  const grupos: Record<string, Evento[]> = {};
  for (const ev of eventos) {
    const key = `${ev.dia}_${ev.turno}`;
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(ev);
  }

  // Evento activo info
  const eventoActivoInfo = eventos.find((e) => e.id === eventoActivo);

  // Panel de asignación (reutilizable para móvil y escritorio)
  const panelAsignacion = () => {
    if (!eventoActivo || !eventoActivoInfo) return null;

    return (
      <div>
        {/* Info del evento seleccionado (solo desktop) */}
        <div className="hidden lg:block mb-4 pb-3 border-b border-[#eee]">
          <p className="text-xs text-[#777] uppercase tracking-wide">Evento seleccionado</p>
          <p className="font-medium text-[#333] mt-1">{eventoActivoInfo.finca}</p>
          <p className="text-sm text-[#777]">
            {DIAS_LABEL[eventoActivoInfo.dia]} {TURNOS_LABEL[eventoActivoInfo.turno]}
            <span className={`ml-2 font-bold ${
              eventoActivoInfo.asignados >= eventoActivoInfo.num_camareros
                ? "text-green-600" : "text-orange-500"
            }`}>
              {eventoActivoInfo.asignados}/{eventoActivoInfo.num_camareros} cam.
            </span>
          </p>
        </div>

        {loadingAsignacion ? (
          <p className="text-[#aaa] text-sm text-center py-2">Cargando...</p>
        ) : (
          <>
            {/* Asignados */}
            {asignados.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-[#777] font-medium mb-1">
                  Asignados ({asignados.length})
                </p>
                <div className="space-y-1">
                  {asignados.map((cam) => (
                    <div
                      key={cam.id}
                      className="flex items-center justify-between bg-[#E8EBD8] rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-[#333]">
                        {cam.nombre_o_telefono}
                      </span>
                      <button
                        onClick={() => desasignar(cam.id)}
                        className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disponibles */}
            {disponibles.length > 0 ? (
              <div>
                <p className="text-xs text-[#777] font-medium mb-1">
                  Disponibles ({disponibles.length})
                </p>
                <div className="space-y-1">
                  {disponibles.map((cam) => (
                    <div
                      key={cam.id}
                      className="flex items-center justify-between bg-[#f5f5f0] rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-[#555]">
                        {cam.nombre_o_telefono}
                      </span>
                      <button
                        onClick={() => asignar(cam.id)}
                        className="text-[#6B7B3A] hover:bg-[#6B7B3A] hover:text-white
                          text-xs font-medium px-3 py-1 rounded-lg border border-[#6B7B3A]
                          transition-colors"
                      >
                        Asignar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              asignados.length === 0 && (
                <p className="text-[#aaa] text-xs text-center py-2">
                  No hay camareros disponibles para este turno
                </p>
              )
            )}
          </>
        )}
      </div>
    );
  };

  // Login
  if (!autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <h1 className="text-xl font-semibold text-[#333] text-center">
            Asignación de Eventos
          </h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="w-full px-4 py-3 rounded-xl border border-[#ddd] bg-white text-sm
              focus:outline-none focus:border-[#6B7B3A]"
          />
          <button
            type="submit"
            className="w-full py-3 bg-[#6B7B3A] text-white rounded-xl text-sm font-medium"
          >
            Entrar
          </button>
          {mensaje && (
            <p className="text-red-500 text-sm text-center">{mensaje}</p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] px-4 py-6 max-w-4xl lg:max-w-none lg:px-12 xl:px-20 mx-auto md:px-8 md:py-8">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/admin"
            className="text-[#6B7B3A] text-sm hover:underline"
          >
            ← Panel Admin
          </Link>
          <h1 className="text-xl md:text-2xl font-semibold text-[#333] mt-1">
            Asignación de Eventos
          </h1>
          {ciclo && (
            <p className="text-sm text-[#777]">
              Semana {ciclo.semana} / {ciclo.ano} —{" "}
              <span className={ciclo.estado === "abierto" ? "text-green-600" : "text-red-500"}>
                {ciclo.estado === "abierto" ? "Abierto" : "Cerrado"}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={descargarExcel}
          className="px-4 py-2 bg-[#6B7B3A] text-white rounded-xl text-sm font-medium
            hover:bg-[#5A6A2F] transition-colors"
        >
          Descargar Excel
        </button>
      </div>

      {mensaje && (
        <div className="mb-4 px-4 py-2 bg-[#E8EBD8] text-[#6B7B3A] rounded-xl text-sm">
          {mensaje}
          <button onClick={() => setMensaje("")} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Botón crear evento */}
      <div className="mb-4 lg:max-w-2xl">
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="px-4 py-2 border-2 border-dashed border-[#6B7B3A] text-[#6B7B3A] rounded-xl
            text-sm font-medium hover:bg-[#E8EBD8] w-full transition-colors"
        >
          {mostrarForm ? "Cancelar" : "+ Crear Evento"}
        </button>
      </div>

      {/* Form crear evento */}
      {mostrarForm && (
        <form onSubmit={crearEvento} className="bg-white rounded-2xl p-5 md:p-6 shadow-sm mb-4 lg:max-w-2xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-xs text-[#777] block mb-1">Día</label>
              <select
                value={nuevoDia}
                onChange={(e) => setNuevoDia(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#ddd] text-sm
                  focus:outline-none focus:border-[#6B7B3A]"
              >
                <option value="viernes">Viernes</option>
                <option value="sabado">Sábado</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#777] block mb-1">Turno</label>
              <select
                value={nuevoTurno}
                onChange={(e) => setNuevoTurno(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#ddd] text-sm
                  focus:outline-none focus:border-[#6B7B3A]"
              >
                <option value="comida">Comida</option>
                <option value="cena">Cena</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#777] block mb-1">Finca / Lugar</label>
              <select
                value={nuevaFinca}
                onChange={(e) => setNuevaFinca(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#ddd] text-sm
                  focus:outline-none focus:border-[#6B7B3A]"
              >
                {FINCAS_PRESET.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
                <option value="__otra__">Otra dirección...</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#777] block mb-1">Camareros</label>
              <input
                type="number"
                min={1}
                value={nuevoNum}
                onChange={(e) => setNuevoNum(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-[#ddd] text-sm
                  focus:outline-none focus:border-[#6B7B3A]"
              />
            </div>
          </div>
          {nuevaFinca === "__otra__" && (
            <div className="mb-3">
              <input
                type="text"
                value={fincaPersonalizada}
                onChange={(e) => setFincaPersonalizada(e.target.value)}
                placeholder="Escribe la dirección o lugar"
                className="w-full px-3 py-2 rounded-xl border border-[#ddd] text-sm
                  focus:outline-none focus:border-[#6B7B3A]"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading || (nuevaFinca === "__otra__" ? !fincaPersonalizada.trim() : !nuevaFinca)}
            className="w-full py-2 bg-[#6B7B3A] text-white rounded-xl text-sm font-medium
              hover:bg-[#5A6A2F] disabled:opacity-50 transition-colors"
          >
            {loading ? "Creando..." : "Crear Evento"}
          </button>
        </form>
      )}

      {/* Contenido principal: 2 columnas en desktop */}
      <div className="lg:grid lg:grid-cols-5 lg:gap-6">
        {/* Columna izquierda: lista de eventos */}
        <div className="lg:col-span-3">
          {Object.keys(grupos).length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <p className="text-[#aaa] text-sm">No hay eventos creados</p>
              <p className="text-[#ccc] text-xs mt-1">Pulsa &quot;+ Crear Evento&quot; para empezar</p>
            </div>
          ) : (
            Object.entries(grupos)
              .sort(([a], [b]) => {
                const order = ["viernes_comida", "viernes_cena", "sabado_comida", "sabado_cena"];
                return order.indexOf(a) - order.indexOf(b);
              })
              .map(([key, eventosGrupo]) => {
                const [dia, turno] = key.split("_");
                return (
                  <div key={key} className="mb-5">
                    <h2 className="text-sm font-bold text-[#6B7B3A] uppercase tracking-wide mb-2">
                      {DIAS_LABEL[dia]} {TURNOS_LABEL[turno]}
                    </h2>

                    <div className="space-y-2">
                      {eventosGrupo.map((ev) => (
                        <div
                          key={ev.id}
                          className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all ${
                            eventoActivo === ev.id ? "ring-2 ring-[#6B7B3A]" : ""
                          }`}
                        >
                          {/* Cabecera evento */}
                          <div
                            onClick={() => expandirEvento(ev.id)}
                            className="px-4 py-3 md:px-5 md:py-4 flex items-center justify-between cursor-pointer
                              hover:bg-[#f9f9f6] transition-colors"
                          >
                            <div className="flex-1">
                              <span className="font-medium text-[#333] text-sm md:text-base">
                                {ev.finca}
                              </span>
                              <span className={`ml-3 text-xs md:text-sm font-bold ${
                                ev.asignados >= ev.num_camareros
                                  ? "text-green-600"
                                  : "text-orange-500"
                              }`}>
                                {ev.asignados}/{ev.num_camareros} cam.
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  eliminarEvento(ev.id);
                                }}
                                className="text-red-400 hover:text-red-600 text-xs px-2 py-1"
                              >
                                Eliminar
                              </button>
                              <span className="text-[#aaa] text-xs lg:hidden">
                                {eventoActivo === ev.id ? "▲" : "▼"}
                              </span>
                            </div>
                          </div>

                          {/* Panel expandido - SOLO MÓVIL */}
                          {eventoActivo === ev.id && (
                            <div className="lg:hidden border-t border-[#f0f0f0] px-4 py-3">
                              {panelAsignacion()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Columna derecha: panel asignación - SOLO DESKTOP */}
        <div className="hidden lg:block lg:col-span-2">
          <div className="sticky top-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm min-h-[200px]">
              <h3 className="text-sm font-bold text-[#6B7B3A] uppercase tracking-wide mb-4">
                Panel de Asignación
              </h3>
              {eventoActivo ? (
                panelAsignacion()
              ) : (
                <div className="text-center py-12">
                  <p className="text-[#aaa] text-sm">Selecciona un evento</p>
                  <p className="text-[#ccc] text-xs mt-1">
                    Haz clic en un evento de la lista para gestionar sus camareros
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
