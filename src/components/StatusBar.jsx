
const StatusBar = ({status}) => {
  return (
    <div>
      {status && (
        <div className="my-3 px-4 py-2.5 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg shadow-md border border-gray-600 inline-block">
          <p className="text-base sm:text-lg md:text-xl font-medium text-amber-300">
            {status.split("\n").map((line, i) => (
              <span
                key={i}
                className={i > 0 ? "block mt-1 text-sm text-gray-300" : ""}
              >
                {line}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}

export default StatusBar