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
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT clave, valor FROM config"
    );

    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.clave] = row.valor;
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Error al obtener config:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!verificarAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email_receptor } = body;

    if (email_receptor && typeof email_receptor === "string") {
      await pool.query(
        "INSERT INTO config (clave, valor) VALUES ('email_receptor', ?) ON DUPLICATE KEY UPDATE valor = ?",
        [email_receptor.trim(), email_receptor.trim()]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al actualizar config:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
