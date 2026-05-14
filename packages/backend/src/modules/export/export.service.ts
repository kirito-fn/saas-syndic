import ExcelJS from "exceljs";
import { prisma } from "../../db/client.js";

const MONTHLY_FEE = 100;
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export async function generateMonthlyReport(month: number, year: number, role: string, buildingId: number | null) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Syndic Gestion";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Rapport ${MONTHS_FR[month - 1]} ${year}`);

  // Column widths
  sheet.columns = [
    { header: "", key: "label", width: 30 },
    { header: "", key: "value", width: 20 },
    { header: "", key: "extra", width: 20 },
  ];

  // --- Title ---
  sheet.mergeCells("A1:C1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `Rapport Mensuel — ${MONTHS_FR[month - 1]} ${year}`;
  titleCell.font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 40;

  // --- Subtitle ---
  sheet.mergeCells("A2:C2");
  const subCell = sheet.getCell("A2");
  subCell.value = "Syndic Gestion — Application de gestion des paiements";
  subCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF6B7280" } };
  subCell.alignment = { horizontal: "center" };
  sheet.getRow(2).height = 22;

  // --- Stats section ---
  const statsStartRow = 4;
  sheet.mergeCells(`A${statsStartRow}:C${statsStartRow}`);
  const statsHeader = sheet.getCell(`A${statsStartRow}`);
  statsHeader.value = "RÉSUMÉ GLOBAL";
  statsHeader.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF059669" } };
  statsHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
  statsHeader.border = {
    top: { style: "thin", color: { argb: "FF059669" } },
    bottom: { style: "thin", color: { argb: "FF059669" } },
  };

  const buildingsQuery = role === "MANAGER" && buildingId
    ? { where: { id: buildingId } }
    : {};

  const buildings = await prisma.building.findMany({
    ...buildingsQuery,
    include: {
      _count: { select: { residents: true, payments: true } },
    },
  });

  const totalResidents = buildings.reduce((sum, b) => sum + b._count.residents, 0);

  const payments = await prisma.payment.findMany({
    where: {
      month,
      year,
      ...(role === "MANAGER" && buildingId ? { buildingId } : {}),
    },
  });

  const totalPayments = payments.length;
  const totalPaid = payments.filter((p) => p.status === "PAID").length;
  const totalPending = payments.filter((p) => p.status === "PENDING").length;
  const totalUnpaid = payments.filter((p) => p.status === "UNPAID").length;
  const totalCollected = totalPaid * MONTHLY_FEE;

  const expenses = await prisma.expense.findMany({
    where: {
      date: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      },
      ...(role === "MANAGER" && buildingId ? { buildingId } : {}),
    },
  });
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const statsRows = [
    ["Bâtiments", buildings.length, ""],
    ["Résidents", totalResidents, ""],
    ["Total paiements", totalPayments, ""],
    ["Payés / Vérifiés", totalPaid, `${totalPaid * MONTHLY_FEE} MAD`],
    ["En attente", totalPending, ""],
    ["Impayés", totalUnpaid, `${totalUnpaid * MONTHLY_FEE} MAD`],
    ["Total encaissé", "", `${totalCollected} MAD`],
    ["Total charges", "", `${totalExpenses} MAD`],
    ["Solde", "", `${totalCollected - totalExpenses} MAD`],
  ];

  statsRows.forEach((row, idx) => {
    const rowNum = statsStartRow + 1 + idx;
    sheet.getCell(`A${rowNum}`).value = row[0];
    sheet.getCell(`B${rowNum}`).value = row[1] !== "" ? row[1] : undefined;
    sheet.getCell(`C${rowNum}`).value = row[2] !== "" ? row[2] : undefined;
    sheet.getRow(rowNum).getCell(1).font = { name: "Calibri", size: 11 };
    sheet.getRow(rowNum).getCell(2).font = { name: "Calibri", size: 11, bold: true };
    sheet.getRow(rowNum).getCell(3).font = { name: "Calibri", size: 11, bold: true };
    if (idx === statsRows.length - 1) {
      sheet.getRow(rowNum).getCell(3).font = {
        name: "Calibri", size: 11, bold: true,
        color: { argb: totalCollected - totalExpenses >= 0 ? "FF059669" : "FFDC2626" },
      };
    }
  });

  // --- Building breakdown ---
  const buildingStart = statsStartRow + statsRows.length + 2;
  sheet.mergeCells(`A${buildingStart}:C${buildingStart}`);
  const buildingHeader = sheet.getCell(`A${buildingStart}`);
  buildingHeader.value = "DÉTAIL PAR BÂTIMENT";
  buildingHeader.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF059669" } };
  buildingHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };

  const buildingTableStart = buildingStart + 1;
  const headers = ["Bâtiment", "Résidents", "Payés / Total"];
  headers.forEach((h, i) => {
    const cell = sheet.getCell(String.fromCharCode(65 + i) + buildingTableStart);
    cell.value = h;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };
    cell.border = {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    };
  });

  for (const building of buildings) {
    const bPayments = payments.filter((p) => p.buildingId === building.id);
    const bPaid = bPayments.filter((p) => p.status === "PAID").length;
    const bTotal = bPayments.length;
    const rowNum = buildingTableStart + buildings.indexOf(building) + 1;
    sheet.getCell(`A${rowNum}`).value = building.name;
    sheet.getCell(`B${rowNum}`).value = building._count.residents;
    sheet.getCell(`C${rowNum}`).value = `${bPaid} / ${bTotal}`;
    [0, 1, 2].forEach((ci) => {
      const cell = sheet.getCell(String.fromCharCode(65 + ci) + rowNum);
      cell.font = { name: "Calibri", size: 10 };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  }

  // --- Recent payments ---
  const paymentStart = buildingTableStart + buildings.length + 2;
  sheet.mergeCells(`A${paymentStart}:C${paymentStart}`);
  const paymentHeader = sheet.getCell(`A${paymentStart}`);
  paymentHeader.value = "PAIEMENTS RÉCENTS";
  paymentHeader.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF059669" } };
  paymentHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };

  const paymentTableStart = paymentStart + 1;
  ["Résident", "Montant", "Statut"].forEach((h, i) => {
    const cell = sheet.getCell(String.fromCharCode(65 + i) + paymentTableStart);
    cell.value = h;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };
  });

  const recentPaymentsQuery = await prisma.payment.findMany({
    where: {
      month,
      year,
      ...(role === "MANAGER" && buildingId ? { buildingId } : {}),
    },
    include: {
      resident: { select: { firstName: true, lastName: true, apartment: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  for (const payment of recentPaymentsQuery) {
    const rowNum = paymentTableStart + recentPaymentsQuery.indexOf(payment) + 1;
    sheet.getCell(`A${rowNum}`).value = `${payment.resident.firstName} ${payment.resident.lastName} (${payment.resident.apartment})`;
    sheet.getCell(`B${rowNum}`).value = `${MONTHLY_FEE} MAD`;
    sheet.getCell(`C${rowNum}`).value =
      payment.status === "PAID" ? "Payé" :
      payment.status === "PENDING" ? "En attente" : "Impayé";
    [0, 1, 2].forEach((ci) => {
      const cell = sheet.getCell(String.fromCharCode(65 + ci) + rowNum);
      cell.font = { name: "Calibri", size: 10 };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  }

  // --- Footer ---
  const footerRow = paymentTableStart + recentPaymentsQuery.length + 2;
  sheet.mergeCells(`A${footerRow}:C${footerRow}`);
  const footerCell = sheet.getCell(`A${footerRow}`);
  footerCell.value = `Généré le ${new Date().toLocaleDateString("fr-FR")} — Syndic Gestion`;
  footerCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF9CA3AF" } };
  footerCell.alignment = { horizontal: "center" };

  return workbook;
}
