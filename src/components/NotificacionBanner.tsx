"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function NotificacionBanner() {
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const nombre = localStorage.getItem("ciboulette_nombre");
    if (!nombre) {
      setLoaded(true);
      return;
    }

    fetch(`/api/consulta?nombre_o_telefono=${encodeURIComponent(nombre)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.encontrado && data.pendientes > 0) {
          setCount(data.pendientes);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || count === 0) return null;

  return (
    <Link
      href="/consulta"
      className="w-full px-4 py-3 bg-[#6B7B3A]/10 border border-[#6B7B3A]/30 rounded-2xl
        flex items-center justify-between"
    >
      <span className="text-sm text-[#333]">
        Tienes <strong className="text-[#6B7B3A]">{count}</strong>{" "}
        {count === 1 ? "asignación pendiente" : "asignaciones pendientes"}
      </span>
      <span className="text-[#6B7B3A] text-xs font-medium">&rarr;</span>
    </Link>
  );
}
