import React from "react";
import { ShieldCheck, LockKeyhole, Mail } from "lucide-react";

export default function Login({ setLoggedIn }) {
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

          <div className="form-group">
            <label>Email address</label>
            <div className="input-with-icon">
              <Mail size={18} />
              <input type="email" placeholder="admin@fraudshield.com" />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <LockKeyhole size={18} />
              <input type="password" placeholder="Enter your password" />
            </div>
          </div>

          <div className="auth-options">
            <label className="remember-me">
              <input type="checkbox" />
              <span>Remember for 30 days</span>
            </label>

            <button className="link-button" type="button">
              Forgot password?
            </button>
          </div>

          <button
            className="primary-login-btn"
            onClick={() => setLoggedIn(true)}
          >
            Sign in
          </button>

          <div className="divider">
            <span></span>
            <p>or continue with</p>
            <span></span>
          </div>

          <div className="social-login-grid">
            <button
              className="social-login-btn"
              onClick={() => setLoggedIn(true)}
            >
              <span className="google-icon">G</span>
              Google
            </button>

            <button
              className="social-login-btn"
              onClick={() => setLoggedIn(true)}
            >
              <span className="microsoft-icon">
                <i></i>
                <i></i>
                <i></i>
                <i></i>
              </span>
              Microsoft
            </button>
          </div>

          <p className="signup-text">
            Don&apos;t have an account?{" "}
            <button type="button" className="link-button">
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}