export const checkValidData = (email, password, isLogin, username = undefined) => {
    if (!isLogin) {
        if (username.length < 5 || username.length > 10) return "Username must be of 5-10 characters";
    }

    const isEmailValid = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);

    if (!isEmailValid) return "Email is not valid";
    if (!isLogin) {
        if (password.length < 8 || password.length > 100) return "Password must be of 8-100 characters";
    }
}