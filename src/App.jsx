import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import Game from "./components/Game";
import Sidebar from "./components/Sidebar";
import { Provider } from "react-redux";
import store from "./utils/store";
import Login from "./components/Login";

export default function App() {
const AppLayout = ()=> {
  return (
    <>
    <Sidebar/>
    <Outlet />
    </>
  )
}
const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        path: "/play",
        element: <Game />,
      },
      {
        path: "/",
        element: <Login />,
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