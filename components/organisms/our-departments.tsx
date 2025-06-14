import { departmentData } from "@/db/dummydata";
import DepartmentCard from "../molecules/departmentcard";
import { Divide } from "lucide-react";

interface DepartmentData {
  id: string;
  name: string;
  iconName: string;
}

export default function DepartmentsSection() {
  const departments: DepartmentData[] = departmentData;

  return (
    <section className="w-full">
      <h2 className="text-center text-text-title mb-8">Our Departments</h2>
      {departments.length === 0 ? (
        <div className="text-grey-500 py-4 text-center">
          No deparments found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(176px,1fr))] gap-8">
          {departments.map((department) => (
            <DepartmentCard
              key={department.id}
              id={department.id}
              name={department.name}
              iconName={department.iconName}
            />
          ))}
        </div>
      )}
    </section>
  );
}
