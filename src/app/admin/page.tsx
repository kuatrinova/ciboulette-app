"use client";

import { useState, useEffect, useCallback } from "react";

interface Envio {
  id: number;
  nombre_o_telefono: string;
  viernes_comida: boolean;
  viernes_cena: boolean;
  sabado_comida: boolean;
  sabado_cena: boolean;
  created_at: string;
}

interface Ciclo {
  id: number;
  semana: number;
  ano: number;
  estado: string;
  fecha_inicio: string;
  fecha_cierre: string | null;
}

export default function Admin() {
  const [password, setPassword] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [ciclo, setCiclo] = useState<Ciclo | null>(null);
  const [emailReceptor, setEmailReceptor] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${password}`,
  };

  const cargarDatos = useCallback(async () => {
    try {
      const [enviosRes, configRes] = await Promise.all([
        fetch("/api/admin/envios", { headers }),
        fetch("/api/admin/config", { headers }),
      ]);

      if (enviosRes.status === 401) {
        setAutenticado(false);
        return;
      }

      const enviosData = await enviosRes.json();
      const configData = await configRes.json();

      setEnvios(enviosData.envios || []);
      setCiclo(enviosData.ciclo || null);
      setEmailReceptor(configData.config?.email_receptor || "");
    } catch {
      setMensaje("Error al cargar datos");
    }
  }, [password]);

  useEffect(() => {
    if (autenticado) {
      cargarDatos();
    }
  }, [autenticado, cargarDatos]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/envios", { headers });
    if (res.ok) {
      setAutenticado(true);
    } else {
      setMensaje("Contraseña incorrecta");
    }
  };

  const descargarExcel = async () => {
    const res = await fetch("/api/admin/excel", { headers });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Disponibilidad_Semana_${ciclo?.semana}_${ciclo?.ano}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const toggleCiclo = async () => {
    setLoading(true);
    const accion = ciclo?.estado === "abierto" ? "cerrar" : "abrir";
    const res = await fetch("/api/admin/ciclo", {
      method: "POST",
      headers,
      body: JSON.stringify({ accion }),
    });
    const data = await res.json();
    setMensaje(data.message || data.error);
    await cargarDatos();
    setLoading(false);
  };

  const guardarEmail = async () => {
    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers,
      body: JSON.stringify({ email_receptor: emailReceptor }),
    });
    const data = await res.json();
    setMensaje(data.success ? "Email guardado" : "Error al guardar");
  };

  const ejecutarCron = async () => {
    setLoading(true);
    setMensaje("Ejecutando cierre semanal...");
    try {
      const res = await fetch("/api/cron", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || password}`,
        },
      });
      const data = await res.json();
      setMensaje(data.message || data.error);
      await cargarDatos();
    } catch {
      setMensaje("Error al ejecutar cierre");
    }
    setLoading(false);
  };

  // Pantalla de login
  if (!autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <h1 className="text-xl font-semibold text-[#333] text-center">
            Panel Admin
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
    <div className="min-h-screen bg-[#FAFAF8] px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-[#333] mb-6">
        Panel Admin - Ciboulette
      </h1>

      {mensaje && (
        <div className="mb-4 px-4 py-2 bg-[#E8EBD8] text-[#6B7B3A] rounded-xl text-sm">
          {mensaje}
        </div>
      )}

      {/* Estado del ciclo */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#777]">Ciclo actual</p>
            <p className="font-medium text-[#333]">
              Semana {ciclo?.semana} / {ciclo?.ano}
            </p>
            <span
              className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-medium ${
                ciclo?.estado === "abierto"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {ciclo?.estado === "abierto" ? "Abierto" : "Cerrado"}
            </span>
          </div>
          <button
            onClick={toggleCiclo}
            disabled={loading}
            className="px-4 py-2 bg-[#6B7B3A] text-white rounded-xl text-sm font-medium
              hover:bg-[#5A6A2F] disabled:opacity-50"
          >
            {ciclo?.estado === "abierto" ? "Cerrar ciclo" : "Abrir nuevo ciclo"}
          </button>
        </div>
      </div>

      {/* Acciones */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 flex gap-3 flex-wrap">
        <button
          onClick={descargarExcel}
          className="px-4 py-2 bg-[#6B7B3A] text-white rounded-xl text-sm font-medium
            hover:bg-[#5A6A2F]"
        >
          Descargar Excel
        </button>
        <button
          onClick={ejecutarCron}
          disabled={loading}
          className="px-4 py-2 border border-[#6B7B3A] text-[#6B7B3A] rounded-xl text-sm font-medium
            hover:bg-[#E8EBD8] disabled:opacity-50"
        >
          Ejecutar cierre semanal
        </button>
      </div>

      {/* Config email */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <p className="text-sm text-[#777] mb-2">Email receptor del Excel</p>
        <div className="flex gap-2">
          <input
            type="email"
            value={emailReceptor}
            onChange={(e) => setEmailReceptor(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-[#ddd] text-sm
              focus:outline-none focus:border-[#6B7B3A]"
          />
          <button
            onClick={guardarEmail}
            className="px-4 py-2 bg-[#6B7B3A] text-white rounded-xl text-sm font-medium"
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Tabla de envíos */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-sm text-[#777] mb-3">
          Envíos del ciclo ({envios.length} registros)
        </p>
        {envios.length === 0 ? (
          <p className="text-sm text-[#aaa] text-center py-4">
            No hay envíos aún
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#eee]">
                  <th className="text-left py-2 px-2 text-[#777] font-medium">
                    Nombre / Tel.
                  </th>
                  <th className="text-center py-2 px-1 text-[#777] font-medium text-xs">
                    Vie Com
                  </th>
                  <th className="text-center py-2 px-1 text-[#777] font-medium text-xs">
                    Vie Cen
                  </th>
                  <th className="text-center py-2 px-1 text-[#777] font-medium text-xs">
                    Sáb Com
                  </th>
                  <th className="text-center py-2 px-1 text-[#777] font-medium text-xs">
                    Sáb Cen
                  </th>
                  <th className="text-left py-2 px-2 text-[#777] font-medium">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {envios.map((e) => (
                  <tr key={e.id} className="border-b border-[#f5f5f5]">
                    <td className="py-2 px-2 text-[#333]">
                      {e.nombre_o_telefono}
                    </td>
                    <td className="text-center py-2 px-1">
                      {e.viernes_comida ? "✓" : "—"}
                    </td>
                    <td className="text-center py-2 px-1">
                      {e.viernes_cena ? "✓" : "—"}
                    </td>
                    <td className="text-center py-2 px-1">
                      {e.sabado_comida ? "✓" : "—"}
                    </td>
                    <td className="text-center py-2 px-1">
                      {e.sabado_cena ? "✓" : "—"}
                    </td>
                    <td className="py-2 px-2 text-[#999] text-xs">
                      {new Date(e.created_at).toLocaleString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
