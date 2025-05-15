/* eslint-disable react/prop-types */
import { TIME_CONTROLS } from "../utils/chessConstants";

const TimeControls = ({
  timeConfig,
  setTimeConfig,
  isTimeConfig,
  setIsTimeConfig,
}) => {
  return (
    <div className="flex flex-col gap-2 w-5/6 mb-4 max-w-screen">
      <button
        onClick={() => setIsTimeConfig(!isTimeConfig)}
        className={`cursor-pointer flex items-center justify-center gap-2 p-4 rounded-xl transition-colors bg-gray-200 text-black hover:bg-gray-100`}
      >
        {`${timeConfig.minutes} ${
          timeConfig.increment !== 0 ? `| ${timeConfig.increment}` : ""
        } min`}
        {" "}
        {isTimeConfig ? "⬆" : "⬇"}
      </button>
      {isTimeConfig && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 z-50 p-4">
          <div className="grid grid-cols-3 gap-2">
            {TIME_CONTROLS.map((timeControl) => (
              <button
                key={`${timeControl.minutes}-${timeControl.increment}`}
                onClick={() => {
                  if (timeControl.increment) return;
                  setTimeConfig({
                    minutes: timeControl.minutes,
                    increment: timeControl.increment,
                  });
                  setIsTimeConfig(false);
                }}
                className={`${
                  timeControl.minutes === timeConfig.minutes &&
                  timeControl.increment === timeConfig.increment
                    ? "border-3 border-green-500"
                    : ""
                } ${timeControl.increment ? "cursor-not-allowed" : "cursor-pointer"} px-3 py-2 text-black bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium`}
              >
                {`${timeControl.minutes} ${
                  timeControl.increment !== 0
                    ? `| ${timeControl.increment}`
                    : ""
                } min`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeControls;
