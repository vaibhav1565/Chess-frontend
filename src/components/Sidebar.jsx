import { useEffect } from "react";
import logo from "../assets/logo.png";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { addUser, removeUser } from "../utils/userSlice";

import { BASE_URL } from "../utils/constants";

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const user = useSelector((state) => state.user);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchUser() {
      if (user) {
        if (location.pathname === "/login" || location.pathname === "/register") navigate("/");
        return;
      }

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
        if (
          e.name === "TypeError" &&
          e.message === "NetworkError when attempting to fetch resource."
        ) {
          console.log("Error while connecting to the backend");
        } else if (e.name !== "AbortError") {
          console.log(e);
          // if (
          //   location.pathname !== "/login" &&
          //   location.pathname !== "/register" && location.pathname !== "/"
          // )
          //   navigate("/login");
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
    <div className="h-screen float-left w-36 mr-8 px-2 flex flex-col bg-[rgb(38,37,34)] text-white">
      <Link to="/">
        {" "}
        <img src={logo} alt="logo" className="w-32" aria-label="Logo" />
      </Link>
      {!user && (
        <>
          <Link to="/register">
            <button
              aria-label="Sign Up"
              className="bg-[rgb(136,176,88)] w-28 my-2 mx-2 px-3 py-2 rounded-lg hover:cursor-pointer"
            >
              Sign Up
            </button>
          </Link>
          <Link to="/login">
            <button
              aria-label="Log In"
              className="bg-[rgb(59,58,56)] w-28 my-2 mx-2 px-3 py-2 rounded-lg hover:cursor-pointer"
            >
              Log In
            </button>
          </Link>
        </>
      )}
      {user && (
        <button
          aria-label="Sign Out"
          className="bg-[rgb(59,58,56)] my-2 mx-2 px-3 py-2 rounded-lg hover:cursor-pointer"
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      )}
    </div>
  );
};

export default Sidebar;
