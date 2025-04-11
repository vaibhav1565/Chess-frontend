import { Link } from "react-router-dom";
import chessboard_image from "../assets/chessboard.png"

const Home = () => {

  return (
    <div className="flex mt-8">
      <img src={chessboard_image} alt="chessboard" className="w-[600px]" />
      <div className="ml-4">
        <h1 className="text-5xl">Play Chess Online!</h1>
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
}

export default Home