import { useState } from "react";
import { useDispatch } from "react-redux";

import { checkValidData } from "../utils/validate";
import { addUser } from "../utils/userSlice";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/constants";
import { GoogleLogin } from "@react-oauth/google";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);

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
      console.log(e);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    const message = checkValidData(email, password, false, username);
    setErrorMessage(message);
    if (message) return;

    handleRegister();
  }

  return (
    <div
      className="bg-gray-900 text-white p-6 rounded-lg w-96 shadow-lg mx-auto"
      onSubmit={(e) => handleSubmit(e)}
    >
      <h2 className="text-2xl font-bold text-center">Sign Up</h2>
      <form className="mt-6">
        <input
          type="text"
          placeholder="Username"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 mb-3"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

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
          Sign Up
        </button>
      </form>
      <p className="text-center text-gray-400 mt-4 text-sm">OR</p>
      <GoogleLogin
        onSuccess={() =>
          (window.location.href = "http://localhost:3000/auth/google")
        }
        onError={() => console.log("Login Failed")}
      />
      {/* <GoogleLogin
        onSuccess={(response) => {
          fetch("http://localhost:3000/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: response.credential }),
          })
            .then((res) => res.json())
            .then((data) => {
              localStorage.setItem("token", data.token);
              window.location.href = "/dashboard"; // Redirect after successful login
            });
        }}
        onError={() => console.log("Login Failed")}
      /> */}
      <div
        className="text-center text-gray-400 mt-4 text-sm cursor-pointer hover:underline"
        onClick={() => navigate("/login")}
      >
        Already have an account? Log In
      </div>
      {/* <p className="text-center text-gray-400 mt-4 text-sm">OR</p>
      <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded mt-4">
        Play as a Guest
      </button> */}
    </div>
  );
};
export default Register;