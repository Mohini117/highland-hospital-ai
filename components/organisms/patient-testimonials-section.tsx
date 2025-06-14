import { testimonialData } from "@/db/dummydata";
import ReviewCard from "../molecules/review";

interface ReviewData {
  id: string;
  patientName: string;
  rating: number;
  reviewDate: string;
  testimonialText: string;
  patientImage?: string;
}

export default function PatientTestimonials() {
  const doctorTestimonials: ReviewData[] = testimonialData;

  return (
    <section className="w-full">
      <h2 className="text-center text-text-title mb-8">Patient Testimonials</h2>
      {doctorTestimonials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
          {doctorTestimonials.map((testimonial) => (
            <ReviewCard
              key={testimonial.id}
              id={testimonial.id}
              name={testimonial.patientName}
              date={testimonial.reviewDate}
              rating={testimonial.rating}
              testimonial={testimonial.testimonialText}
              imageSrc={testimonial.patientImage || ""}
            />
          ))}
        </div>
      ) : (
        <div className="text-grey-500 text-center">No Patient Reviews yet</div>
      )}
    </section>
  );
}
