import ExcelJS from "exceljs";
import { prisma } from "../../db/client.js";
import { logger } from "../../lib/logger.js";

export interface ImportRow {
  building: string;
  apartment: string;
  resident: string;
}

export interface ImportPreview {
  buildings: string[];
  rows: ImportRow[];
  totalRows: number;
}

export interface ImportResult {
  buildingsCreated: number;
  buildingsSkipped: number;
  residentsCreated: number;
  errors: string[];
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  const lastName = parts.pop()!;
  return { firstName: parts.join(" "), lastName };
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findColumn(headers: string[], keywords: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i]);
    if (keywords.some((k) => h.includes(k))) return i;
  }
  return -1;
}

export async function previewExcel(buffer: Buffer): Promise<ImportPreview> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Le fichier Excel ne contient aucune feuille");

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell) => headers.push(String(cell.value || "").trim()));

  const buildingCol = findColumn(headers, ["batiment", "batiments", "immeuble", "residence", "bâtiment", "bâtiments"]);
  const aptCol = findColumn(headers, ["app", "appart", "appartement", "num", "n°", "numero", "logement"]);
  const resCol = findColumn(headers, ["resident", "residents", "nom", "prenom", "résident", "résidents", "habitant"]);

  if (buildingCol === -1 || aptCol === -1 || resCol === -1) {
    throw new Error(
      "Colonnes introuvables. Le fichier doit contenir les colonnes : Batiments, APP, Résidents"
    );
  }

  const rows: ImportRow[] = [];
  const buildingSet = new Set<string>();

  sheet.eachRow((row, rowIndex) => {
    if (rowIndex === 1) return;

    const building = String(row.getCell(buildingCol + 1).value || "").trim();
    const apartment = String(row.getCell(aptCol + 1).value || "").trim();
    const resident = String(row.getCell(resCol + 1).value || "").trim();

    if (!building && !apartment && !resident) return;

    if (!building || !apartment || !resident) return;

    buildingSet.add(building);
    rows.push({ building, apartment, resident });
  });

  return {
    buildings: [...buildingSet].sort(),
    rows,
    totalRows: rows.length,
  };
}

export async function importExcel(buffer: Buffer): Promise<ImportResult> {
  const result: ImportResult = {
    buildingsCreated: 0,
    buildingsSkipped: 0,
    residentsCreated: 0,
    errors: [],
  };

  const preview = await previewExcel(buffer);

  if (preview.rows.length === 0) {
    result.errors.push("Aucune ligne valide trouvée dans le fichier");
    return result;
  }

  await prisma.$transaction(async (tx) => {
    for (const name of preview.buildings) {
      const existing = await tx.building.findFirst({ where: { name } });
      if (existing) {
        result.buildingsSkipped++;
      } else {
        await tx.building.create({ data: { name, address: null } });
        result.buildingsCreated++;
      }
    }

    for (const row of preview.rows) {
      const building = await tx.building.findFirst({
        where: { name: row.building },
      });
      if (!building) {
        result.errors.push(`"${row.resident}" (App. ${row.apartment}) : bâtiment "${row.building}" introuvable`);
        continue;
      }

      const existing = await tx.resident.findFirst({
        where: { apartment: row.apartment, buildingId: building.id },
      });
      if (existing) {
        result.errors.push(
          `App. ${row.apartment} (${row.building}) : déjà attribué à ${existing.firstName} ${existing.lastName}`
        );
        continue;
      }

      const { firstName, lastName } = splitFullName(row.resident);

      await tx.resident.create({
        data: { firstName, lastName, apartment: row.apartment, buildingId: building.id },
      });
      result.residentsCreated++;
    }
  });

  logger.info(
    "import",
    `Import terminé : ${result.buildingsCreated} bâtiments créés, ${result.residentsCreated} résidents importés`
  );
  return result;
}
