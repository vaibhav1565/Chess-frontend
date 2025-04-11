import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import Play from "./components/Play2";
import Sidebar from "./components/Sidebar";
import { Provider } from "react-redux";
import store from "./utils/store";
import Login from "./components/Login";
import Home from "./components/Home";
import Register from "./components/Register";
import { GoogleOAuthProvider } from "@react-oauth/google";

export default function App() {
  const AppLayout = () => {
    return (
      <>
        <Sidebar />
        <Outlet />
      </>
    );
  };
  const appRouter = createBrowserRouter([
    {
      path: "/",
      element: <AppLayout />,
      children: [
        {
          path: "/",
          element: <Home />
        },
        {
          path: "/play",
          element: <Play />,
        },
        {
          path: "/login",
          element: <Login />,
        },
        {
          path: "/register",
          element: <Register />
        }
      ],
    },
  ]);
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Provider store={store}>
        <RouterProvider router={appRouter} />
      </Provider>
    </GoogleOAuthProvider>
  );
}
