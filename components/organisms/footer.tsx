import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-background-4 ">
      <div className="max-w-[1440px] mx-auto flex flex-col justify-between px-6 md:px-8 py-12 gap-20">
        <div className="flex flex-col md:flex-row justify-between">
          {/* Highland Medical Center Section */}
          <div className="flex flex-col gap-4">
            <h4 className="text-text-caption-2">Highland Medical Center</h4>
            <p className="body-regular text-text-caption-1">
              Excellence in Healthcare, Committed to Your Well-being
            </p>
          </div>

          {/* Contact Us Section */}
          <div className="flex flex-col gap-4 mt-4 md:mt-0">
            <h4 className="text-text-caption-2">Contact Us</h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-2 body-regular text-text-caption-1">
                <Phone size={16} />
                <span>(555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-2 body-regular text-text-caption-1">
                <Mail size={16} />
                <span>info@highland.med</span>
              </div>
              <div className="flex items-center space-x-2  body-regular text-text-caption-1">
                <MapPin size={16} />
                <span>123 Medical Center Dr, Highland, CA 92346</span>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="text-center body-regular text-text-caption-1">
          <p>&copy; 2025 Highland Medical Center. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
