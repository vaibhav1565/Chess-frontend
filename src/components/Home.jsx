import { Link } from "react-router-dom";
import chessboard_image from "../assets/chessboard.png";

const Home = () => {

  return (
    <div>
      <img src={chessboard_image} alt="chessboard" className="hidden md:inline w-96" />
      <div className="ml-4 inline-block">
        <h1 className="text-5xl text-center">Play Chess Online!</h1>
        <div className="mt-4">
          <Link to="/play">
            <button className="block cursor-pointer bg-green-600 text-white py-4 px-20 rounded">
              Play Online
            </button>
          </Link>
          <button className="block cursor-pointer bg-green-600 text-white py-4 px-20 rounded mt-2">
            Play Bots
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
