import { useState } from "react";
import { useDispatch } from "react-redux";

import { checkValidData } from "../utils/validate";
import { addUser } from "../utils/userSlice";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/constants";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);

  async function handleLogin() {
    try {
      const res = await fetch(BASE_URL + "/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      setErrorMessage("");
      dispatch(addUser(res.data));
      navigate("/play");
      console.clear();

    } catch (e) {
      // console.log(e.response.data);
      // setErrorMessage(e.response.data.error);
      console.log(e);
    }
  }

  async function handleRegister() {
    try {
      const res = await fetch(BASE_URL + "/register", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      setErrorMessage("");
      dispatch(addUser(res.data));
      navigate("/play");
      console.clear();
    } catch (e) {
      // console.log(e.response.data);
      // setErrorMessage(e.response.data.error);
      console.log(e);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    const message = checkValidData(email, password, isLogin, username);
    setErrorMessage(message);
    if (message) return;

    if (isLogin) handleLogin();
    else handleRegister();
  }

  function handleGoogleLogin() {
    
  }

  return (
    <div
      className="bg-gray-900 text-white p-6 rounded-lg w-96 shadow-lg mx-auto"
      onSubmit={(e) => handleSubmit(e)}
    >
      <h2 className="text-2xl font-bold text-center">
        {isLogin ? "Log In" : "Sign Up"}
      </h2>
      <form className="mt-6">
        {!isLogin && (
          <input
            type="text"
            placeholder="Username"
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 mb-3"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 mb-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 mt-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-red-500 text-sm mb-2">{errorMessage}</p>
        <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded mt-4">
          {isLogin ? "Log In" : "Sign Up"}
        </button>
      </form>
      <p className="text-center text-gray-400 mt-4 text-sm">OR</p>
      <button
        className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 rounded flex items-center justify-center mt-3"
        onClick={handleGoogleLogin}
      >
        Continue with Google
      </button>
      <div
        className="text-center text-gray-400 mt-4 text-sm cursor-pointer hover:underline"
        onClick={() => setIsLogin(!isLogin)}
      >
          {!isLogin
            ? "Already have an account? Log In"
            : "New? Sign up - and start playing chess!"}
      </div>
      {/* <p className="text-center text-gray-400 mt-4 text-sm">OR</p>
      <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded mt-4">
        Play as a Guest
      </button> */}
    </div>
  );
};
export default Login;
