import { NextRequest, NextResponse } from "next/server";
import { ejecutarCierreSemanal } from "@/lib/cron";

export async function POST(request: NextRequest) {
  try {
    // Verificar secret
    const auth = request.headers.get("authorization");
    const secret = auth?.replace("Bearer ", "");

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const resultado = await ejecutarCierreSemanal();
    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error en cron:", error);
    return NextResponse.json(
      { error: "Error al ejecutar cierre semanal", details: String(error) },
      { status: 500 }
    );
  }
}
