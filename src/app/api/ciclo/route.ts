import { NextResponse } from "next/server";
import pool from "@/lib/db";
import mysql from "mysql2/promise";

export async function GET() {
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM ciclos WHERE estado = 'abierto' ORDER BY id DESC LIMIT 1"
    );

    if (rows.length === 0) {
      return NextResponse.json({ estado: "cerrado", ciclo: null });
    }

    return NextResponse.json({ estado: "abierto", ciclo: rows[0] });
  } catch (error) {
    console.error("Error al obtener ciclo:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
