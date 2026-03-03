import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { generarExcel } from "@/lib/excel";
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
      "SELECT * FROM ciclos ORDER BY id DESC LIMIT 1"
    );

    if (ciclos.length === 0) {
      return NextResponse.json({ error: "No hay ciclos" }, { status: 404 });
    }

    const ciclo = ciclos[0];
    const nombreArchivo = `Disponibilidad_Semana_${ciclo.semana}_${ciclo.ano}.xlsx`;
    const buffer = await generarExcel(ciclo.id, ciclo.semana, ciclo.ano);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      },
    });
  } catch (error) {
    console.error("Error al generar Excel:", error);
    return NextResponse.json(
      { error: "Error al generar Excel" },
      { status: 500 }
    );
  }
}
