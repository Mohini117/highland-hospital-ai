import DoctorCard from "../molecules/doctorcard";
import { getOurDoctors } from "@/lib/actions/doctor.actions";
import { DoctorSummary } from "@/types";

export default async function OurDoctors() {
  let doctorsToDisplay: DoctorSummary[] = [];
  let fetchError: string | null = null;

  try {
    const response = await getOurDoctors();
    if (response.success && response.data) {
      doctorsToDisplay = response.data;
      //doctorsToDisplay = [];
    } else {
      fetchError = response.message || "Could not load doctors at this time";
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An Unknown error occured";
    fetchError = message;
  }

  //const doctors: DoctorCardData[] = doctorData;

  return (
    <section className="w-full ">
      <h2 className="text-center text-text-title mb-8">Our Doctors</h2>
      {fetchError ? (
        <div className="text-center text-red-500 py-4">{fetchError}</div>
      ) : doctorsToDisplay.length === 0 ? (
        <div className="text-center text-grey-500 py-4">
          No doctors to display
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
          {doctorsToDisplay.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              id={doctor.id}
              name={doctor.name || "Dr. Anonymous"}
              specialty={doctor.specialty || "N/A"}
              rating={doctor.rating || 0}
              reviewCount={doctor.reviewCount || 0}
              imageUrl={doctor.imageUrl || ""}
            />
          ))}
        </div>
      )}
    </section>
  );
}
