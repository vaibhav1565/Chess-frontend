import { useState } from "react";
import { useDispatch } from "react-redux";

import { checkValidData } from "../utils/validate";
import { addUser } from "../utils/userSlice";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/constants";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();

    setErrorMessage(null);

    const message = checkValidData(email, password, true);
    if (message) {
      setErrorMessage(message);
      return;
    }

    try {
      const res = await fetch(BASE_URL + "/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP error! Status: ${res.status}`);
      }

      setErrorMessage(null);
      // console.log(res);
      // console.log(data);
      dispatch(addUser(data));
      navigate("/");
    } catch (error) {
      console.log(error);
      setErrorMessage(`Failed to login: ${error.message}`);
    }
  }

  return (
    <form
      className="bg-gray-900 text-white text-center p-6 rounded-lg w-96 shadow-lg mx-auto max-h-min"
      onSubmit={(e) => handleLogin(e)}
    >
      <h2 className="text-2xl font-bold text-center">Log In</h2>
      <div className="mt-6">
        <input
          aria-label="Email"
          placeholder="Email"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 mb-1 focus:outline-none focus:ring-2 focus:ring-green-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          aria-label="Password"
          type="password"
          placeholder="Password"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 mt-3 focus:outline-none focus:ring-2 focus:ring-green-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {errorMessage && (
          <p className="text-red-500 text-sm mb-2">{errorMessage}</p>
        )}
        <button
          aria-label="Log In"
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded mt-4 transition duration-200"
        >
          Log In
        </button>
      </div>
      <p className="text-center text-gray-400 mt-4 text-sm">OR</p>

      <button
        aria-label="Navigate to signup page"
        type="button"
        className="w-full text-center text-gray-400 mt-4 text-sm cursor-pointer hover:underline"
        onClick={() => navigate("/register")}
      >
        New? Sign up - and start playing chess!
      </button>
    </form>
  );
};
export default Login;
