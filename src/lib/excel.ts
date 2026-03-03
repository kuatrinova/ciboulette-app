import ExcelJS from "exceljs";
import mysql from "mysql2/promise";
import pool from "./db";

interface Disponibilidad {
  nombre_o_telefono: string;
  viernes_comida: boolean;
  viernes_cena: boolean;
  sabado_comida: boolean;
  sabado_cena: boolean;
  created_at: Date;
}

export async function generarExcel(cicloId: number, semana: number, ano: number): Promise<Buffer> {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT nombre_o_telefono, viernes_comida, viernes_cena, sabado_comida, sabado_cena, created_at FROM disponibilidades WHERE ciclo_id = ? ORDER BY created_at ASC",
    [cicloId]
  );

  const disponibilidades = rows as unknown as Disponibilidad[];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ciboulette Catering";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Disponibilidad");

  sheet.columns = [
    { header: "Nombre / Teléfono", key: "nombre", width: 30 },
    { header: "Viernes Comida", key: "viernes_comida", width: 16 },
    { header: "Viernes Cena", key: "viernes_cena", width: 14 },
    { header: "Sábado Comida", key: "sabado_comida", width: 16 },
    { header: "Sábado Cena", key: "sabado_cena", width: 14 },
    { header: "Fecha envío", key: "fecha", width: 20 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF6B7B3A" },
  };
  headerRow.alignment = { horizontal: "center" };

  for (const d of disponibilidades) {
    sheet.addRow({
      nombre: d.nombre_o_telefono,
      viernes_comida: d.viernes_comida ? "Sí" : "No",
      viernes_cena: d.viernes_cena ? "Sí" : "No",
      sabado_comida: d.sabado_comida ? "Sí" : "No",
      sabado_cena: d.sabado_cena ? "Sí" : "No",
      fecha: new Date(d.created_at).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
