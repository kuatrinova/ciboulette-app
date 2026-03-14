import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import mysql from "mysql2/promise";

// Rate limiting simple en memoria
const respuestasPorIP = new Map<string, number>();

setInterval(() => {
  respuestasPorIP.clear();
}, 5 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const count = respuestasPorIP.get(ip) || 0;
    if (count >= 100) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta en unos minutos." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { asignacion_id, estado, nombre_o_telefono } = body;

    if (!asignacion_id || !estado || !nombre_o_telefono) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      );
    }

    if (!["aceptado", "rechazado"].includes(estado)) {
      return NextResponse.json(
        { error: "Estado inválido" },
        { status: 400 }
      );
    }

    // Verificar que la asignación pertenece a este camarero
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT a.id FROM asignaciones a
       JOIN disponibilidades d ON a.disponibilidad_id = d.id
       WHERE a.id = ? AND LOWER(d.nombre_o_telefono) = LOWER(?)`,
      [asignacion_id, nombre_o_telefono.trim()]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Asignación no encontrada" },
        { status: 404 }
      );
    }

    await pool.query(
      "UPDATE asignaciones SET estado = ? WHERE id = ?",
      [estado, asignacion_id]
    );

    respuestasPorIP.set(ip, count + 1);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al responder asignación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
