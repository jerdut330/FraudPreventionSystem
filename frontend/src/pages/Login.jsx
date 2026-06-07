import React, { useState } from "react";
import { ShieldCheck, LockKeyhole, Mail } from "lucide-react";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@fraudshield.com");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getServerErrorMessage = (detail) => {
    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg).join(", ");
    }

    return "Login failed.";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getServerErrorMessage(data.detail));
      }

      onLogin(data.user, rememberMe);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page centered-login-page">
      <div className="centered-login-box">
        <div className="auth-brand centered-brand">
          <div className="brand-mark">
            <ShieldCheck size={24} />
          </div>
          <span>FraudShield</span>
        </div>

        <div className="auth-form-wrapper centered-form">
          <div className="auth-title-block">
            <h1>Welcome back</h1>
            <p>
              Monitor fraud risks, alerts, and suspicious transactions in real time.
            </p>
          </div>

          {error && <div className="login-error-message">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
            <label>Email address</label>
            <div className="input-with-icon">
              <Mail size={18} />
              <input
                type="email"
                placeholder="admin@fraudshield.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            </div>

            <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <LockKeyhole size={18} />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            </div>

            <div className="auth-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span>Remember for 30 days</span>
            </label>

            <button className="link-button" type="button">
              Forgot password?
            </button>
            </div>

            <button
              className="primary-login-btn"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="login-help-text">
            Demo admin: admin@fraudshield.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
