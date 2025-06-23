interface Params {
  doctorId: string;
}

export default async function DoctorProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const doctorIdObject = await params;
  const { doctorId } = doctorIdObject;
  return (
    <div className="w-full flex flex-col md:flex-row justify-between">
      <div className="flex flex-col gap-6 md:gap-8 md:max-w-[908px]">
        <div>DoctorProfileTopCard </div>
        <div className="md:hidden">Appoint Scheduler</div>
        <div>About Section</div>
        <div>Reviews</div>
      </div>
      <div className="hidden md:block">Appoint Scheduler</div>
    </div>
  );
}
