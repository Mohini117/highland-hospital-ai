//import { testimonialData } from "@/db/dummydata";
import ReviewCard from "../molecules/review";
import { getDoctorTestimonials } from "@/lib/actions/review.actions";
import { DoctorReview } from "@/types";

export default async function PatientTestimonials() {
  let doctorTestimonials: DoctorReview[] = [];
  let fetchError: string | null = null;
  try {
    const result = await getDoctorTestimonials();
    if (result.success && result.data) {
      doctorTestimonials = result.data;
      //doctorTestimonials = [];
    } else {
      fetchError = result.message || "Could not load testimonials at this time";
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An Unknown error occured";
    fetchError = message;
  }

  //const doctorTestimonials: ReviewData[] = testimonialData;

  return (
    <section className="w-full">
      <h2 className="text-center text-text-title mb-8">Patient Testimonials</h2>
      {fetchError ? (
        <div className="text-red-500 text-center py-4">{fetchError}</div>
      ) : doctorTestimonials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
          {doctorTestimonials.map((testimonial) => (
            <ReviewCard
              key={testimonial.id}
              id={testimonial.id}
              name={testimonial.patientName}
              date={testimonial.reviewDate}
              rating={testimonial.rating!}
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
