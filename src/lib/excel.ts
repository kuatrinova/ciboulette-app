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

  // Definir anchos de columnas: Nº, NOMBRE, Vie Com, Vie Cen, Sáb Com, Sáb Cen, Observaciones
  sheet.getColumn(1).width = 6;   // Nº
  sheet.getColumn(2).width = 30;  // NOMBRE
  sheet.getColumn(3).width = 12;  // Vie Comida
  sheet.getColumn(4).width = 12;  // Vie Cena
  sheet.getColumn(5).width = 12;  // Sáb Comida
  sheet.getColumn(6).width = 12;  // Sáb Cena
  sheet.getColumn(7).width = 20;  // Observaciones

  // --- Fila 1: "CIBOULETTE" centrado y grande ---
  sheet.mergeCells("A1:G1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "CIBOULETTE";
  titleCell.font = { bold: true, size: 18, color: { argb: "FF6B7B3A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 35;

  // --- Fila 2: vacía ---

  // --- Fila 3: Fecha + "LISTADO" ---
  const ahora = new Date();
  const fechaFormateada = ahora.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  sheet.mergeCells("A3:C3");
  const fechaCell = sheet.getCell("A3");
  fechaCell.value = fechaFormateada;
  fechaCell.font = { size: 11, color: { argb: "FF555555" } };
  fechaCell.alignment = { horizontal: "left", vertical: "middle" };

  sheet.mergeCells("D3:G3");
  const listadoCell = sheet.getCell("D3");
  listadoCell.value = `LISTADO - Semana ${semana} / ${ano}`;
  listadoCell.font = { bold: true, size: 11, color: { argb: "FF6B7B3A" } };
  listadoCell.alignment = { horizontal: "right", vertical: "middle" };

  // --- Fila 4: vacía ---

  // --- Fila 5: Cabeceras de columnas ---
  const headerRowNum = 5;
  const headers = ["Nº", "NOMBRE", "Vie Com", "Vie Cen", "Sáb Com", "Sáb Cen", "Observaciones"];
  const headerRow = sheet.getRow(headerRowNum);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF6B7B3A" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF999999" } },
      bottom: { style: "thin", color: { argb: "FF999999" } },
      left: { style: "thin", color: { argb: "FF999999" } },
      right: { style: "thin", color: { argb: "FF999999" } },
    };
  });
  headerRow.height = 22;

  // --- Filas de datos ---
  disponibilidades.forEach((d, index) => {
    const rowNum = headerRowNum + 1 + index;
    const row = sheet.getRow(rowNum);

    const values = [
      index + 1,
      d.nombre_o_telefono,
      d.viernes_comida ? "Sí" : "",
      d.viernes_cena ? "Sí" : "",
      d.sabado_comida ? "Sí" : "",
      d.sabado_cena ? "Sí" : "",
      "", // Observaciones vacío
    ];

    values.forEach((val, i) => {
      const cell = row.getCell(i + 1);
      cell.value = val;
      cell.border = {
        top: { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
        left: { style: "thin", color: { argb: "FFCCCCCC" } },
        right: { style: "thin", color: { argb: "FFCCCCCC" } },
      };

      if (i === 0) {
        // Nº
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { size: 10, color: { argb: "FF777777" } };
      } else if (i === 1) {
        // NOMBRE
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.font = { size: 10 };
      } else if (i >= 2 && i <= 5) {
        // Turnos
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { size: 10, bold: val === "Sí", color: { argb: val === "Sí" ? "FF6B7B3A" : "FFAAAAAA" } };
        if (val === "Sí") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE8EBD8" },
          };
        }
      } else {
        // Observaciones
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.font = { size: 10 };
      }
    });

    // Alternar color de fondo para filas pares
    if (index % 2 === 1) {
      for (let i = 1; i <= 7; i++) {
        const cell = row.getCell(i);
        if (!cell.fill || (cell.fill as ExcelJS.FillPattern).fgColor?.argb !== "FFE8EBD8") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9F9F6" },
          };
        }
      }
    }
  });

  // --- Fila resumen al final ---
  const resumenRowNum = headerRowNum + 1 + disponibilidades.length + 1;
  const resumenRow = sheet.getRow(resumenRowNum);
  resumenRow.getCell(1).value = "";
  resumenRow.getCell(2).value = `Total: ${disponibilidades.length} camareros`;
  resumenRow.getCell(2).font = { bold: true, size: 10, color: { argb: "FF6B7B3A" } };

  // Contar totales por turno
  const totales = {
    viernes_comida: disponibilidades.filter(d => d.viernes_comida).length,
    viernes_cena: disponibilidades.filter(d => d.viernes_cena).length,
    sabado_comida: disponibilidades.filter(d => d.sabado_comida).length,
    sabado_cena: disponibilidades.filter(d => d.sabado_cena).length,
  };

  resumenRow.getCell(3).value = totales.viernes_comida;
  resumenRow.getCell(4).value = totales.viernes_cena;
  resumenRow.getCell(5).value = totales.sabado_comida;
  resumenRow.getCell(6).value = totales.sabado_cena;

  for (let i = 3; i <= 6; i++) {
    resumenRow.getCell(i).font = { bold: true, size: 10, color: { argb: "FF6B7B3A" } };
    resumenRow.getCell(i).alignment = { horizontal: "center" };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
