import { prisma } from "./client.js";
import bcrypt from "bcryptjs";

const ADMIN_EMAIL = "admin@syndic.ma";
const ADMIN_PASSWORD = "admin123";

const MANAGER_PASSWORD = "manager123";

const BUILDING_NAMES = [
  "Résidence Al Amal",
  "Résidence Al Firdaous",
  "Résidence Al Houda",
  "Résidence Al Imane",
  "Résidence Al Karama",
  "Résidence Al Manar",
  "Résidence Al Mohammadi",
  "Résidence Al Oumara",
  "Résidence Al Salam",
  "Résidence Al Wifaq",
];

const FIRST_NAMES = [
  "Ahmed", "Fatima", "Mohamed", "Amina", "Hassan",
  "Khadija", "Omar", "Saida", "Ali", "Nadia",
  "Youssef", "Zineb", "Ibrahim", "Malika", "Rachid",
  "Samira", "Abdelilah", "Latifa", "Karim", "Hind",
];

const LAST_NAMES = [
  "Alaoui", "Benani", "Cherkaoui", "Daoudi", "El Fassi",
  "El Idrissi", "El Khattabi", "El Ouafi", "Faris", "Guedira",
  "Hamidi", "Jaidi", "Kabbaj", "Lahlou", "Moussaoui",
  "Naciri", "Ouazzani", "Rherrabi", "Senhaji", "Tazi",
];

async function main() {
  console.log("Seeding database...");

  await prisma.payment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.resident.deleteMany();
  await prisma.user.deleteMany();
  await prisma.building.deleteMany();

  const hashedAdminPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      password: hashedAdminPassword,
      name: "Super Admin",
      role: "ADMIN",
    },
  });
  console.log(`Admin created: ${admin.email}`);

  const hashedManagerPassword = await bcrypt.hash(MANAGER_PASSWORD, 12);

  let firstBuildingId: number | undefined;

  for (let i = 0; i < 10; i++) {
    const building = await prisma.building.create({
      data: {
        name: BUILDING_NAMES[i],
        address: `${i + 1} Avenue Mohammed V, Casablanca`,
      },
    });
    if (i === 0) firstBuildingId = building.id;

    const manager = await prisma.user.create({
      data: {
        email: `manager${i + 1}@syndic.ma`,
        password: hashedManagerPassword,
        name: `Gestionnaire ${BUILDING_NAMES[i].split("Al ")[1] || BUILDING_NAMES[i]}`,
        role: "MANAGER",
        buildingId: building.id,
      },
    });
    console.log(`Manager created: ${manager.email} → ${building.name}`);

    for (let j = 0; j < 5; j++) {
      const phoneBase = `+2126${String(10000000 + i * 5 + j).slice(0, 8)}`;
      const resident = await prisma.resident.create({
        data: {
          firstName: FIRST_NAMES[i * 2 + (j % 2)] || "Résident",
          lastName: LAST_NAMES[(i + j) % LAST_NAMES.length],
          apartment: `App ${(i + 1) * 100 + j + 1}`,
          phone: phoneBase,
          email: `resident${i * 5 + j + 1}@email.com`,
          buildingId: building.id,
        },
      });

      await prisma.payment.create({
        data: {
          residentId: resident.id,
          buildingId: building.id,
          month: 4,
          year: 2026,
          amount: 100,
          status: j === 0 ? "PAID" : j === 1 ? "PENDING" : "UNPAID",
          declaredById: j <= 1 ? manager.id : undefined,
          verifiedById: j === 0 ? admin.id : undefined,
          declaredAt: j <= 1 ? new Date() : undefined,
          verifiedAt: j === 0 ? new Date() : undefined,
        },
      });
    }
  }

  await prisma.expense.create({
    data: {
      title: "Électricité parties communes",
      description: "Facture ONE Mai 2026",
      amount: 1500,
      date: new Date("2026-05-01"),
      createdById: admin.id,
    },
  });

  await prisma.expense.create({
    data: {
      title: "Nettoyage",
      description: "Service de nettoyage mensuel",
      amount: 800,
      date: new Date("2026-05-02"),
      buildingId: firstBuildingId,
      createdById: admin.id,
    },
  });

  console.log("Seed completed!");
  console.log("Admin credentials: admin@syndic.ma / admin123");
  console.log("Manager credentials: manager1@syndic.ma / manager123");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
