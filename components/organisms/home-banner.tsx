//import { bannerImageData } from "@/db/dummydata";
import Image from "next/image";
import { getBanners } from "@/lib/actions/settings.actions";

export default async function DynamicBanner() {
  const result = await getBanners();

  if (
    !result.success ||
    !result.data ||
    result.data.banners.length === 0 ||
    result.data.banners[0].imageUrl === "" ||
    result.data.banners[0].imageUrl === null
  ) {
    return (
      <div className="w-full text-gray-500 mt-5 h-64 md:h-80 lg:h-96 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        Banner not available
      </div>
    );
  }
  const banner = result.data.banners[0];

  return (
    <section className="relative w-full h-75 md:h-100 lg:h-125 overflow-hidden">
      {/* Background Image */}
      <Image
        src={banner.imageUrl}
        alt={banner.name}
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10">
        <h1 className="text-text-caption-2 text-center mb-6">
          Welcome to Highland Medical Center
        </h1>
        <h4 className="text-text-caption-2 text-center">
          Excellence in Healthcare, Committed to Your Well-being
        </h4>
      </div>
    </section>
  );
}
