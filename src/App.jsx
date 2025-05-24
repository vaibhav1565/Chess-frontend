import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import Play from "./components/Play";
import Header from "./components/Header";
import { Provider } from "react-redux";
import store from "./utils/store";
import Login from "./components/Login";
import Home from "./components/Home";
import Register from "./components/Register";
import Stockfish from "./components/Stockfish";
import PlayLocal from "./components/PlayLocal";
import ChessBoardTest from "./components/ChessBoardTest";

export default function App() {
  const AppLayout = () => {
    return (
      <>
        <Header />
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
          element: <Home />,
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
          element: <Register />,
        },
        {
          path: "/stockfish",
          element: <Stockfish />,
        },
        {
          path: "/local",
          element: <PlayLocal />,
        },
        {
          path: "/localtest",
          element: <ChessBoardTest />,
        },
      ],
    },
  ]);
  return (
      <Provider store={store}>
        <RouterProvider router={appRouter} />
      </Provider>
  );
}
