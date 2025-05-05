import { TIME_CONTROLS } from "../utils/playConstants";

const TimeControls = ({
  minutes,
  setMinutes,
  isTimeToggled,
  setIsTimeToggled,
}) => {
  return (
    <div className="flex flex-col gap-2 w-5/6 mb-4 max-w-screen">
      <button
        onClick={() => setIsTimeToggled(!isTimeToggled)}
        className={`cursor-pointer flex items-center justify-center gap-2 p-4 rounded-xl transition-colors bg-gray-200 text-black hover:bg-gray-100`}
      >
        {minutes} min
      </button>
      {isTimeToggled && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 z-50">
          {Object.keys(TIME_CONTROLS).map((category) => {
            return (
              <div className="p-4" key={category}>
                <p className="font-semibold text-gray-700 mb-2">
                  {category[0].toUpperCase() + category.slice(1).toLowerCase()}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_CONTROLS[category].map((timeControl) => {
                    return (
                      <button
                        key={`${timeControl.minutes} | ${timeControl.increment}`}
                        onClick={() => {
                          if (timeControl.increment) return;
                          setMinutes(timeControl.minutes);
                          setIsTimeToggled(false);
                        }}
                        className={`${
                          timeControl.increment
                            ? "cursor-not-allowed"
                            : "cursor-pointer"
                        }
                        ${minutes === timeControl.minutes && ! timeControl.increment ? " border-3 border-green-500" : ""}
                        px-3 py-2 text-black bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium`}
                      >
                        {timeControl.increment
                          ? `${timeControl.minutes} | ${timeControl.increment}`
                          : `${timeControl.minutes} min`}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TimeControls;
