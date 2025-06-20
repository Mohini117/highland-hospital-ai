import { Card, CardContent } from "@/components/ui/card";

import { getIconComponent } from "@/lib/utils";

interface DepartmentCardProps {
  id: string;
  name: string;
  iconName: string;
}

export default function DepartmentCard({
  name,
  iconName,
}: DepartmentCardProps) {
  const IconComponent = getIconComponent(iconName);
  const displayName = name;
  return (
    <Card className="w-full bg-background shadow-md border border-border-2 rounded-lg p-0">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <IconComponent className="h-8 w-8 stroke-primary fill-primary" />
        <h3 className="text-text-title truncate w-full text-center">
          {displayName}
        </h3>
      </CardContent>
    </Card>
  );
}
