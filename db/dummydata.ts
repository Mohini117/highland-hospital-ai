export const bannerImageData = [
  {
    id: "banner-1",
    name: "Main Welcome Banner",
    imageUrl: "/images/banner/banner1.jpg",
  },
];

// -----------------------------------------------------------------------------
// Data for the Departments Section
// -----------------------------------------------------------------------------
export const departmentData = [
  { id: "dept-cardiology", name: "Cardiology", iconName: "Heart" },
  { id: "dept-neurology", name: "Neurology", iconName: "Brain" },
  { id: "dept-pediatrics", name: "Pediatrics", iconName: "Baby" },
  { id: "dept-orthopedics", name: "Orthopedics", iconName: "Bone" },
  { id: "dept-dermatology", name: "Dermatology", iconName: "Sparkles" },
  { id: "dept-ophthalmology", name: "Ophthalmology", iconName: "Eye" },
];

// -----------------------------------------------------------------------------
// Data for the "Our Doctors" Section
// This combines user and profile information into one simplified object.
// -----------------------------------------------------------------------------
export const doctorData = [
  {
    id: "doc-1",
    name: "Dr. Evelyn Reed",
    specialty: "Cardiology",
    rating: 4.8,
    reviewCount: 156,
    imageUrl:
      "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZG9jdG9yfGVufDB8fDB8fHww",
  },
  {
    id: "doc-2",
    name: "Dr. Marcus Thorne",
    specialty: "Neurology",
    rating: 4.9,
    reviewCount: 212,
    imageUrl:
      "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZG9jdG9yfGVufDB8fDB8fHww",
  },
  {
    id: "doc-3",
    name: "Dr. Lena Petrova",
    specialty: "Pediatrics",
    rating: 4.7,
    reviewCount: 189,
    imageUrl:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8ZG9jdG9yfGVufDB8fDB8fHww",
  },
];

// -----------------------------------------------------------------------------
// Data for the Patient Testimonials Section
// -----------------------------------------------------------------------------

export const testimonialData = [
  {
    id: "review-1",
    patientName: "John Doe",
    rating: 5,
    testimonialText:
      "Dr. Reed is an exceptional cardiologist. She took the time to explain my condition thoroughly and created a treatment plan that worked perfectly for me.",
    reviewDate: "March 15, 2024",
    patientImage:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fGpvaG58ZW58MHx8MHx8fDA%3D",
  },
  {
    id: "review-2",
    patientName: "Alice Johnson",
    rating: 5,
    testimonialText:
      "Dr. Thorne's expertise in neurology is unmatched. He was patient, insightful, and helped me understand my treatment options clearly. Highly recommended!",
    reviewDate: "February 28, 2024",
    patientImage:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dXNlcnxlbnwwfHwwfHx8MA%3D%3D",
  },
  {
    id: "review-3",
    patientName: "Sam Wilson",
    rating: 5,
    testimonialText:
      "Dr. Petrova is wonderful with kids. My son felt completely at ease during his check-up. We are so glad to have found her.",
    reviewDate: "January 10, 2024",
    patientImage:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fHVzZXJ8ZW58MHx8MHx8fDA%3D",
  },
];

// -----------------------------------------------------------------------------
// Main export combining all dummy data for easy import.
// You can also export each const individually as shown above.
// -----------------------------------------------------------------------------
const allDummyData = {
  banners: bannerImageData,
  departments: departmentData,
  doctors: doctorData,
  testimonials: testimonialData,
};

export default allDummyData;
