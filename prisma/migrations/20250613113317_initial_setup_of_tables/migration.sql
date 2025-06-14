-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('FULL_DAY', 'MORNING', 'AFTERNOON');

-- CreateEnum
CREATE TYPE "PatientType" AS ENUM ('MYSELF', 'SOMEONE_ELSE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PAYMENT_PENDING', 'BOOKING_CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'CASH');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL DEFAULT 'NO_NAME',
    "email" TEXT NOT NULL,
    "password" TEXT,
    "emailVerified" TIMESTAMP(6),
    "role" "Role" NOT NULL DEFAULT 'PATIENT',
    "isRootAdmin" BOOLEAN DEFAULT false,
    "image" TEXT,
    "dateofbirth" TIMESTAMP(6),
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "doctor_profiles" (
    "profile_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "specialty" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "languages" TEXT[],
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "specializations" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "doctor_leave" (
    "leave_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "leave_date" DATE NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_leave_pkey" PRIMARY KEY ("leave_id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "slots_per_hour" INTEGER NOT NULL DEFAULT 2,
    "start_time" TEXT NOT NULL DEFAULT '09:00',
    "end_time" TEXT NOT NULL DEFAULT '17:00',
    "slot_reservation_duration" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_days" (
    "day_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "day_of_week" SMALLINT NOT NULL,
    "is_working_day" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "working_days_pkey" PRIMARY KEY ("day_id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "appointment_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "user_id" UUID,
    "guest_identifier" TEXT,
    "patient_type" "PatientType" NOT NULL,
    "patient_relation" TEXT,
    "patient_name" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "payment_result" JSONB,
    "paid_at" TIMESTAMP(6),
    "appointment_start" TIMESTAMP(6) NOT NULL,
    "appointment_end" TIMESTAMP(6) NOT NULL,
    "phoneNumber" TEXT,
    "reason_for_visit" TEXT,
    "additional_notes" TEXT,
    "patientdateofbirth" TIMESTAMP(6),
    "reservation_expires_at" TIMESTAMP(6),
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("appointment_id")
);

-- CreateTable
CREATE TABLE "doctor_testimonials" (
    "testimonial_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "patient_id" UUID,
    "testimonial_text" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "doctor_testimonials_pkey" PRIMARY KEY ("testimonial_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "transaction_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "paymentGateway" TEXT NOT NULL,
    "gatewayTransactionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "paymentDetails" JSONB,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "banner_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "banner_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "icon_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_user_id_key" ON "doctor_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_leave_doctor_id_leave_date_key" ON "doctor_leave"("doctor_id", "leave_date");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_testimonials_appointment_id_patient_id_key" ON "doctor_testimonials"("appointment_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_gatewayTransactionId_key" ON "transactions"("gatewayTransactionId");

-- CreateIndex
CREATE INDEX "transactions_transaction_date_idx" ON "transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_doctor_id_idx" ON "transactions"("doctor_id");

-- CreateIndex
CREATE INDEX "transactions_appointment_id_idx" ON "transactions"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "banner_images_file_key_key" ON "banner_images"("file_key");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_leave" ADD CONSTRAINT "doctor_leave_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_testimonials" ADD CONSTRAINT "doctor_testimonials_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_testimonials" ADD CONSTRAINT "doctor_testimonials_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_testimonials" ADD CONSTRAINT "doctor_testimonials_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
