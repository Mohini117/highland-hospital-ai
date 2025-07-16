import { patientProfileUpdateSchema } from "@/lib/validators";
import { Department, BannerImage } from "../lib/generated/prisma";
//import { AppointmentStatus } from "../lib/generated/prisma";
import { z } from "zod";

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
