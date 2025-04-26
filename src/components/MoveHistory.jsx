
const MoveHistory = ({history, historyIndex, setHistoryIndex}) => {
  return (
    <ul className="h-full overflow-y-scroll">
      {(function () {
        let moveHistory = [];
        for (let move = 0; move < history.length; move += 2) {
          moveHistory.push(history.slice(move, move + 2));
        }
        return moveHistory;
      })().map((item, index) => {
        return (
          <li
            key={index}
            className="grid grid-cols-3 px-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-xl shadow-md hover:from-blue-100 hover:to-blue-200 hover:shadow-lg transition-all duration-300"
          >
            <span className="p-2">{index + 1} .</span>
            <span
              className={`p-2 cursor-pointer text-center ${
                index * 2 === historyIndex ? "bg-gray-400" : ""
              }`}
              onClick={() => setHistoryIndex(index * 2)}
            >
              {" "}
              {item[0]}
            </span>
            {item[1] && (
              <span
                className={`p-2 cursor-pointer text-center ${
                  index * 2 + 1 === historyIndex ? "bg-gray-400" : ""
                }`}
                onClick={() => setHistoryIndex(index * 2 + 1)}
              >
                {" "}
                {item[1]}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default MoveHistory