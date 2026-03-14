import ExcelJS from "exceljs";
import mysql from "mysql2/promise";
import pool from "./db";

interface EventoConAsignaciones {
  id: number;
  dia: string;
  turno: string;
  finca: string;
  num_camareros: number;
  camareros: string[];
}

const DIAS_SEMANA = [
  { key: "lunes", label: "LUNES" },
  { key: "martes", label: "MARTES" },
  { key: "miercoles", label: "MIERCOLES" },
  { key: "jueves", label: "JUEVES" },
  { key: "viernes", label: "VIERNES" },
  { key: "sabado", label: "SABADO" },
  { key: "domingo", label: "DOMINGO" },
];

const TURNOS_LABEL: Record<string, string> = {
  comida: "COMIDA",
  cena: "CENA",
};

// Fincas que tienen hoja dedicada (con columna B extra)
const FINCAS_DEDICADAS = ["FINCA EL CHAPARRAL", "FINCA CHAPARRAL", "FINCA SOTO", "FINCA EL SOTO DE MOZANAQUE"];

function esFincaDedicada(finca: string): string | null {
  const fincaUpper = finca.toUpperCase();
  if (fincaUpper.includes("CHAPARRAL")) return "CHAPARRAL";
  if (fincaUpper.includes("SOTO")) return "SOTO";
  return null;
}

function calcularFechasDeSemana(semana: number, ano: number): Record<string, string> {
  const simple = new Date(ano, 0, 1 + (semana - 1) * 7);
  const dow = simple.getDay();
  const lunes = new Date(simple);
  if (dow <= 4) {
    lunes.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    lunes.setDate(simple.getDate() + 8 - simple.getDay());
  }

  const fechas: Record<string, string> = {};
  const diasKeys = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  for (let i = 0; i < 7; i++) {
    const fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + i);
    fechas[diasKeys[i]] = fecha.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return fechas;
}

// Fecha en formato DDMMYY para nombres de hojas de finca
function calcularFechaCorta(semana: number, ano: number, dia: string): string {
  const simple = new Date(ano, 0, 1 + (semana - 1) * 7);
  const dow = simple.getDay();
  const lunes = new Date(simple);
  if (dow <= 4) {
    lunes.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    lunes.setDate(simple.getDate() + 8 - simple.getDay());
  }
  const diasKeys = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  const idx = diasKeys.indexOf(dia);
  const fecha = new Date(lunes);
  fecha.setDate(lunes.getDate() + (idx >= 0 ? idx : 0));
  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const yy = String(fecha.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

const BORDER_THIN = {
  top: { style: "thin" as const, color: { argb: "FF999999" } },
  bottom: { style: "thin" as const, color: { argb: "FF999999" } },
  left: { style: "thin" as const, color: { argb: "FF999999" } },
  right: { style: "thin" as const, color: { argb: "FF999999" } },
};

const BORDER_LIGHT = {
  top: { style: "thin" as const, color: { argb: "FFDDDDDD" } },
  bottom: { style: "thin" as const, color: { argb: "FFDDDDDD" } },
  left: { style: "thin" as const, color: { argb: "FFDDDDDD" } },
  right: { style: "thin" as const, color: { argb: "FFDDDDDD" } },
};

// ========== HOJAS DIARIAS (5 columnas: Nº, NOMBRE, HORA, A, HORAS) ==========

function escribirCabeceraDiaria(sheet: ExcelJS.Worksheet, titulo: string) {
  sheet.getColumn(1).width = 6;   // Nº
  sheet.getColumn(2).width = 35;  // NOMBRE
  sheet.getColumn(3).width = 10;  // HORA
  sheet.getColumn(4).width = 6;   // A
  sheet.getColumn(5).width = 10;  // HORAS

  // Fila 1: CIBOULETTE
  sheet.mergeCells("A1:E1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "CIBOULETTE";
  titleCell.font = { bold: true, size: 16, color: { argb: "FF6B7B3A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;

  // Fila 3: Día + fecha
  sheet.mergeCells("A3:E3");
  const diaCell = sheet.getCell("A3");
  diaCell.value = titulo;
  diaCell.font = { bold: true, size: 12, color: { argb: "FF333333" } };
  diaCell.alignment = { horizontal: "center", vertical: "middle" };
}

function escribirBloqueEventoDiario(
  sheet: ExcelJS.Worksheet,
  evento: EventoConAsignaciones,
  turnoLabel: string,
  startRow: number,
  esListado: boolean
): number {
  let currentRow = startRow;
  const numCols = 5;

  // Barra verde: TURNO — FINCA (X cam) o TURNO — FINCA — LISTADO
  sheet.mergeCells(`A${currentRow}:E${currentRow}`);
  const barraCell = sheet.getCell(`A${currentRow}`);
  const textoFinca = evento.finca.toUpperCase();
  if (esListado) {
    barraCell.value = `${turnoLabel} — ${textoFinca}    LISTADO`;
  } else {
    barraCell.value = `${turnoLabel} — ${textoFinca}    (${evento.num_camareros} cam)`;
  }
  barraCell.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  barraCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6B7B3A" } };
  barraCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(currentRow).height = 30;
  currentRow += 2;

  // Si es listado (finca dedicada), no poner tabla aquí
  if (esListado) {
    return currentRow;
  }

  // Cabecera de tabla: Nº, NOMBRE, HORA, A, HORAS
  const tableHeaders = ["Nº", "NOMBRE", "HORA", "A", "HORAS"];
  const headerRow = sheet.getRow(currentRow);
  tableHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6B7B3A" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = BORDER_THIN;
  });
  currentRow++;

  // Filas de camareros
  const totalFilas = Math.max(evento.num_camareros, evento.camareros.length);
  for (let i = 0; i < totalFilas; i++) {
    const row = sheet.getRow(currentRow);
    const nombre = evento.camareros[i] || "";

    const valores = [i + 1, nombre, "", "", ""];
    valores.forEach((val, j) => {
      const cell = row.getCell(j + 1);
      cell.value = val;
      cell.border = BORDER_LIGHT;
      cell.font = { size: 10 };
      if (j === 0) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { size: 10, color: { argb: "FF999999" } };
      } else if (j === 1) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
        if (nombre) cell.font = { size: 10, color: { argb: "FF333333" } };
      } else {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });

    if (i % 2 === 1) {
      for (let j = 1; j <= numCols; j++) {
        row.getCell(j).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9F9F6" } };
      }
    }
    currentRow++;
  }

  return currentRow + 2;
}

function escribirTablaDiariaVacia(sheet: ExcelJS.Worksheet, startRow: number, numFilas: number): number {
  let currentRow = startRow;
  const tableHeaders = ["Nº", "NOMBRE", "HORA", "A", "HORAS"];
  const headerRow = sheet.getRow(currentRow);
  tableHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6B7B3A" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = BORDER_THIN;
  });
  currentRow++;

  for (let i = 0; i < numFilas; i++) {
    const row = sheet.getRow(currentRow);
    [i + 1, "", "", "", ""].forEach((val, j) => {
      const cell = row.getCell(j + 1);
      cell.value = val;
      cell.border = BORDER_LIGHT;
      cell.font = { size: 10 };
      if (j === 0) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { size: 10, color: { argb: "FF999999" } };
      } else {
        cell.alignment = { horizontal: j === 1 ? "left" : "center", vertical: "middle" };
      }
    });
    if (i % 2 === 1) {
      for (let j = 1; j <= 5; j++) {
        row.getCell(j).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9F9F6" } };
      }
    }
    currentRow++;
  }

  return currentRow;
}

// ========== HOJAS FINCA DEDICADA (6 columnas: Nº, NOMBRE, HORA, A, B, HORAS) ==========

function escribirCabeceraFinca(sheet: ExcelJS.Worksheet, titulo: string) {
  sheet.getColumn(1).width = 6;   // Nº
  sheet.getColumn(2).width = 35;  // NOMBRE
  sheet.getColumn(3).width = 10;  // HORA
  sheet.getColumn(4).width = 6;   // A
  sheet.getColumn(5).width = 6;   // B
  sheet.getColumn(6).width = 10;  // HORAS

  // Fila 1: CIBOULETTE
  sheet.mergeCells("A1:F1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "CIBOULETTE";
  titleCell.font = { bold: true, size: 16, color: { argb: "FF6B7B3A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;

  // Fila 3: Nombre finca
  sheet.mergeCells("A3:F3");
  const diaCell = sheet.getCell("A3");
  diaCell.value = titulo;
  diaCell.font = { bold: true, size: 12, color: { argb: "FF333333" } };
  diaCell.alignment = { horizontal: "center", vertical: "middle" };
}

function escribirBloqueEventoFinca(
  sheet: ExcelJS.Worksheet,
  evento: EventoConAsignaciones,
  turnoLabel: string,
  diaLabel: string,
  startRow: number
): number {
  let currentRow = startRow;
  const numCols = 6;

  // Barra verde: DIA — TURNO (X cam)
  sheet.mergeCells(`A${currentRow}:F${currentRow}`);
  const barraCell = sheet.getCell(`A${currentRow}`);
  barraCell.value = `${diaLabel} — ${turnoLabel}    (${evento.num_camareros} cam)`;
  barraCell.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  barraCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6B7B3A" } };
  barraCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(currentRow).height = 30;
  currentRow += 2;

  // Cabecera de tabla: Nº, NOMBRE, HORA, A, B, HORAS
  const tableHeaders = ["Nº", "NOMBRE", "HORA", "A", "B", "HORAS"];
  const headerRow = sheet.getRow(currentRow);
  tableHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6B7B3A" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = BORDER_THIN;
  });
  currentRow++;

  // Filas de camareros
  const totalFilas = Math.max(evento.num_camareros, evento.camareros.length);
  for (let i = 0; i < totalFilas; i++) {
    const row = sheet.getRow(currentRow);
    const nombre = evento.camareros[i] || "";

    const valores = [i + 1, nombre, "", "", "", ""];
    valores.forEach((val, j) => {
      const cell = row.getCell(j + 1);
      cell.value = val;
      cell.border = BORDER_LIGHT;
      cell.font = { size: 10 };
      if (j === 0) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { size: 10, color: { argb: "FF999999" } };
      } else if (j === 1) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
        if (nombre) cell.font = { size: 10, color: { argb: "FF333333" } };
      } else {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });

    if (i % 2 === 1) {
      for (let j = 1; j <= numCols; j++) {
        row.getCell(j).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9F9F6" } };
      }
    }
    currentRow++;
  }

  return currentRow + 2;
}

// ========== GENERADOR PRINCIPAL ==========

export async function generarExcelAsignacion(cicloId: number, semana: number, ano: number): Promise<Buffer> {
  const [eventosRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT e.id, e.dia, e.turno, e.finca, e.num_camareros
     FROM eventos e
     WHERE e.ciclo_id = ?
     ORDER BY FIELD(e.dia, 'lunes','martes','miercoles','jueves','viernes','sabado','domingo'),
              FIELD(e.turno, 'comida', 'cena'), e.finca`,
    [cicloId]
  );

  const eventos: EventoConAsignaciones[] = [];
  for (const ev of eventosRows) {
    const [camRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT d.nombre_o_telefono
       FROM asignaciones a
       JOIN disponibilidades d ON a.disponibilidad_id = d.id
       WHERE a.evento_id = ?
       ORDER BY d.nombre_o_telefono`,
      [ev.id]
    );
    eventos.push({
      id: ev.id,
      dia: ev.dia,
      turno: ev.turno,
      finca: ev.finca,
      num_camareros: ev.num_camareros,
      camareros: camRows.map((c) => c.nombre_o_telefono),
    });
  }

  // Agrupar por dia
  const eventosPorDia: Record<string, EventoConAsignaciones[]> = {};
  for (const ev of eventos) {
    if (!eventosPorDia[ev.dia]) eventosPorDia[ev.dia] = [];
    eventosPorDia[ev.dia].push(ev);
  }

  // Agrupar eventos de fincas dedicadas
  const eventosChaparral: EventoConAsignaciones[] = [];
  const eventosSoto: EventoConAsignaciones[] = [];
  for (const ev of eventos) {
    const tipo = esFincaDedicada(ev.finca);
    if (tipo === "CHAPARRAL") eventosChaparral.push(ev);
    else if (tipo === "SOTO") eventosSoto.push(ev);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ciboulette Catering";
  workbook.created = new Date();

  const fechas = calcularFechasDeSemana(semana, ano);

  // ===== HOJAS DIARIAS (Lunes a Domingo) =====
  for (const { key: dia, label } of DIAS_SEMANA) {
    const sheetName = `${label} ${fechas[dia]?.replace(/\//g, "-") || ""}`.substring(0, 31);
    const sheet = workbook.addWorksheet(sheetName);

    escribirCabeceraDiaria(sheet, `${label} ${fechas[dia] || ""}`);

    const eventosDelDia = eventosPorDia[dia];

    if (!eventosDelDia || eventosDelDia.length === 0) {
      let currentRow = 5;
      currentRow = escribirTablaDiariaVacia(sheet, currentRow, 10);
      void currentRow;
    } else {
      const eventosPorTurno: Record<string, EventoConAsignaciones[]> = {};
      for (const ev of eventosDelDia) {
        if (!eventosPorTurno[ev.turno]) eventosPorTurno[ev.turno] = [];
        eventosPorTurno[ev.turno].push(ev);
      }

      let currentRow = 5;

      for (const turno of ["comida", "cena"]) {
        const eventosDelTurno = eventosPorTurno[turno];
        if (!eventosDelTurno || eventosDelTurno.length === 0) continue;

        for (const evento of eventosDelTurno) {
          const esListado = esFincaDedicada(evento.finca) !== null;
          currentRow = escribirBloqueEventoDiario(sheet, evento, TURNOS_LABEL[turno], currentRow, esListado);
        }
      }
    }
  }

  // ===== HOJA CHAPARRAL =====
  if (eventosChaparral.length > 0) {
    // Usar la fecha del primer evento para el nombre de la hoja
    const primerEvento = eventosChaparral[0];
    const fechaCorta = calcularFechaCorta(semana, ano, primerEvento.dia);
    const sheetName = `CHAPARRAL ${fechaCorta}`;
    const sheet = workbook.addWorksheet(sheetName);

    escribirCabeceraFinca(sheet, "FINCA EL CHAPARRAL");

    let currentRow = 5;
    for (const evento of eventosChaparral) {
      const diaInfo = DIAS_SEMANA.find((d) => d.key === evento.dia);
      const diaLabel = diaInfo?.label || evento.dia.toUpperCase();
      currentRow = escribirBloqueEventoFinca(sheet, evento, TURNOS_LABEL[evento.turno], diaLabel, currentRow);
    }
  }

  // ===== HOJA SOTO =====
  if (eventosSoto.length > 0) {
    const primerEvento = eventosSoto[0];
    const fechaCorta = calcularFechaCorta(semana, ano, primerEvento.dia);
    const sheetName = `SOTO ${fechaCorta}`;
    const sheet = workbook.addWorksheet(sheetName);

    escribirCabeceraFinca(sheet, "FINCA EL SOTO DE MOZANAQUE");

    let currentRow = 5;
    for (const evento of eventosSoto) {
      const diaInfo = DIAS_SEMANA.find((d) => d.key === evento.dia);
      const diaLabel = diaInfo?.label || evento.dia.toUpperCase();
      currentRow = escribirBloqueEventoFinca(sheet, evento, TURNOS_LABEL[evento.turno], diaLabel, currentRow);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
