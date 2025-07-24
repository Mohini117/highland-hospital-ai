import { getDoctorDetails } from "@/lib/actions/doctor.actions";
import { notFound } from "next/navigation";
import DoctorProfileTopCard from "@/components/organisms/doctor-profile/doctorprofile-topcard";
import DoctorProfileAbout from "@/components/organisms/doctor-profile/about";
import PatientReviews from "@/components/organisms/doctor-profile/patient-reviews";
import AppointmentScheduler from "@/components/organisms/doctor-profile/schedule-appointment";
import { auth } from "@/auth";
import { cleanupExpiredReservations } from "@/lib/actions/appointment.actions";

interface Params {
  doctorId: string;
}

export default async function DoctorProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const doctorIdObject = await params;
  const { doctorId } = doctorIdObject;

  await cleanupExpiredReservations();

  let doctorActionResponse;
  try {
    doctorActionResponse = await getDoctorDetails(doctorId);
  } catch (error) {
    console.error("Error fetching doctor details:", error);
    return (
      <div className="p-6 text-center text-red-500">
        <p>
          We&apos;re sorry , but something went wrong while trying to load the
          doctor&apos;s profile.
        </p>
        <p>Please try refreshing the page or check back later</p>
      </div>
    );
  }

  if (!doctorActionResponse.success) {
    if (doctorActionResponse.errorType === "NOT_FOUND") {
      notFound();
    }
    //handle all other defined errors
    console.error(
      `failed to fetch doctor details for ${doctorId} `,
      doctorActionResponse.message,
      doctorActionResponse.error
    );
    <div className="p-6 text-center text-red-500">
      <p>Could not load doctor profile.</p>
      <p>Please try again later</p>
    </div>;
  }

  //happy path
  const doctor = doctorActionResponse.data;
  if (!doctor) {
    notFound();
  }

  const session = await auth();
  const userId = session?.user?.id ? session.user.id : undefined;
  const userRole = session?.user?.role ? session.user.role : undefined;

  return (
    <div className="w-full flex flex-col md:flex-row max-w-[1376px] mx-auto gap-8 p-6 md:p-8">
      <div className="flex flex-col gap-6 md:gap-8 md:max-w-[908px] md:flex-1">
        <DoctorProfileTopCard
          id={doctor.id}
          name={doctor.name}
          credentials={doctor.credentials}
          speciality={doctor.speciality}
          languages={doctor.languages}
          specializations={doctor.specializations}
          rating={doctor.rating}
          reviewCount={doctor.reviewCount}
          image={doctor.image}
          brief={doctor.brief}
        />
        <div className="md:hidden">
          <AppointmentScheduler
            doctorId={doctor.id}
            userId={userId}
            userRole={userRole}
          />
        </div>
        <DoctorProfileAbout name={doctor.name} brief={doctor.brief} />
        <PatientReviews doctorId={doctor.id} averageRating={doctor.rating} />
      </div>
      <div className="hidden md:block ">
        <AppointmentScheduler
          doctorId={doctor.id}
          userId={userId}
          userRole={userRole}
        />
      </div>
    </div>
  );
}
