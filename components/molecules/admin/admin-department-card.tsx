"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Loader2 } from "lucide-react";
import { DepartmentData } from "@/types";
import { getIconComponent } from "@/lib/utils";

interface AdminDepartmentCardProps {
  department: DepartmentData;
  onEdit: (department: DepartmentData) => void;
  onDelete: (department: DepartmentData) => void;
  isDeleting: boolean;
  isEditingAnother: boolean;
}

export default function AdminDepartmentCard({
  department,
  onEdit,
  onDelete,
  isDeleting,
  isEditingAnother,
}: AdminDepartmentCardProps) {
  const IconComponent = getIconComponent(department.iconName);

  return (
    <Card className="w-full p-0 rounded-lg border border-border bg-background-1">
      {/* Main container is a flexbox with a gap */}
      <CardContent className="flex flex-col p-4">
        {/* Top row for icon and buttons */}
        <div className="flex items-center justify-between w-full mb-3">
          {/* Icon on the left */}
          {IconComponent ? (
            <IconComponent
              className="h-5 w-5 stroke-primary fill-primary"
              strokeWidth={1.5}
            />
          ) : (
            <div className="h-7 w-7 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
              ?
            </div>
          )}

          {/* Buttons on the right, with a gap between them */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 text-muted-foreground hover:text-primary"
              onClick={() => onEdit(department)}
              disabled={isDeleting || isEditingAnother}
              title={`Edit ${department.name}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 text-alert-1 hover:text-alert-2"
              onClick={() => onDelete(department)}
              disabled={isDeleting || isEditingAnother}
              title={`Delete ${department.name}`}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Bottom row for the name */}
        <div className="body-semibold">{department.name}</div>
      </CardContent>
    </Card>
  );
}
