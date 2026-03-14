import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import mysql from "mysql2/promise";

// Rate limiting simple en memoria
const enviosPorIP = new Map<string, number>();

setInterval(() => {
  enviosPorIP.clear();
}, 5 * 60 * 1000); // Limpiar cada 5 minutos

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const envios = enviosPorIP.get(ip) || 0;
    if (envios >= 50) {
      return NextResponse.json(
        { error: "Demasiados envíos. Intenta en unos minutos." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { nombre_o_telefono, viernes_comida, viernes_cena, sabado_comida, sabado_cena } = body;

    // Validaciones
    if (!nombre_o_telefono || typeof nombre_o_telefono !== "string" || nombre_o_telefono.trim().length === 0) {
      return NextResponse.json(
        { error: "Nombre o teléfono es obligatorio" },
        { status: 400 }
      );
    }

    if (nombre_o_telefono.trim().length > 100) {
      return NextResponse.json(
        { error: "Nombre o teléfono demasiado largo" },
        { status: 400 }
      );
    }

    if (!viernes_comida && !viernes_cena && !sabado_comida && !sabado_cena) {
      return NextResponse.json(
        { error: "Selecciona al menos un turno" },
        { status: 400 }
      );
    }

    // Verificar ciclo abierto
    const [ciclos] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM ciclos WHERE estado = 'abierto' ORDER BY id DESC LIMIT 1"
    );

    if (ciclos.length === 0) {
      return NextResponse.json(
        { error: "El plazo de inscripción para esta semana ha finalizado." },
        { status: 403 }
      );
    }

    const cicloActual = ciclos[0];

    // Sanitizar input
    const nombreSanitizado = nombre_o_telefono
      .trim()
      .replace(/[<>]/g, "")
      .substring(0, 100);

    // Insertar disponibilidad
    await pool.query(
      "INSERT INTO disponibilidades (ciclo_id, nombre_o_telefono, viernes_comida, viernes_cena, sabado_comida, sabado_cena) VALUES (?, ?, ?, ?, ?, ?)",
      [
        cicloActual.id,
        nombreSanitizado,
        Boolean(viernes_comida),
        Boolean(viernes_cena),
        Boolean(sabado_comida),
        Boolean(sabado_cena),
      ]
    );

    // Registrar envío para rate limiting
    enviosPorIP.set(ip, envios + 1);

    return NextResponse.json({ success: true, message: "Disponibilidad registrada" });
  } catch (error) {
    console.error("Error al guardar disponibilidad:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
