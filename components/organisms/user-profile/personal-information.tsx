import { PatientProfile } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PersonalInformationProps {
  patientData: PatientProfile;
  onEdit: () => void;
}

export default function PersonalInformation({
  patientData,
  onEdit,
}: PersonalInformationProps) {
  return (
    <Card className="w-full border border-border bg-background rounded-lg shadow-none mb-8 md:mb-10 p-0">
      <CardHeader className="flex flex-row items-center justify-between px-6 py-7">
        <h3 className="text-text-title">Personal Information</h3>
        <Button
          variant="ghost"
          onClick={onEdit}
          className="text-text-primary hover:text-text-primary/80 h-auto flex gap-4 items-center px-3"
        >
          <Edit size={14} />
          <div className="body-small-bold text-text-primary">Edit</div>
        </Button>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <div className="grid md:grid-cols-2 gap-y-6 gap-x-6">
          <div>
            <p className="body-small text-text-body-subtle">Full Name</p>
            <p className="body-regular text-text-title">
              {patientData.name || "N/A"}
            </p>
          </div>
          <div>
            <p className="body-small text-text-body-subtle">Email</p>
            <p className="body-regular text-text-title">
              {patientData.email || "N/A"}
            </p>
          </div>
          <div>
            <p className="body-small text-text-body-subtle">Phone</p>
            <p className="body-regular text-text-title">
              {patientData.phoneNumber || "N/A"}
            </p>
          </div>
          <div>
            <p className="body-small text-text-body-subtle">Address</p>
            <p className="body-regular text-text-title">
              {patientData.address || "N/A"}
            </p>
          </div>
          <div>
            <p className="body-small text-text-body-subtle">Date of Birth</p>
            <p className="body-regular text-text-title">
              {patientData.dateOfBirth
                ? new Date(
                    patientData.dateOfBirth + "T00:00:00"
                  ).toLocaleDateString("en-GB", {
                    day: "numeric", //25
                    month: "long", //December
                    year: "numeric", //2025
                  })
                : "N/A"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
