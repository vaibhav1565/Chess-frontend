
const DrawScreen = ({acceptDraw, rejectDraw}) => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Accept Draw Offer?
      </h3>
      <div className="flex gap-4">
        <button
          onClick={rejectDraw}
          className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <span className="text-xl">❌</span>
          Decline
        </button>
        <button
          onClick={acceptDraw}
          className="px-6 py-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <span className="text-xl">✅</span>
          Accept
        </button>
      </div>
    </div>
  );
}

export default DrawScreen