"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminAppointment } from "@/types";
import AppointmentStatusBadge from "@/components/molecules/admin/appointment-status-badge";
import PaginationControls from "@/components/molecules/pagination-controls";

// Props Interface
interface AllAppointmentsTableProps {
  appointments: AdminAppointment[];
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  totalAppointments: number;
  searchQuery: string;
}

// Main Table Component
export default function AllAppointmentsTable({
  appointments,
  totalPages,
  currentPage,
  searchQuery,
}: AllAppointmentsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- Pagination Handler
  const handlePageChange = (page: number) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("page", page.toString());
    router.push(`${pathname}?${current.toString()}`);
  };

  return (
    <>
      <div className="relative overflow-x-auto rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 bg-gray-50">
              <TableHead className="px-4 py-3 body-small-bold text-text-body-subtle ">
                ID
              </TableHead>
              <TableHead className="px-4 py-3  font-medium body-small-bold text-text-body-subtle ">
                Doctor
              </TableHead>
              <TableHead className="px-4 py-3  font-medium  body-small-bold text-text-body-subtle ">
                Patient
              </TableHead>
              <TableHead className="px-4 py-3  font-medium  body-small-bold text-text-body-subtle ">
                Phone Number
              </TableHead>
              <TableHead className="px-4 py-3  font-medium  body-small-bold text-text-body-subtle ">
                Booked By
              </TableHead>
              <TableHead className="px-4 py-3  font-medium  body-small-bold text-text-body-subtle ">
                Slot Date
              </TableHead>
              <TableHead className="px-4 py-3  font-medium  body-small-bold text-text-body-subtle ">
                Slot Time
              </TableHead>
              <TableHead className="px-4 py-3  font-medium  body-small-bold text-text-body-subtle ">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-10 text-gray-500"
                >
                  {searchQuery
                    ? `No appointments found matching "${searchQuery}".`
                    : "No appointments found."}
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
                <TableRow
                  key={appointment.id}
                  className="border-b border-border  hover:bg-gray-50 "
                >
                  <TableCell className="px-4 py-3 body-small text-text-body-subtle  font-mono">
                    {appointment.formattedId}
                  </TableCell>
                  <TableCell className="px-4 py-3 body-small text-text-body-subtle ">
                    {appointment.doctorName}
                  </TableCell>
                  <TableCell className="px-4 py-3 body-small text-text-body-subtle ">
                    {appointment.patientName}
                  </TableCell>
                  <TableCell className="px-4 py-3 body-small text-text-body-subtle ">
                    {appointment.phoneNumber ||
                      appointment.userPhoneNumber ||
                      "N/A"}
                  </TableCell>
                  <TableCell className="px-4 py-3 body-small text-text-body-subtle ">
                    {appointment.bookedByName}
                  </TableCell>
                  <TableCell className="px-4 py-3 body-small text-text-body-subtle ">
                    {appointment.appointmentDate}
                  </TableCell>
                  <TableCell className="px-4 py-3 body-small text-text-body-subtle ">
                    {appointment.appointmentTime}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <AppointmentStatusBadge status={appointment.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {appointments.length > 0 && totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center justify-center">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}
    </>
  );
}
