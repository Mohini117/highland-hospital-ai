import {
  AppointmentData,
  PatientData,
  PatientDetailsFormValues,
  AppointmentSubmissionData,
} from "@/types";
import { PatientDetailsFormSchema } from "@/lib/validators";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { parse, isValid } from "date-fns"; // Assuming date-fns is installed

// --- Shadcn UI Component Imports ---
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import { format } from "date-fns";
import { MdEdit, MdPhone } from "react-icons/md";
import { toast } from "react-hot-toast";
import { processAppointmentBooking } from "@/lib/actions/appointment.actions";
import { useRouter } from "next/navigation";

interface PatientDetailsFormProps {
  appointmentData: AppointmentData;
  patientDetails: PatientData;
}

export default function PatientDetailsForm({
  appointmentData,
  patientDetails,
}: PatientDetailsFormProps) {
  const router = useRouter();
  const initialPatientType = appointmentData.patientType || "MYSELF";
  const initialUseAlternatePhone =
    !!appointmentData.phoneNumber &&
    appointmentData.phoneNumber !== patientDetails.phoneNumber;

  // 1. Define your form.
  const form = useForm<PatientDetailsFormValues>({
    resolver: zodResolver(PatientDetailsFormSchema),
    defaultValues: {
      patientType: initialPatientType,
      fullName:
        initialPatientType === "MYSELF"
          ? patientDetails.name
          : appointmentData?.patientName &&
            appointmentData.patientName !== patientDetails.name
          ? appointmentData.patientName
          : "",
      dateOfBirth: appointmentData?.patientdateofbirth
        ? format(new Date(appointmentData.patientdateofbirth), "dd/MM/yyyy")
        : "",
      email: patientDetails.email,
      relationship: appointmentData?.relationship || "",
      reason: appointmentData?.reasonForVisit || "",
      notes: appointmentData.additionalNotes || "",
      useAlternatePhone: initialUseAlternatePhone,
      phone: initialUseAlternatePhone ? appointmentData?.phoneNumber || "" : "",
    },
    mode: "onChange", // Validate fields as they are changed
  });

  // Watch for changes in patientType to conditionally render fields
  const patientType = form.watch("patientType");
  const useAlternatePhone = form.watch("useAlternatePhone");

  // 2. Define a submit handler.
  async function onSubmit(data: PatientDetailsFormValues) {
    if (!data.useAlternatePhone && !patientDetails.phoneNumber) {
      toast.error(
        "Your profile phone number is missing. Please provide one for this booking or update your phone number in your profile"
      );
      form.setValue("useAlternatePhone", true, { shouldValidate: true });
      setTimeout(() => {
        form.setFocus("phone");
      }, 0);
      return;
    }

    const bookingToastId = toast.loading("Processing booking..");
    const dob = data.dateOfBirth
      ? parse(data.dateOfBirth, "dd/MM/yyyy", new Date())
      : "";

    try {
      const submissionData: AppointmentSubmissionData = {
        ...data,
        appointmentId: appointmentData.appointmentId,
        doctorId: appointmentData.doctorId,
        date: appointmentData.date,
        timeSlot: appointmentData.timeSlot,
        endTime: appointmentData.endTime,
        isForSelf: data.patientType === "MYSELF",
        phone: data.useAlternatePhone ? data.phone : patientDetails.phoneNumber,
        patientdateofbirth:
          data.patientType === "MYSELF"
            ? patientDetails.dateOfBirth
            : data.patientType === "SOMEONE_ELSE" &&
              data.dateOfBirth &&
              isValid(dob)
            ? format(dob, "yyyy-MM-dd")
            : undefined,
      };

      const result = await processAppointmentBooking(submissionData);
      if (result.success) {
        toast.success("Booking details saved", { id: bookingToastId });
        router.push(
          `/appointments/payment?appointmentId=${result.data?.appointmentId}`
        );
      } else {
        const errorMessage =
          result.message || "An error occured. Please try again";
        toast.error(errorMessage, { id: bookingToastId });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occured during booking. Please try again ";

      toast.error(`Booking Failed : ${errorMessage}`, { id: bookingToastId });
    }
  }

  // 3. Render the form.
  return (
    <div className="w-full p-4 md:p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Patient Type Selector */}
          <FormField
            control={form.control}
            name="patientType"
            render={() => (
              <FormItem className="gap-0">
                <FormLabel className="text-lg md:text-xl font-semibold text-text-title mb-4">
                  Who is this appointment for?
                </FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant={"outline"}
                      onClick={() => {
                        form.setValue("patientType", "MYSELF", {
                          shouldValidate: true,
                        });
                        // When switching to MYSELF, reset the name to the logged-in user's name
                        form.setValue("fullName", patientDetails.name);
                      }}
                      className={`h-12 w-full body-small-bold ${
                        patientType === "MYSELF"
                          ? "bg-primary-subtle border-primary hover:bg-primary-subtle dark:bg-primary dark:hover:bg-primary"
                          : "border-border-2"
                      }`}
                    >
                      Myself
                    </Button>
                    <Button
                      type="button"
                      variant={"outline"}
                      onClick={() => {
                        form.setValue("patientType", "SOMEONE_ELSE", {
                          shouldValidate: true,
                        });
                        // When switching to SOMEONE_ELSE, clear the name field
                        form.setValue("fullName", "");
                      }}
                      className={`h-12 w-full body-small-bold ${
                        patientType === "SOMEONE_ELSE"
                          ? "bg-primary-subtle border-primary hover:bg-primary-subtle dark:bg-primary dark:hover:bg-primary"
                          : "border-border-2"
                      }`}
                    >
                      Someone Else
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Conditional Fields for SOMEONE_ELSE */}
          {patientType === "SOMEONE_ELSE" && (
            <>
              <FormField
                control={form.control}
                name="relationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs md:text-sm text-text-body font-bold">
                      Relationship to Patient
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            className="text-xs md:text-sm text-text-body font-normal"
                            placeholder="Select relationship"
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-border">
                        <SelectItem value="CHILD">Child</SelectItem>
                        <SelectItem value="SPOUSE">Spouse</SelectItem>
                        <SelectItem value="PARENT">Parent</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs md:text-sm text-text-body font-bold">
                      Full Name of Patient
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="text-xs md:text-sm text-text-body font-normal"
                        placeholder="John Doe"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs md:text-sm text-text-body font-bold">
                      Date of Birth of Patient
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="text-xs md:text-sm text-text-body font-normal"
                        placeholder="DD/MM/YYYY"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-text-caption-1">
                      Please enter the date in DD/MM/YYYY format.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* Display User's Name if booking for MYSELF */}
          {patientType === "MYSELF" && (
            <div className="space-y-2">
              <FormLabel className="text-xs md:text-sm text-text-body font-bold">
                Full Name
              </FormLabel>
              <div className="relative">
                <Input
                  value={patientDetails.name}
                  readOnly
                  className="text-xs md:text-sm font-normal bg-primary-subtle text-text-body-subtle border-border-2"
                />

                {/* <Pencil className="h-4 w-4 text-muted-foreground" /> */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() =>
                    router.push(
                      `/user/profile?appointmentId=${appointmentData.appointmentId}`
                    )
                  }
                >
                  <MdEdit size={16} className="text-primary " />
                </Button>
              </div>
              <p className="text-caption">
                To update your name please visit your profile.
              </p>
            </div>
          )}

          {/* Common Fields */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs md:text-sm text-text-body font-bold">
                  Email Address
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    readOnly
                    className="text-xs md:text-sm font-normal bg-primary-subtle text-text-body-subtle border-border-2"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel className="text-xs md:text-sm text-text-body font-bold">
              Primary Phone Number
            </FormLabel>
            <div className="relative">
              <Input
                value={patientDetails.phoneNumber}
                readOnly
                className="text-xs md:text-sm font-normal bg-primary-subtle text-text-body-subtle border-border-2"
              />

              {/* <span className="text-blue-600">📞</span> */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() =>
                  router.push(
                    `/user/profile?appointmentId=${appointmentData.appointmentId}`
                  )
                }
              >
                <MdPhone size={16} className="text-primary " />
              </Button>
            </div>
            <p className="text-caption">
              This is your profile phone number. To update it, please visit your
              profile settings.
            </p>
          </div>

          <FormField
            control={form.control}
            name="useAlternatePhone"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="body-small text-text-body-subtle">
                    Use a different phone number for this appointment
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />

          {useAlternatePhone && (
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs md:text-sm text-text-body font-bold">
                    Alternate Phone Number
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="+11234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs md:text-sm text-text-body font-bold">
                  Reason for Visit
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        className="text-xs md:text-sm font-normal"
                        placeholder="Select a reason"
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Consultation">Consultation</SelectItem>
                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                    <SelectItem value="Routine Check-up">
                      Routine Check-up
                    </SelectItem>
                    <SelectItem value="New Issue">New Issue</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs md:text-sm text-text-body font-bold">
                  Additional Notes
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add any additional information about your visit"
                    className="resize-none text-xs md:text-sm font-normal"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-4 pt-6">
            <Button type="button" variant="outline" className="border-border-2">
              Cancel
            </Button>
            <Button type="submit" className="text-text-caption-2">
              Continue to Book
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
