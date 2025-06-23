import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  size?: number;
  color?: string;
}

export default function RatingStars({
  rating,
  size = 16,
  color = "#FACC15",
}: RatingStarsProps) {
  return (
    <div className="flex items-center">
      {Array.from({ length: 5 }, (_, i) => {
        const starNumber = i + 1; //i = 0,1,2,3,4 stars =1,2,3,4,5

        if (starNumber <= rating) {
          // This is a full star.
          return (
            <Star key={`full-${i}`} fill={color} color={color} size={size} />
          );
        }
        if (rating >= starNumber - 0.5) {
          //rating 3.5 star number = 4
          // half-filled star.
          return (
            <div
              key={`half-star-${i}`}
              className="relative"
              style={{ width: size, height: size }}
            >
              {/*background empty star for the outline */}
              <Star
                fill="none"
                color={color}
                size={size}
                className="absolute inset-0"
              />
              {/* foreground filled star for the half fill */}
              <Star
                fill={color}
                color={color}
                size={size}
                className="absolute inset-0"
                style={{ clipPath: "inset(0 50% 0 0)" }}
              />
            </div>
          );
        }

        //empty star
        return (
          <Star key={`empty-${i}`} fill="none" color={color} size={size} />
        );
      })}
    </div>
  );
}
