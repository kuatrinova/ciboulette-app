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
    const cicloId = request.nextUrl.searchParams.get("ciclo_id");

    let ciclo;
    if (cicloId) {
      const [ciclos] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT * FROM ciclos WHERE id = ?",
        [cicloId]
      );
      if (ciclos.length === 0) {
        return NextResponse.json({ error: "Ciclo no encontrado" }, { status: 404 });
      }
      ciclo = ciclos[0];
    } else {
      const [ciclos] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT * FROM ciclos ORDER BY id DESC LIMIT 1"
      );
      if (ciclos.length === 0) {
        return NextResponse.json({ eventos: [], ciclo: null });
      }
      ciclo = ciclos[0];
    }

    const [eventos] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT e.*,
        (SELECT COUNT(*) FROM asignaciones a WHERE a.evento_id = e.id) as asignados
       FROM eventos e
       WHERE e.ciclo_id = ?
       ORDER BY FIELD(e.dia, 'viernes', 'sabado'), FIELD(e.turno, 'comida', 'cena'), e.finca`,
      [ciclo.id]
    );

    return NextResponse.json({ eventos, ciclo });
  } catch (error) {
    console.error("Error al obtener eventos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verificarAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { ciclo_id, dia, turno, finca, num_camareros } = await request.json();

    if (!ciclo_id || !dia || !turno || !finca?.trim()) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    if (!["viernes", "sabado"].includes(dia)) {
      return NextResponse.json({ error: "Día inválido" }, { status: 400 });
    }
    if (!["comida", "cena"].includes(turno)) {
      return NextResponse.json({ error: "Turno inválido" }, { status: 400 });
    }

    const [result] = await pool.query<mysql.ResultSetHeader>(
      "INSERT INTO eventos (ciclo_id, dia, turno, finca, num_camareros) VALUES (?, ?, ?, ?, ?)",
      [ciclo_id, dia, turno, finca.trim(), num_camareros || 1]
    );

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error("Error al crear evento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!verificarAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { evento_id } = await request.json();

    if (!evento_id) {
      return NextResponse.json({ error: "evento_id requerido" }, { status: 400 });
    }

    await pool.query("DELETE FROM eventos WHERE id = ?", [evento_id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar evento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
