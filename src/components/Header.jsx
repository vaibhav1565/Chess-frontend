import { useEffect } from "react";
import logo from "../assets/logo.png";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { addUser, removeUser } from "../utils/userSlice";

import { BASE_URL } from "../utils/otherConstants.jsx";

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const user = useSelector((state) => state.user);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchUser() {
      if (user) {
        if (location.pathname === "/login" || location.pathname === "/register")
          navigate("/");
        return;
      }

      if (document.cookie) {
        try {
          const res = await fetch(`${BASE_URL}/profile/view`, {
            credentials: "include",
            signal: controller.signal,
          });

          if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
          }

          const json = await res.json();
          dispatch(addUser(json));
        } catch (e) {
          // if (
          //   e.name === "TypeError" &&
          //   e.message === "NetworkError when attempting to fetch resource."
          // ) {
          //   console.log("Error while connecting to the backend");
          // }
          if (e.name !== "AbortError") {
            console.log(e);
          }
        }
      }
    }

    fetchUser();

    return () => {
      controller.abort(); // Cancel request if component unmounts or re-renders
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, navigate, user]); // location.pathname to not be included, as it is a mutable value

  async function handleSignOut() {
    try {
      const res = await fetch(BASE_URL + "/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      dispatch(removeUser());
      navigate("/login");
    } catch (e) {
      console.log(e);
      alert("Failed to sign out. Please try again.");
    }
  }

  return (
    <div className="w-full h-12 flex justify-between items-center border-white border-2 text-white px-4">
      <Link to="/">
        <img src={logo} alt="logo" className="h-10" aria-label="Logo" />
      </Link>
      {!user && (
        <div className="flex gap-1">
          <Link to="/register">
            <button
              aria-label="Sign Up"
              className="bg-[rgb(136,176,88)] w-24 p-1 rounded-sm hover:cursor-pointer"
            >
              Sign Up
            </button>
          </Link>
          <Link to="/login">
            <button
              aria-label="Log In"
              className="bg-[rgb(136,176,88)] w-24 p-1 rounded-sm hover:cursor-pointer"
            >
              Log In
            </button>
          </Link>
        </div>
      )}
      {user && (
        <button
          aria-label="Sign Out"
          className="bg-[rgb(136,176,88)] w-24 p-1 rounded-sm hover:cursor-pointer inline-block"
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      )}
    </div>
  );
};

export default Header;
