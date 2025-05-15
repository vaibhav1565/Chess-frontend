import { STOCKFISH_IMAGE, USER_IMAGE } from "../utils/otherConstants";

const PlayerTile = ({ playerName, isBot = false }) => {
  return (
    <div className="w-full flex self-start gap-3">
      <img
        className="w-10"
        src={isBot ? STOCKFISH_IMAGE : USER_IMAGE}
        alt="User"
      />
      <p className="text-lg">{playerName}</p>
    </div>
  );
};

export default PlayerTile;
