import { Role } from "@/lib/generated/prisma";
import { prisma } from "@/db/prisma";
import {
  users,
  departments,
  bannerImages,
  appSettings,
  workingDays,
  doctorProfiles,
} from "./dummydata2";

//const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding ...");

  // Seed Users
  for (const user of users) {
    await prisma.user.create({
      data: {
        ...user,
      },
    });
  }
  console.log("Users seeded.");

  // Seed Departments
  await prisma.department.createMany({
    data: departments,
  });
  console.log("Departments seeded.");

  // Seed Banner Images
  await prisma.bannerImage.createMany({
    data: bannerImages,
  });
  console.log("Banner images seeded.");

  // Seed App Settings
  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: appSettings,
    create: appSettings,
  });
  console.log("App settings seeded.");

  // Seed Working Days
  for (const day of workingDays) {
    await prisma.workingDay.upsert({
      where: { dayOfWeek: day.dayOfWeek },
      update: { isWorkingDay: day.isWorkingDay },
      create: day,
    });
  }
  console.log("Working days seeded.");

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
