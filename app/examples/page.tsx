import DepartmentCard from "@/components/molecules/departmentcard";
import DoctorCard from "@/components/molecules/doctorcard";
import Review from "@/components/molecules/review";
import BookingSteps from "@/components/molecules/booking-steps";

export default function Examples() {
  const sampleDepartment = {
    id: "dept-1",
    name: "Dermatology",
    iconName: "Syringe",
  };
  // const demo_appointment: Appointment = {
  //   id: "appt-1",
  //   doctorName: "Dr. John Doe",
  //   doctorId: "doc-1",
  //   specialty: "Dermatology",
  //   date: "1 January 2030",
  //   time: "10:00 AM",
  //   status: "completed",
  //   reasonForVisit: "Skin check-up",
  //   isReviewed: false,
  // };
  return (
    <div className="flex flex-col justify-center items-center mt-10">
      <div className="max-w-[176px]">
        <DepartmentCard
          id={sampleDepartment.id}
          name={sampleDepartment.name}
          iconName={sampleDepartment.iconName}
        />
      </div>
      <br />
      <br />
      <DoctorCard
        id="1"
        name="Dr. Aby Paul"
        specialty="Orthopaedics"
        rating={4.9}
        reviewCount={100}
        imageUrl="https://images.unsplash.com/photo-1642975967602-653d378f3b5b?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      />
      <br />
      <DoctorCard
        id="1"
        name="Aby Paul"
        specialty="Orthopaedics"
        rating={4.9}
        reviewCount={100}
        imageUrl=""
      />
      <br />
      <br />
      <Review
        id="1"
        name="John Bob"
        rating={4}
        testimonial="The service was exceptional and the staff were very friendly. I highly recommend this clinic to anyone looking for quality healthcare. Super satisfied with the treatment I received. The doctors were very professional and attentive to my needs. I will definitely be coming back for future check-ups."
        date="2026-01-15"
        imageSrc="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8eW91bmclMjBtYW58ZW58MHx8MHx8fDA%3D"
      />
      <br />
      <BookingSteps currentStep={2} />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
    </div>
  );
}
