import {
  patientProfileUpdateSchema,
  reviewFormSchema,
  PatientDetailsFormSchema,
} from "@/lib/validators";
import { Department, BannerImage } from "../lib/generated/prisma";
import { AppointmentStatus } from "../lib/generated/prisma";
import { z } from "zod";

import { Role } from "@/lib/generated/prisma";
import { addAdminFormSchema } from "@/lib/validators";
import { editAdminFormSchema } from "@/lib/validators";
import { addDepartmentSchema } from "@/lib/validators";
import { editDepartmentSchema } from "@/lib/validators";

import { addDoctorFormSchema } from "@/lib/validators";
import { editDoctorFormSchema } from "@/lib/validators";
import { LeaveType } from "@/lib/generated/prisma";

export type FieldErrors = Record<string, string[] | undefined>;

export interface ServerActionResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errorType?: string;
  fieldErrors?: FieldErrors;
}

export interface DepartmentData extends Department {}

export type DoctorSummary = {
  id: string;
  name: string | null;
  specialty: string | null;
  rating: number | null;
  reviewCount: number | null;
  imageUrl: string | null;
};

export interface DoctorReview {
  id: string;
  rating: number | null;
  reviewDate: string;
  testimonialText: string;
  patientName: string;
  patientImage: string | null;
}

export interface BannerImageData extends BannerImage {}

export interface DoctorDetails {
  id: string;
  name: string;
  image: string | null;
  credentials: string;
  speciality: string;
  rating: number;
  reviewCount: number;
  languages: string[];
  specializations: string[];
  brief: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  startTimeUTC: Date;
  endTimeUTC: Date;
}

export interface PatientProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string;
  image?: string;
}

export interface Appointment {
  id: string;
  doctorName: string;
  doctorId: string;
  specialty?: string;
  date: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled" | "no show" | "cash payment";
  reasonForVisit?: string;
  isReviewed?: boolean;
}

export type ProfileUpdateInput = z.infer<typeof patientProfileUpdateSchema>;

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;

export interface GuestAppointmentParams {
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface GuestAppointmentSuccessData {
  appointmentId: string;
  guestIdentifier: string;
}

export interface ReservationSuccessData {
  appointmentId: string;
}

export interface AppointmentReservationParams {
  doctorId: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface AppointmentData {
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecilaity: string;
  doctorImage?: string | null;
  date: string;
  timeSlot: string;
  endTime: string;
  patientType?: "MYSELF" | "SOMEONE_ELSE";
  patientName?: string;
  patientdateofbirth?: Date | null;
  phoneNumber?: string | null;
  reasonForVisit?: string | null;
  additionalNotes?: string | null;
  relationship?: string | null;
}

export interface PatientData {
  name: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
}

export type PatientDetailsFormValues = z.infer<typeof PatientDetailsFormSchema>;

export type AppointmentSubmissionData = PatientDetailsFormValues & {
  appointmentId: string;
  doctorId: string;
  date: string;
  timeSlot: string;
  endTime: string;
  isForSelf: boolean;
  phone: string | null | undefined;
  patientdateofbirth?: string;
};

export interface AppointmentDataWithBilling extends AppointmentData {
  fee: number;
  patientEmail: string;
}

interface RevenueDataPoint {
  name: string;
  Revenue: number;
}

interface DepartmentRevenueDataPoint {
  name: string;
  value: number;
  color: string;
}

export interface AdminTransaction {
  id: string;
  transactionDate: Date;
  amount: number;
  appointment: {
    appointmentStartUTC: Date;
    patientName: string;
    status: AppointmentStatus;
    doctor: {
      name: string;
      doctorProfile: {
        specialty: string;
      } | null;
    };
  };
}

export interface AdminDashboardData {
  totalRevenue: number;
  totalAppointments: number;
  revenueAnalyticsData: RevenueDataPoint[];
  departmentRevenueData: DepartmentRevenueDataPoint[];
  transactions: AdminTransaction[];
}

export interface AdminAppointmentsData {
  appointments: AdminAppointment[];
  totalAppointments: number;
  totalPages: number;
  currentPage: number;
}

export interface AdminAppointment {
  id: string;
  formattedId: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  bookedByName: string | null;
  bookedByEmail: string | null;
  appointmentDate: string; // Formatted Date (e.g., "May 01, 2025")
  appointmentTime: string; // Formatted Time (e.g., "10:00 AM")
  status: AppointmentStatus;
  phoneNumber?: string | null; // Alternate phone from appointment
  userPhoneNumber?: string | null; // Primary phone from user table
}

export interface AdminUserData {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isRootAdmin: boolean | null;
}

export type AddAdminFormValues = z.infer<typeof addAdminFormSchema>;
export type EditAdminFormValues = z.infer<typeof editAdminFormSchema>;
export type AddDepartmentFormValues = z.infer<typeof addDepartmentSchema>;
export type EditDepartmentFormValues = z.infer<typeof editDepartmentSchema>;

export type AddDoctorFormValues = z.infer<typeof addDoctorFormSchema>;

export interface AdminDoctorData {
  id: string;
  name: string | null;
  email: string;
  credentials: string | null; // From DoctorProfile
  image: string | null;
  specialty: string | null; // From DoctorProfile
  isActive: boolean | null; // From DoctorProfile
  languages: string[] | null; //From DoctorProfile
  specializations: string[] | null; // From DoctorProfile
  brief: string | null; // From DoctorProfile
}
export type EditDoctorFormValues = z.infer<typeof editDoctorFormSchema>;

export interface InitialLeave {
  date: string;
  type: LeaveType;
}

export interface AppointmentDetailForLeave {
  id: string; // appointmentId
  time: string;
  patientName: string | null;
  bookedByName?: string | null; // Name of user who booked
  phoneNumber: string | null;
  email: string | null;
  status: AppointmentStatus;
}

export interface AdminDoctorDataSimple {
  id: string;
  name: string | null;
}
