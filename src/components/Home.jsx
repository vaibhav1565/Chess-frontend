import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { useDispatch } from 'react-redux';
import { setUserInfo } from '../utils/userSlice';
import { useNavigate } from 'react-router-dom';

const Home = () => {
const dispatch = useDispatch();
const navigate = useNavigate();
  return (
    <div>
      <h1>React Google Login</h1>
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          dispatch(setUserInfo(jwtDecode(credentialResponse.credential)));
          navigate("/play");
        }}
        onError={() => {
          console.log("Login Failed");
        }}
      />
    </div>
  );
}

export default Home