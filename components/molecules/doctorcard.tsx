import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Star } from "lucide-react";
import Image from "next/image";
import ViewProfileButton from "@/components/molecules/view-profile-button";

interface DoctorCardProps {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  imageUrl: string; // This should be a path to an image in your public folder or an external URL
}

export default function DoctorCard({
  id,
  name,
  specialty,
  rating,
  reviewCount,
  imageUrl,
}: DoctorCardProps) {
  return (
    <Card className="w-full flex flex-col gap-4 max-w-sm rounded-lg shadow-sm overflow-hidden bg-background p-6 border border-border-2">
      <CardContent className="p-0 w-full flex flex-col md:flex-row items-center gap-3 md:gap-4">
        <div className="relative shrink-0 mt-1.5">
          <div className="rounded-full aspect-square w-12 md:w-16 overflow-hidden">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={`Photo of ${name}`}
                fill
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-xl">{name?.charAt(0)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <h2 className="body-semibold text-text-title truncate">{name}</h2>
          <p className="body-regular text-text-body-subtle truncate">
            {specialty}
          </p>

          <div className="md:mt-1 flex items-center gap-1">
            <Star className="h-4 w-4.5 text-[#FACC15] fill-[#FACC15]" />
            <span className="body-regular text-text-body-subtle">
              {rating.toFixed(1)}({reviewCount} reviews)
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-0 w-full">
        <ViewProfileButton doctorId={id} />
      </CardFooter>
    </Card>
  );
}
