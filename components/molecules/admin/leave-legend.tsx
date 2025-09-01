export const LeaveLegend = () => {
  return (
    <div className=" flex-shrink-0">
      <div className="bg-background-1  p-4 rounded-lg ">
        <h3 className="font-semibold text-gray-800 ">Legend</h3>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 bg-red-100 rounded-md  " />
            <span className="text-xs">Full Day Leave</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 bg-orange-100 rounded-md" />
            <span className="text-xs">First Half Leave</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 bg-yellow-100 rounded-md" />
            <span className="text-xs">Second Half Leave</span>
          </div>
        </div>
      </div>
    </div>
  );
};
