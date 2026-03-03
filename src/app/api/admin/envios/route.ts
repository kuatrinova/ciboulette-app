import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import mysql from "mysql2/promise";

function verificarAdmin(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  if (!auth) return false;
  const password = auth.replace("Bearer ", "");
  return password === process.env.ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  if (!verificarAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Obtener ciclo actual (abierto o ultimo cerrado)
    const [ciclos] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM ciclos ORDER BY id DESC LIMIT 1"
    );

    if (ciclos.length === 0) {
      return NextResponse.json({ envios: [], ciclo: null });
    }

    const ciclo = ciclos[0];

    const [envios] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM disponibilidades WHERE ciclo_id = ? ORDER BY created_at DESC",
      [ciclo.id]
    );

    return NextResponse.json({ envios, ciclo });
  } catch (error) {
    console.error("Error al obtener envíos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
