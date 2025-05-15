import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="text-6xl font-bold mb-8 text-white">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-yellow-500">
          Play Chess!
        </span>
      </h1>

      <div className="flex flex-col gap-5 w-full max-w-md">
        <Link
          to="/play"
          className="transform transition-transform"
        >
          <button className="w-full cursor-pointer bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 px-6 rounded-lg font-medium text-lg shadow-lg hover:shadow-blue-500/30 transition-all duration-300">
            Play Online
          </button>
        </Link>

        <Link
          to="/stockfish"
          className="transform transition-transform"
        >
          <button className="w-full cursor-pointer bg-gradient-to-r from-green-600 to-green-500 text-white py-4 px-6 rounded-lg font-medium text-lg shadow-lg hover:shadow-green-500/30 transition-all duration-300">
            Play Computer
          </button>
        </Link>

        <Link
          to="/local"
          className="transform transition-transform"
        >
          <button className="w-full cursor-pointer bg-gradient-to-r from-purple-600 to-purple-500 text-white py-4 px-6 rounded-lg font-medium text-lg shadow-lg hover:shadow-purple-500/30 transition-all duration-300">
            Play Locally
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Home;
