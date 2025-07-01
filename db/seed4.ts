import { PrismaClient, LeaveType } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  // --- Placeholder for Doctor IDs ---
  const doctorIds = [
    "801acb38-3b13-41b3-a9c0-a5884e4dfa47", // Replace with actual doctor ID
    "aae24f98-5ade-47f8-9a2f-40caf25b830a", // Replace with actual doctor ID
    "fbb8c3af-fb70-4da8-84d5-12483748637c", // Replace with actual doctor ID
  ];

  // --- Leave Dates ---
  // Note: The script will create overlapping leave requests for the same day
  // for each doctor for demonstration purposes. In a real-world scenario,
  // you would likely only create one leave type per doctor per day.
  const leaveDate = new Date("2025-07-10T00:00:00Z");

  console.log("Setting leave for doctors...");

  // --- Set FULL_DAY Leave ---
  await prisma.doctorLeave.create({
    data: {
      doctorId: doctorIds[0],
      leaveDate: leaveDate,
      leaveType: LeaveType.FULL_DAY,
      reason: "Personal leave",
    },
  });
  console.log(
    `Set FULL_DAY leave for doctor ${
      doctorIds[0]
    } on ${leaveDate.toDateString()}`
  );

  // --- Set MORNING Leave ---
  await prisma.doctorLeave.create({
    data: {
      doctorId: doctorIds[1],
      leaveDate: leaveDate,
      leaveType: LeaveType.MORNING,
      reason: "Personal leave",
    },
  });
  console.log(
    `Set MORNING leave for doctor ${
      doctorIds[1]
    } on ${leaveDate.toDateString()}`
  );

  // --- Set AFTERNOON Leave ---
  await prisma.doctorLeave.create({
    data: {
      doctorId: doctorIds[2],
      leaveDate: leaveDate,
      leaveType: LeaveType.AFTERNOON,
      reason: "Personal leave",
    },
  });
  console.log(
    `Set AFTERNOON leave for doctor ${
      doctorIds[2]
    } on ${leaveDate.toDateString()}`
  );

  console.log("Leave setting finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
