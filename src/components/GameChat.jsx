
const GameChat = ({chatHistory, chatMessage, onMessageChange, onSendMessage}) => {
  return (
    <div className="flex flex-col relative flex-1">
      {/* Chat history*/}
      <ul className="overflow-y-scroll max-h-[150px]">
        {chatHistory.map((message, index) => {
          return (
            <li className="text-black"
            key={index}>
              {typeof message === "object"
                ? `${message.from} - ${message.text}`
                : message}
            </li>
          );
        })}
      </ul>

      {/* Chat input field */}
      <div className="absolute bottom-0 w-full flex gap-2">
        <input
          placeholder="Send a message..."
          value={chatMessage}
          onChange={onMessageChange}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none"
        />
        <button
          onClick={onSendMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default GameChat