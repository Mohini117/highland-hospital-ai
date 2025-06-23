import { DoctorDetails } from "@/types";
import RatingStars from "@/components/molecules/star-rating";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

export default function DoctorProfileTopCard({
  name,
  credentials,
  speciality,
  languages,
  specializations,
  rating,
  reviewCount,
  image,
}: DoctorDetails) {
  return (
    // Main container using the Card component from shadcn/ui
    <Card className="w-full overflow-hidden rounded-lg border-0 bg-background shadow-small p-4 md:p-6">
      <CardContent className="p-0 flex flex-col md:flex-row gap-5 md:gap-6">
        {/* Doctor's Image */}
        <div className="flex-shrink-0 w-full md:w-72">
          {image ? (
            <div className="relative aspect-square rounded-lg overflow-hidden">
              <Image
                src={image}
                alt={`${name}'s photo`}
                fill
                sizes="(max-width:768px) 100vw, 288px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="aspect-square bg-gray-200 flex items-center justify-center rounded-lg">
              <span className="text-gray-400 text-xl">{name?.charAt(0)}</span>
            </div>
          )}
        </div>

        {/* Doctor's Information */}
        <div className="flex-1">
          <h2 className="text-text-title">
            {name}, {credentials}
          </h2>
          <h4 className="text-text-body-subtle mt-1">{speciality}</h4>

          {/* Rating and Reviews Section */}
          <div className="flex items-center mb-[28px] mt-2 gap-3">
            <RatingStars rating={rating} />
            <span className="body-regular text-text-body-subtle">
              {rating.toFixed(1)}({reviewCount} reviews)
            </span>
          </div>

          {/* Information Sections with standard div elements for styling */}
          <div className="space-y-4">
            {/* Languages Section */}
            <div className="border border-border-2 rounded-lg p-4">
              <h3 className="body-small text-text-body-subtle">Languages</h3>
              <p className="body-semibold text-text-body">
                {languages.join(", ")}
              </p>
            </div>

            {/* Specialization Section */}
            <div className="border border-border-2 rounded-lg p-4">
              <h3 className="body-small text-text-body-subtle">
                Specialisation
              </h3>
              <p className="body-semibold text-text-body">
                {specializations.join(", ")}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
