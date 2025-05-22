import { useEffect } from "react";

const AuthHandler = () => {
  useEffect(() => {
    // Get token from URL fragment
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"));
    const idToken = params.get("id_token");
    const accessToken = params.get("access_token");

    if (idToken) {
      // Decode payload
      const payload = JSON.parse(atob(idToken.split(".")[1]));

      // Extract user_id (Cognito sub)
      const user_id = payload.sub;

      // Save to localStorage
      localStorage.setItem("idToken", idToken);
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user_id", user_id);

      // Optional: redirect to dashboard or homepage
      window.location.href = "/dashboard";
    }
  }, []);

  return <div>Logging in...</div>;
};

export default AuthHandler;
