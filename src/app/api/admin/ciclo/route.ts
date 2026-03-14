import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import mysql from "mysql2/promise";
import { generarExcel } from "@/lib/excel";
import { enviarExcelPorEmail } from "@/lib/email";

function verificarAdmin(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  if (!auth) return false;
  const password = auth.replace("Bearer ", "");
  return password === process.env.ADMIN_PASSWORD;
}

export async function POST(request: NextRequest) {
  if (!verificarAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accion } = body; // "abrir" o "cerrar"

    if (accion === "cerrar") {
      // Get current open cycle
      const [ciclos] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT * FROM ciclos WHERE estado = 'abierto' ORDER BY id DESC LIMIT 1"
      );

      if (ciclos.length === 0) {
        return NextResponse.json({ error: "No hay ciclo abierto" }, { status: 400 });
      }

      const cicloActual = ciclos[0];

      // Close the cycle
      await pool.query(
        "UPDATE ciclos SET estado = 'cerrado', fecha_cierre = NOW() WHERE id = ?",
        [cicloActual.id]
      );

      // Generate Excel and send email
      try {
        const nombreArchivo = `Disponibilidad_Semana_${cicloActual.semana}_${cicloActual.ano}.xlsx`;
        const excelBuffer = await generarExcel(cicloActual.id, cicloActual.semana, cicloActual.ano);

        const [configRows] = await pool.query<mysql.RowDataPacket[]>(
          "SELECT valor FROM config WHERE clave = 'email_receptor'"
        );
        const emailReceptor = configRows.length > 0 ? configRows[0].valor : process.env.EMAIL_TO || "";

        if (emailReceptor) {
          await enviarExcelPorEmail(excelBuffer, nombreArchivo, emailReceptor);
          return NextResponse.json({
            success: true,
            message: `Ciclo cerrado. Excel enviado a ${emailReceptor}`,
          });
        }
      } catch (emailError) {
        console.error("Error al enviar email:", emailError);
      }

      // Crear nuevo ciclo automáticamente
      const ahoraCerrar = new Date();
      const dCerrar = new Date(Date.UTC(ahoraCerrar.getFullYear(), ahoraCerrar.getMonth(), ahoraCerrar.getDate()));
      const dayNumCerrar = dCerrar.getUTCDay() || 7;
      dCerrar.setUTCDate(dCerrar.getUTCDate() + 4 - dayNumCerrar);
      const yearStartCerrar = new Date(Date.UTC(dCerrar.getUTCFullYear(), 0, 1));
      const semanaCerrar = Math.ceil(((dCerrar.getTime() - yearStartCerrar.getTime()) / 86400000 + 1) / 7);

      await pool.query(
        "INSERT INTO ciclos (semana, ano, fecha_inicio, estado) VALUES (?, ?, NOW(), 'abierto')",
        [semanaCerrar, ahoraCerrar.getFullYear()]
      );

      return NextResponse.json({ success: true, message: "Ciclo cerrado. Nuevo ciclo abierto." });
    }

    if (accion === "abrir") {
      // Close any open cycle first
      await pool.query(
        "UPDATE ciclos SET estado = 'cerrado', fecha_cierre = NOW() WHERE estado = 'abierto'"
      );

      // Create new cycle
      const ahora = new Date();
      const d = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const semana = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

      await pool.query(
        "INSERT INTO ciclos (semana, ano, fecha_inicio, estado) VALUES (?, ?, NOW(), 'abierto')",
        [semana, ahora.getFullYear()]
      );

      return NextResponse.json({
        success: true,
        message: "Nuevo ciclo abierto",
      });
    }

    return NextResponse.json(
      { error: "Acción no válida. Usa 'abrir' o 'cerrar'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error al gestionar ciclo:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
