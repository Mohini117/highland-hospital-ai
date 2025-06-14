import { prisma } from "@/db/prisma";
import { testimonials } from "./dummydata2";

//const prisma = new PrismaClient();

async function main() {
  console.log("Starting to seed testimonials...");

  // The 'testimonials' array from your dummy data file already contains
  // the correct foreign keys (appointmentId, doctorId, patientId).
  // We can directly use this data to create the new records.

  // Using a loop to create testimonials one by one to ensure
  // that the relations are correctly handled and for better error tracking.
  for (const testimonialData of testimonials) {
    await prisma.doctorTestimonial.create({
      data: testimonialData,
    });
  }

  // Alternatively, you can use createMany for bulk insertion if your database provider supports it
  // for relations. However, a loop is safer for ensuring relational integrity.
  /*
  await prisma.doctorTestimonial.createMany({
    data: testimonials,
    skipDuplicates: true, // Optional: useful if you might run the seed script multiple times
  });
  */

  console.log("10 testimonials have been created successfully.");
  console.log("Seeding of testimonials finished.");
}

main()
  .catch((e) => {
    console.error("An error occurred during the seeding of testimonials:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Prisma client disconnected.");
  });
