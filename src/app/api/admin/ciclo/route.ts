import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import mysql from "mysql2/promise";

function verificarAdmin(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  if (!auth) return false;
  const password = auth.replace("Bearer ", "");
  return password === process.env.ADMIN_PASSWORD;
}

export async function POST(request: NextRequest) {
  if (!verificarAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accion } = body; // "abrir" o "cerrar"

    if (accion === "cerrar") {
      await pool.query(
        "UPDATE ciclos SET estado = 'cerrado', fecha_cierre = NOW() WHERE estado = 'abierto'"
      );
      return NextResponse.json({ success: true, message: "Ciclo cerrado" });
    }

    if (accion === "abrir") {
      // Cerrar cualquier ciclo abierto primero
      await pool.query(
        "UPDATE ciclos SET estado = 'cerrado', fecha_cierre = NOW() WHERE estado = 'abierto'"
      );

      // Crear nuevo ciclo
      const ahora = new Date();
      const d = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const semana = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

      await pool.query(
        "INSERT INTO ciclos (semana, ano, fecha_inicio, estado) VALUES (?, ?, NOW(), 'abierto')",
        [semana, ahora.getFullYear()]
      );

      return NextResponse.json({
        success: true,
        message: "Nuevo ciclo abierto",
      });
    }

    return NextResponse.json(
      { error: "Acción no válida. Usa 'abrir' o 'cerrar'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error al gestionar ciclo:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
