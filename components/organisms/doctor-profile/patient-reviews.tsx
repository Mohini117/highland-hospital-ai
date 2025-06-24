"use client";
import { usePaginatedReviews } from "@/hooks/use-paginated-reviews";
import { PAGE_SIZE } from "@/lib/constants";
import ReviewList from "@/components/molecules/review-list";
import PaginationControls from "@/components/molecules/pagination-controls";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import RatingStars from "@/components/molecules/star-rating";

interface PatientReviewsProps {
  doctorId: string;
  averageRating: number;
}

export default function PatientReviews({
  doctorId,
  averageRating,
}: PatientReviewsProps) {
  const {
    currentPage,
    reviews,
    totalReviews,
    totalPages,
    loading,
    error,
    handlePageChange,
  } = usePaginatedReviews(doctorId);

  const renderContent = () => {
    if (loading) {
      // In a real app, you might use a skeleton loader here
      return <div className="text-center py-10">Loading reviews...</div>;
    }
    if (error) {
      return (
        <div className="text-center py-10 text-red-500">Error: {error}</div>
      );
    }
    if (reviews.length === 0) {
      return <div className="text-center py-10">No reviews found.</div>;
    }
    return (
      <ReviewList
        reviews={reviews}
        currentPage={currentPage}
        totalReviews={totalReviews}
        reviewsPerPage={PAGE_SIZE}
      />
    );
  };

  return (
    <Card className="w-full gap-8 shadow-small p-4 md:p-6 rounded-lg border-0 bg-background overflow-hidden ">
      {/* Card Header */}
      <CardHeader className="flex flex-row justify-between p-0 items-center">
        <CardTitle>
          <h3>Patient Reviews</h3>
        </CardTitle>
        <div className="flex items-center gap-2 md:gap-3">
          <h1>{averageRating.toFixed(1)}</h1>
          <div className="flex flex-col">
            <RatingStars rating={averageRating} />
            <p className="body-small text-text-body-subtle">
              {totalReviews} reviews
            </p>
          </div>
        </div>
      </CardHeader>

      {/* Card Content */}
      <CardContent className="p-0">{renderContent()}</CardContent>

      {/* Card Footer (only shown if there are reviews and more than one page) */}
      {!loading && !error && reviews.length > 0 && totalPages > 1 && (
        <CardFooter className="flex justify-between items-center w-full p-0">
          <p className="body-small">
            Page {currentPage} of {totalPages}
          </p>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isDisabled={loading}
          />
        </CardFooter>
      )}
    </Card>
  );
}
