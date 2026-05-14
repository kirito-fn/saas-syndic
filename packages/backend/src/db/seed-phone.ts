import { prisma } from "./client.js";

async function main() {
  const residents = await prisma.resident.findMany({ orderBy: { id: "asc" } });
  let updated = 0;

  for (let i = 0; i < residents.length; i++) {
    const r = residents[i];
    if (r.phone) continue;
    const phone = `+2126${String(10000000 + i * 5).slice(0, 8)}`;
    await prisma.resident.update({
      where: { id: r.id },
      data: {
        phone,
        email: `resident${r.id}@email.com`,
      },
    });
    updated++;
  }

  console.log(`${updated} residents updated with phone numbers`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
