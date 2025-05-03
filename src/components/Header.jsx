import chess_logo from "../assets/logo.png";

const Header = () => {
  return (
    <div className="flex justify-between items-center">
        <img src={chess_logo} alt="Website logo" className="w-32"/>
        <div>
            <button className="p-2 bg-green-500 text-white rounded-lg mr-2">Sign Up</button>
            <button className="p-2 bg-green-500 text-white rounded-lg">Log In</button>
        </div>
    </div>
  )
}

export default Header