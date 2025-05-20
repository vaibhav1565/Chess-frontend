import { useState } from "react";
import { useDispatch } from "react-redux";

import { checkValidData } from "../utils/validate";
import { addUser } from "../utils/userSlice";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/otherConstants";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);

  async function createGuestAccount() {
    setErrorMessage(null);

    try {
      const res = await fetch(BASE_URL + "/guest/signup",{
        method: "POST",
        credentials: "include"
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP error! Status: ${res.status}`);
      }

      setErrorMessage(null);
      dispatch(addUser(data));
      navigate("/");
      console.clear();
    }
    catch (error) {
      console.log(error);
      setErrorMessage(`Failed to signup: ${error.message}`);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();

    setErrorMessage(null);

    const message = checkValidData(email, password, false, username);
    if (message) {
      setErrorMessage(message);
      return;
    }

    try {
      const res = await fetch(BASE_URL + "/register", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP error! Status: ${res.status}`);
      }

      setErrorMessage(null);

      dispatch(addUser(data));
      navigate("/");
      console.clear();
    } catch (error) {
      console.log(error);
      setErrorMessage(`Failed to signup: ${error.message}`);
    }
  }

  return (
    <form
      className="bg-gray-900 text-white text-center p-6 rounded-lg w-96 shadow-lg mx-auto max-h-min"
      onSubmit={(e) => handleRegister(e)}
    >
      <h2 className="text-2xl font-bold text-center">Sign Up</h2>

      <div className="mt-6">
        <input
          type="text"
          placeholder="Username"
          aria-label="Username"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 mb-3"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          placeholder="Email"
          aria-label="Email"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 mb-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          aria-label="Password"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 mt-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {errorMessage && (
          <p className="text-red-500 text-sm mb-2">{errorMessage}</p>
        )}

        <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded mt-4">
          Sign Up
        </button>
      </div>

      <p className="text-center text-gray-400 mt-4 text-sm">OR</p>
      <button
        aria-label="Create a guest account"
        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded mt-4"
        onClick={createGuestAccount}
        type="button"
      >
        Play as a Guest
      </button>

      <button
        aria-label="Navigate to login page"
        type="button"
        className="w-full text-center text-gray-400 mt-4 text-sm cursor-pointer hover:underline"
        onClick={() => navigate("/login")}
      >
        Already have an account? Log In
      </button>
    </form>
  );
};
export default Register;
