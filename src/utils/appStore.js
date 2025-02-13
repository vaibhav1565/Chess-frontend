import { configureStore } from "@reduxjs/toolkit";
import userSlice from "./userSlice.js";

const appStore = configureStore({
    reducer: {
        user: userSlice
    }
})

export default appStore;