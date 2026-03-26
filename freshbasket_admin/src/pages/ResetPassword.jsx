import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const ResetPassword = () => {

  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

const handleSubmit = async (e) => {

  e.preventDefault();

  try {

const res = await fetch("http://localhost:8000/api/reset-password", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    token,
    password
  })
});
    const data = await res.json();

    setMessage(data.message);

    if(res.ok){
      setTimeout(()=> navigate("/login"),2000);
    }

  } catch (err) {
    setMessage("Error resetting password");
  }

};
  return (

    <div className="login-page">

      <div className="login-container">

        <div className="logo">
          <span className="logo-icon">🛒</span>
          <h1>FreshBasket</h1>
        </div>

        <h2>Reset Password</h2>

        <form onSubmit={handleSubmit}>

          <input
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            required
          />

          <button type="submit">
            Reset Password
          </button>

        </form>

        {message && <p>{message}</p>}

      </div>

    </div>

  );

};

export default ResetPassword;