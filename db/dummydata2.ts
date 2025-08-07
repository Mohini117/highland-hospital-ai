import { Role } from "@/lib/generated/prisma";

// This file contains dummy data for your Prisma schema.
// You can use this in a seed script to populate your database for development and testing.
//
// HOW TO USE:
// 1. First, create all users from the `users` array.
// 2. Then, you'll need to query the database to get the actual, auto-generated IDs
//    for specific users (like 'John Doe' and 'Dr. Alice Williams') to use in the
//    subsequent creation of profiles, appointments, and testimonials.
//
// For simplicity, this file uses placeholder string IDs. You'll need to adapt
// the logic in your seed script to use the actual IDs.

// --- Placeholder IDs (for demonstration purposes) ---
// In a real script, you'd capture these from the database create operations.

export const patient1Id = "b914f2c1-9cc0-4f35-8c8c-34282aa43e56";
export const doctor1Id = "801acb38-3b13-41b3-a9c0-a5884e4dfa47";
export const doctor2Id = "aae24f98-5ade-47f8-9a2f-40caf25b830a";
export const doctor3Id = "fbb8c3af-fb70-4da8-84d5-12483748637c";

// These IDs are placeholders. In a real seed, you'd get the actual appointment IDs after creation.

export const appointmentIds = {
  apt1: "0b396423-ad49-4b04-8763-11371b51100f",
  apt2: "0ce52fa2-cf09-4f8b-ac9c-f5cff1e1adbd",
  apt3: "2d0cc466-806c-472d-9caf-835c4aa4725e",
  apt4: "32aa0c65-688c-42e1-92c9-60d43644d1eb",
  apt5: "3ed3a484-f67d-42fa-bfe3-0f5f10ca4d13",
  apt6: "6a20f32b-1c64-400e-b73a-cf91f2413529",
  apt7: "a242b1f1-1e59-46d3-984e-e2862738b8ea",
  apt8: "b467cd77-df29-468e-93ae-2588afc864f6",
  apt9: "eb0ab9fc-6f77-442e-ad2c-2276782f8460",
  apt10: "fdab53b7-47ee-4702-8070-3991e3dfd05d",
};

// =================================================================================
// ==                            UNIFIED USER DATA                              ==
// =================================================================================

export const users = [
  // --- Patients ---
  {
    // This user's ID will be referenced as `patient1Id`
    name: "John Doe",
    email: "john.doe@example.com",
    password: "hashed_password_placeholder_123",
    emailVerified: new Date(),
    role: Role.PATIENT,
    isRootAdmin: false,
    image: "https://i.pravatar.cc/150?u=john.doe",
    dateofbirth: new Date("1985-05-20T00:00:00Z"),
    phoneNumber: "123-456-7890",
    address: "123 Maple Street, Springfield, IL, 62704, USA",
  },
  {
    name: "Jane Smith",
    email: "jane.smith@example.com",
    password: "hashed_password_placeholder_123",
    emailVerified: new Date(),
    role: Role.PATIENT,
    isRootAdmin: false,
    image: "https://i.pravatar.cc/150?u=jane.smith",
    dateofbirth: new Date("1992-08-15T00:00:00Z"),
    phoneNumber: "987-654-3210",
    address: "456 Oak Avenue, Springfield, IL, 62704, USA",
  },
  {
    name: "Peter Jones",
    email: "peter.jones@example.com",
    password: "hashed_password_placeholder_123",
    emailVerified: new Date(),
    role: Role.PATIENT,
    isRootAdmin: false,
    image: "https://i.pravatar.cc/150?u=peter.jones",
    dateofbirth: new Date("1978-11-30T00:00:00Z"),
    phoneNumber: "555-123-4567",
    address: "789 Pine Lane, Springfield, IL, 62704, USA",
  },

  // --- Admin ---
  {
    name: "Admin User",
    email: "admin@clinic.com",
    password: "12345",
    emailVerified: new Date(),
    role: Role.ADMIN,
    isRootAdmin: true,
    image: "https://i.pravatar.cc/150?u=admin.user",
    phoneNumber: "555-555-5555",
    address: "1 Admin Plaza, Metropolis, 10001, USA",
  },

  // --- Doctors ---
  {
    // This user's ID will be referenced as `doctor1Id`
    name: "Dr. Alice Williams",
    email: "alice.williams@clinic.com",
    password: "hashed_doctor_password_placeholder_789",
    emailVerified: new Date(),
    role: Role.DOCTOR,
    isRootAdmin: false,
    image: "https://i.pravatar.cc/150?u=alice.williams",
    dateofbirth: new Date("1975-02-10T00:00:00Z"),
    phoneNumber: "111-222-3333",
    address: "10 Health Drive, Medville, MD, 20850, USA",
  },
  {
    // This user's ID will be referenced as `doctor2Id`
    name: "Dr. Bob Brown",
    email: "bob.brown@clinic.com",
    password: "hashed_doctor_password_placeholder_789",
    emailVerified: new Date(),
    role: Role.DOCTOR,
    isRootAdmin: false,
    image: "https://i.pravatar.cc/150?u=bob.brown",
    dateofbirth: new Date("1980-09-25T00:00:00Z"),
    phoneNumber: "444-555-6666",
    address: "20 Wellness Way, Medville, MD, 20850, USA",
  },
  {
    // This user's ID will be referenced as `doctor3Id`
    name: "Dr. Carol Davis",
    email: "carol.davis@clinic.com",
    password: "hashed_doctor_password_placeholder_789",
    emailVerified: new Date(),
    role: Role.DOCTOR,
    isRootAdmin: false,
    image: "https://i.pravatar.cc/150?u=carol.davis",
    dateofbirth: new Date("1988-12-01T00:00:00Z"),
    phoneNumber: "777-888-9999",
    address: "30 Cure Court, Medville, MD, 20850, USA",
  },
];

// =================================================================================
// ==                            DOCTOR PROFILE DATA                            ==
// =================================================================================

export const doctorProfiles = [
  {
    userId: doctor1Id,
    specialty: "Cardiology",
    brief:
      "Dr. Williams is a board-certified cardiologist with over 15 years of experience...",
    credentials: "M.D., F.A.C.C.",
    languages: ["English", "Spanish"],
    specializations: [
      "Interventional Cardiology",
      "Echocardiography",
      "Heart Failure Management",
    ],
    isActive: true,
  },
  {
    userId: doctor2Id,
    specialty: "Dermatology",
    brief: "Dr. Brown specializes in medical and cosmetic dermatology...",
    credentials: "M.D., F.A.A.D.",
    languages: ["English"],
    specializations: [
      "Acne Treatment",
      "Skin Cancer Screening",
      "Botox & Fillers",
    ],
    isActive: true,
  },
  {
    userId: doctor3Id,
    specialty: "Pediatrics",
    brief:
      "Dr. Davis provides expert care for infants, children, and adolescents...",
    credentials: "M.D., F.A.A.P.",
    languages: ["English", "French"],
    specializations: ["General Pediatrics", "Vaccinations"],
    isActive: true,
  },
];

// =================================================================================
// ==                              APPOINTMENT DATA                             ==
// =================================================================================

export const appointments = [
  {
    doctorId: doctor1Id,
    userId: patient1Id,
    patientType: "MYSELF",
    patientName: "John Doe",
    appointmentStartUTC: new Date("2025-06-15T10:00:00Z"),
    appointmentEndUTC: new Date("2025-06-15T10:30:00Z"),
    phoneNumber: "123-456-7890",
    reasonForVisit: "Annual Checkup & Follow-up #1",
    status: "COMPLETED",
    paidAt: new Date("2025-06-15T09:50:00Z"),
    paymentMethod: "CASH",
    patientdateofbirth: new Date("1985-05-20T00:00:00Z"),
  },
  {
    doctorId: doctor1Id,
    userId: patient1Id,
    patientType: "MYSELF",
    patientName: "John Doe",
    appointmentStartUTC: new Date("2025-06-16T11:00:00Z"),
    appointmentEndUTC: new Date("2025-06-16T11:30:00Z"),
    phoneNumber: "123-456-7890",
    reasonForVisit: "Annual Checkup & Follow-up #2",
    status: "COMPLETED",
    paidAt: new Date("2025-06-16T10:50:00Z"),
    paymentMethod: "CASH",
    patientdateofbirth: new Date("1985-05-20T00:00:00Z"),
  },
  {
    doctorId: doctor1Id,
    userId: patient1Id,
    patientType: "MYSELF",
    patientName: "John Doe",
    appointmentStartUTC: new Date("2025-06-17T12:00:00Z"),
    appointmentEndUTC: new Date("2025-06-17T12:30:00Z"),
    phoneNumber: "123-456-7890",
    reasonForVisit: "Annual Checkup & Follow-up #3",
    status: "COMPLETED",
    paidAt: new Date("2025-06-17T11:50:00Z"),
    paymentMethod: "CASH",
    patientdateofbirth: new Date("1985-05-20T00:00:00Z"),
  },
  {
    doctorId: doctor1Id,
    userId: patient1Id,
    patientType: "MYSELF",
    patientName: "John Doe",
    appointmentStartUTC: new Date("2025-06-18T13:00:00Z"),
    appointmentEndUTC: new Date("2025-06-18T13:30:00Z"),
    phoneNumber: "123-456-7890",
    reasonForVisit: "Annual Checkup & Follow-up #4",
    status: "COMPLETED",
    paidAt: new Date("2025-06-18T12:50:00Z"),
    paymentMethod: "CASH",
    patientdateofbirth: new Date("1985-05-20T00:00:00Z"),
  },
  {
    doctorId: doctor1Id,
    userId: patient1Id,
    patientType: "MYSELF",
    patientName: "John Doe",
    appointmentStartUTC: new Date("2025-06-19T14:00:00Z"),
    appointmentEndUTC: new Date("2025-06-19T14:30:00Z"),
    phoneNumber: "123-456-7890",
    reasonForVisit: "Annual Checkup & Follow-up #5",
    status: "COMPLETED",
    paidAt: new Date("2025-06-19T13:50:00Z"),
    paymentMethod: "CASH",
    patientdateofbirth: new Date("1985-05-20T00:00:00Z"),
  },
  {
    doctorId: doctor1Id,
    userId: patient1Id,
    patientType: "MYSELF",
    patientName: "John Doe",
    appointmentStartUTC: new Date("2025-06-20T15:00:00Z"),
    appointmentEndUTC: new Date("2025-06-20T15:30:00Z"),
    phoneNumber: "123-456-7890",
    reasonForVisit: "Annual Checkup & Follow-up #6",
    status: "BOOKING_CONFIRMED",
    paidAt: new Date("2025-06-20T14:50:00Z"),
    paymentMethod: "CASH",
    patientdateofbirth: new Date("1985-05-20T00:00:00Z"),
  },
  {
    doctorId: doctor1Id,
    userId: patient1Id,
    patientType: "MYSELF",
    patientName: "John Doe",
    appointmentStartUTC: new Date("2025-06-21T16:00:00Z"),
    appointmentEndUTC: new Date("2025-06-21T16:30:00Z"),
    phoneNumber: "123-456-7890",
    reasonForVisit: "Annual Checkup & Follow-up #7",
    status: "BOOKING_CONFIRMED",
    paidAt: new Date("2025-06-21T15:50:00Z"),
    paymentMethod: "CASH",
    patientdateofbirth: new Date("1985-05-20T00:00:00Z"),
  },
  {
    doctorId: doctor1Id,
    userId: patient1Id,
    patientType: "MYSELF",
    patientName: "John Doe",
    appointmentStartUTC: new Date("2025-06-22T17:00:00Z"),
    appointmentEndUTC: new Date("2025-06-22T17:30:00Z"),
    phoneNumber: "123-456-7890",
    reasonForVisit: "Annual Checkup & Follow-up #8",
    status: "BOOKING_CONFIRMED",
    paidAt: new Date("2025-06-22T16:50:00Z"),
    paymentMethod: "CASH",
    patientdateofbirth: new Date("1985-05-20T00:00:00Z"),
  },
  {
    doctorId: doctor1Id,
    userId: patient1Id,
    patientType: "MYSELF",
    patientName: "John Doe",
    appointmentStartUTC: new Date("2025-06-23T18:00:00Z"),
    appointmentEndUTC: new Date("2025-06-23T18:30:00Z"),
    phoneNumber: "123-456-7890",
    reasonForVisit: "Annual Checkup & Follow-up #9",
    status: "PAYMENT_PENDING",
    paidAt: null,
    paymentMethod: null,
    patientdateofbirth: new Date("1985-05-20T00:00:00Z"),
  },
  {
    doctorId: doctor1Id,
    userId: patient1Id,
    patientType: "MYSELF",
    patientName: "John Doe",
    appointmentStartUTC: new Date("2025-06-24T19:00:00Z"),
    appointmentEndUTC: new Date("2025-06-24T19:30:00Z"),
    phoneNumber: "123-456-7890",
    reasonForVisit: "Annual Checkup & Follow-up #10",
    status: "PAYMENT_PENDING",
    paidAt: null,
    paymentMethod: null,
    patientdateofbirth: new Date("1985-05-20T00:00:00Z"),
  },
];

// =================================================================================
// ==                             TESTIMONIAL DATA                              ==
// =================================================================================

export const testimonials = [
  {
    appointmentId: appointmentIds.apt1,
    doctorId: doctor1Id,
    patientId: patient1Id,
    testimonialText:
      "Dr. Williams was fantastic during my appointment on June 15. She is very thorough and caring.",
    rating: 4,
  },
  {
    appointmentId: appointmentIds.apt2,
    doctorId: doctor1Id,
    patientId: patient1Id,
    testimonialText:
      "Another great visit on June 16. Dr. Williams is always professional and attentive.",
    rating: 5,
  },
  {
    appointmentId: appointmentIds.apt3,
    doctorId: doctor1Id,
    patientId: patient1Id,
    testimonialText:
      "Excellent care as always. She answered all my questions on June 17.",
    rating: 4,
  },
  {
    appointmentId: appointmentIds.apt4,
    doctorId: doctor1Id,
    patientId: patient1Id,
    testimonialText:
      "Felt very comfortable and well-cared for. Highly recommend.",
    rating: 4,
  },
  {
    appointmentId: appointmentIds.apt5,
    doctorId: doctor1Id,
    patientId: patient1Id,
    testimonialText:
      "The best cardiologist in town. My appointment on June 19 was very helpful.",
    rating: 5.0,
  },
  {
    appointmentId: appointmentIds.apt6,
    doctorId: doctor1Id,
    patientId: patient1Id,
    testimonialText:
      "She's incredibly knowledgeable and has a great bedside manner.",
    rating: 4,
  },
  {
    appointmentId: appointmentIds.apt7,
    doctorId: doctor1Id,
    patientId: patient1Id,
    testimonialText: "Always a positive experience with Dr. Williams.",
    rating: 4,
  },
  {
    appointmentId: appointmentIds.apt8,
    doctorId: doctor1Id,
    patientId: patient1Id,
    testimonialText:
      "You can tell she genuinely cares about her patients. Visit on June 22 was top-notch.",
    rating: 5.0,
  },
  {
    appointmentId: appointmentIds.apt9,
    doctorId: doctor1Id,
    patientId: patient1Id,
    testimonialText:
      "I've been seeing Dr. Williams for years and trust her completely.",
    rating: 5,
  },
  {
    appointmentId: appointmentIds.apt10,
    doctorId: doctor1Id,
    patientId: patient1Id,
    testimonialText:
      "Consistently provides the highest quality of care. Thank you!",
    rating: 5.0,
  },
];

// You can then use these arrays in your seed script. For example:
//
// await prisma.user.createMany({ data: users });
//
// Then, find the actual user and appointment IDs to create related data...

export const workingDays = [
  { dayOfWeek: 0, isWorkingDay: false }, // Sunday
  { dayOfWeek: 1, isWorkingDay: true }, // Monday
  { dayOfWeek: 2, isWorkingDay: true }, // Tuesday
  { dayOfWeek: 3, isWorkingDay: true }, // Wednesday
  { dayOfWeek: 4, isWorkingDay: true }, // Thursday
  { dayOfWeek: 5, isWorkingDay: true }, // Friday
  { dayOfWeek: 6, isWorkingDay: true }, // Saturday
];

export const appSettings = {
  id: "global",
  slotsPerHour: 2,
  startTime: "09:00",
  endTime: "17:00",
  slotReservationDuration: 10,
};

export const departments = [
  { name: "Cardiology", iconName: "Heart" },
  { name: "Neurology", iconName: "Brain" },
  { name: "Pediatrics", iconName: "Baby" },
  { name: "Orthopedics", iconName: "Bone" },
  { name: "Dermatology", iconName: "Sparkles" },
  { name: "Ophthalmology", iconName: "Eye" },
];

export const bannerImages = [
  {
    name: "Welcome Banner",
    imageUrl: "/images/banner/banner1.jpg",
    fileKey: "banner_welcome_key_1",
    order: 1,
  },
];
