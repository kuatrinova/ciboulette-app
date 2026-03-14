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
    const [ciclos] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT c.*, COUNT(d.id) as total_envios
       FROM ciclos c
       LEFT JOIN disponibilidades d ON d.ciclo_id = c.id
       WHERE c.estado = 'cerrado'
       GROUP BY c.id
       ORDER BY c.id DESC
       LIMIT 20`
    );

    return NextResponse.json({ historial: ciclos });
  } catch (error) {
    console.error("Error al obtener historial:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!verificarAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { ciclo_id } = await request.json();

    if (!ciclo_id) {
      return NextResponse.json({ error: "ciclo_id requerido" }, { status: 400 });
    }

    // Only allow deleting closed cycles
    const [ciclos] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM ciclos WHERE id = ? AND estado = 'cerrado'",
      [ciclo_id]
    );

    if (ciclos.length === 0) {
      return NextResponse.json(
        { error: "Ciclo no encontrado o no se puede eliminar (está abierto)" },
        { status: 400 }
      );
    }

    // Delete disponibilidades first (foreign key), then the cycle
    await pool.query("DELETE FROM disponibilidades WHERE ciclo_id = ?", [ciclo_id]);
    await pool.query("DELETE FROM ciclos WHERE id = ?", [ciclo_id]);

    return NextResponse.json({ success: true, message: "Ciclo eliminado" });
  } catch (error) {
    console.error("Error al eliminar ciclo:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
