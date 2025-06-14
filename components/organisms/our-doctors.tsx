import { doctorData } from "@/db/dummydata";
import DoctorCard from "../molecules/doctorcard";

interface DoctorCardData {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
}

export default function OurDoctors() {
  const doctors: DoctorCardData[] = doctorData;

  return (
    <section className="w-full ">
      <h2 className="text-center text-text-title mb-8">Our Doctors</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
        {doctors.map((doctor) => (
          <DoctorCard
            key={doctor.id}
            id={doctor.id}
            name={doctor.name}
            specialty={doctor.specialty}
            rating={doctor.rating}
            reviewCount={doctor.reviewCount}
            imageUrl={doctor.imageUrl}
          />
        ))}
      </div>
    </section>
  );
}
