import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import mysql from "mysql2/promise";

function verificarAdmin(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  if (!auth) return false;
  const password = auth.replace("Bearer ", "");
  return password === process.env.ADMIN_PASSWORD;
}

const COLUMNAS_VALIDAS = ["viernes_comida", "viernes_cena", "sabado_comida", "sabado_cena"];

export async function GET(request: NextRequest) {
  if (!verificarAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const eventoId = request.nextUrl.searchParams.get("evento_id");

    if (!eventoId) {
      return NextResponse.json({ error: "evento_id requerido" }, { status: 400 });
    }

    // Obtener evento
    const [eventos] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM eventos WHERE id = ?",
      [eventoId]
    );

    if (eventos.length === 0) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const evento = eventos[0];
    const columna = `${evento.dia}_${evento.turno}`;

    if (!COLUMNAS_VALIDAS.includes(columna)) {
      return NextResponse.json({ error: "Combinación día/turno inválida" }, { status: 400 });
    }

    // Camareros asignados a este evento
    const [asignados] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT d.id, d.nombre_o_telefono
       FROM asignaciones a
       JOIN disponibilidades d ON a.disponibilidad_id = d.id
       WHERE a.evento_id = ?
       ORDER BY d.nombre_o_telefono`,
      [eventoId]
    );

    // Camareros disponibles para este día/turno que NO están asignados a este evento
    const [disponibles] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT d.id, d.nombre_o_telefono
       FROM disponibilidades d
       WHERE d.ciclo_id = ? AND d.${columna} = TRUE
       AND d.id NOT IN (SELECT disponibilidad_id FROM asignaciones WHERE evento_id = ?)
       ORDER BY d.nombre_o_telefono`,
      [evento.ciclo_id, eventoId]
    );

    return NextResponse.json({ evento, asignados, disponibles });
  } catch (error) {
    console.error("Error al obtener asignaciones:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verificarAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { evento_id, disponibilidad_id } = await request.json();

    if (!evento_id || !disponibilidad_id) {
      return NextResponse.json({ error: "evento_id y disponibilidad_id requeridos" }, { status: 400 });
    }

    await pool.query(
      "INSERT INTO asignaciones (evento_id, disponibilidad_id) VALUES (?, ?)",
      [evento_id, disponibilidad_id]
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Ya está asignado" }, { status: 409 });
    }
    console.error("Error al asignar:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!verificarAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { evento_id, disponibilidad_id } = await request.json();

    if (!evento_id || !disponibilidad_id) {
      return NextResponse.json({ error: "evento_id y disponibilidad_id requeridos" }, { status: 400 });
    }

    await pool.query(
      "DELETE FROM asignaciones WHERE evento_id = ? AND disponibilidad_id = ?",
      [evento_id, disponibilidad_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al desasignar:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
