import {
  PrismaClient,
  AppointmentStatus,
  PatientType,
} from "@/lib/generated/prisma";
import {
  doctorProfiles,
  appointments,
  patient1Id,
  doctor1Id,
} from "./dummydata2";
import { prisma } from "@/db/prisma";

//const prisma = new PrismaClient();

async function main() {
  console.log("Starting to seed doctor profiles and appointments...");

  // Seed Doctor Profiles
  // This assumes the users (doctors) have already been created and their IDs are correct in the data file.
  for (const profile of doctorProfiles) {
    await prisma.doctorProfile.create({
      data: profile,
    });
  }
  console.log("Doctor profiles have been seeded successfully.");

  // Create 10 appointments for patient1Id with doctor1Id
  const appointmentsToCreate = appointments.map((appt) => ({
    ...appt,
    patientType: appt.patientType as PatientType,
    status: AppointmentStatus.COMPLETED, // Set the status as requested
    // The dummy data already uses the correct IDs for doctor and patient
  }));

  await prisma.appointment.createMany({
    data: appointmentsToCreate,
  });

  console.log(
    "10 appointments have been created successfully with COMPLETED status."
  );
  console.log("Seeding of profiles and appointments finished.");
}

main()
  .catch((e) => {
    console.error("An error occurred during seeding:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Prisma client disconnected.");
  });
