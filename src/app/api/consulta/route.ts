import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import mysql from "mysql2/promise";

// Rate limiting simple en memoria
const consultasPorIP = new Map<string, number>();

setInterval(() => {
  consultasPorIP.clear();
}, 5 * 60 * 1000);

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const consultas = consultasPorIP.get(ip) || 0;
    if (consultas >= 50) {
      return NextResponse.json(
        { error: "Demasiadas consultas. Intenta en unos minutos." },
        { status: 429 }
      );
    }

    const nombre = request.nextUrl.searchParams.get("nombre_o_telefono");

    if (!nombre || nombre.trim().length === 0) {
      return NextResponse.json(
        { error: "Nombre o teléfono es obligatorio" },
        { status: 400 }
      );
    }

    // Buscar ciclo activo
    const [ciclos] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT id FROM ciclos WHERE estado = 'abierto' ORDER BY id DESC LIMIT 1"
    );

    if (ciclos.length === 0) {
      return NextResponse.json({ encontrado: false, mensaje: "No hay un ciclo activo en este momento." });
    }

    const cicloId = ciclos[0].id;

    // Buscar todas las disponibilidades del camarero en el ciclo activo
    const [disponibilidades] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT id FROM disponibilidades WHERE LOWER(nombre_o_telefono) = LOWER(?) AND ciclo_id = ?",
      [nombre.trim(), cicloId]
    );

    if (disponibilidades.length === 0) {
      consultasPorIP.set(ip, consultas + 1);
      return NextResponse.json({ encontrado: false });
    }

    // Buscar asignaciones en todas las disponibilidades del camarero
    const ids = disponibilidades.map((d) => d.id);
    const [asignaciones] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT a.id AS asignacion_id, e.dia, e.turno, e.finca, a.estado
       FROM asignaciones a
       JOIN eventos e ON a.evento_id = e.id
       WHERE a.disponibilidad_id IN (?)
       ORDER BY FIELD(e.dia, 'viernes', 'sabado'), FIELD(e.turno, 'comida', 'cena')`,
      [ids]
    );

    const pendientes = asignaciones.filter((a) => a.estado === "pendiente").length;

    consultasPorIP.set(ip, consultas + 1);

    return NextResponse.json({
      encontrado: true,
      asignaciones,
      pendientes,
    });
  } catch (error) {
    console.error("Error al consultar asignaciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
