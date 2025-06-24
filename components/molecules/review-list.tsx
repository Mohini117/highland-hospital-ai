import { DoctorReview } from "@/types";
import RatingStars from "@/components/molecules/star-rating";

interface ReviewListProps {
  reviews: DoctorReview[];
  currentPage: number;
  totalReviews: number;
  reviewsPerPage: number;
}

export default function ReviewList({
  reviews,
  currentPage,
  totalReviews,
  reviewsPerPage,
}: ReviewListProps) {
  // Calculate the starting and ending item numbers for the current page
  const startItem = (currentPage - 1) * reviewsPerPage + 1;
  const endItem = Math.min(currentPage * reviewsPerPage, totalReviews);

  return (
    <div className="w-full">
      {/* Header showing the count of reviews */}
      <p className="body-small text-text-body-subtle mb-2 md:mb-4">
        Showing {startItem}-{endItem} of {totalReviews} reviews
      </p>

      {/* List of reviews */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="border-b-1 border-border">
            {/* Top row: Stars and Date */}
            <div className="flex items-center gap-2 mb-2">
              <RatingStars rating={review.rating || 0} />
              <p className="body-regular text-text-body-subtle">
                {review.reviewDate}
              </p>
            </div>

            {/* Testimonial Text */}
            <p className="body-regular text-text-body-subtle mb-[10px]">
              &ldquo;{review.testimonialText}&rdquo;
            </p>

            {/* Patient Name */}
            <p className="body-regular">- {review.patientName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
