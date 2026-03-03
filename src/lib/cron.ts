import pool from "./db";
import { generarExcel } from "./excel";
import { enviarExcelPorEmail } from "./email";
import mysql from "mysql2/promise";

export async function ejecutarCierreSemanal() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Obtener ciclo abierto actual
    const [ciclos] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT * FROM ciclos WHERE estado = 'abierto' ORDER BY id DESC LIMIT 1"
    );

    if (ciclos.length === 0) {
      throw new Error("No hay ciclo abierto");
    }

    const cicloActual = ciclos[0];

    // 2. Cerrar el ciclo actual
    await connection.query(
      "UPDATE ciclos SET estado = 'cerrado', fecha_cierre = NOW() WHERE id = ?",
      [cicloActual.id]
    );

    // 3. Generar Excel
    const nombreArchivo = `Disponibilidad_Semana_${cicloActual.semana}_${cicloActual.ano}.xlsx`;
    const excelBuffer = await generarExcel(
      cicloActual.id,
      cicloActual.semana,
      cicloActual.ano
    );

    // 4. Obtener email receptor de config
    const [configRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT valor FROM config WHERE clave = 'email_receptor'"
    );
    const emailReceptor =
      configRows.length > 0
        ? configRows[0].valor
        : process.env.EMAIL_RECEPTOR || "";

    // 5. Enviar email
    if (emailReceptor) {
      await enviarExcelPorEmail(excelBuffer, nombreArchivo, emailReceptor);
    }

    // 6. Crear nuevo ciclo
    const ahora = new Date();
    const semana = getWeekNumber(ahora);
    await connection.query(
      "INSERT INTO ciclos (semana, ano, fecha_inicio, estado) VALUES (?, ?, NOW(), 'abierto')",
      [semana, ahora.getFullYear()]
    );

    await connection.commit();

    return {
      success: true,
      message: `Ciclo semana ${cicloActual.semana} cerrado. Excel enviado a ${emailReceptor}. Nuevo ciclo abierto.`,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
