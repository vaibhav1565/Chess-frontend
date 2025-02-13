import { BrowserRouter, Route, Routes } from "react-router-dom";
import Game from "./components/Game";
import Home from "./components/Home";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Provider } from "react-redux";
import appStore from "./utils/appStore";

export default function App() {
  return (
  <Provider store={appStore}>
    <GoogleOAuthProvider clientId="529076617504-08a9igj8ro3tloi25saogb0vj7orcklb.apps.googleusercontent.com">
      <BrowserRouter>
        <Routes>
          <Route path="/play" element={<Game />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </Provider>
  );
}