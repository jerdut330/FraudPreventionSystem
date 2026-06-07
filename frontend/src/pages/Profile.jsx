import React, { useState } from "react";
import PageHeader from "../components/PageHeader";

export default function Profile({ currentUser }) {
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const canChangePassword = currentUser?.account_type === "merchant";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setMessage("");
  };

  const getServerErrorMessage = (detail) => {
    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg).join(", ");
    }

    return "Could not change password.";
  };

  const submitPasswordChange = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/change-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: currentUser.email,
            current_password: passwordForm.current_password,
            new_password: passwordForm.new_password
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getServerErrorMessage(data.detail));
      }

      setMessage(data.message);
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: ""
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not change password.");
    } finally {
      setSaving(false);
    }
  };

  const displayRole = currentUser?.role || "User";
  const displayType = currentUser?.account_type || "Account";
  const displayBusinessType =
    currentUser?.business_type || currentUser?.role || currentUser?.account_type || "-";

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="Manage account information and login security"
      />

      <div className="profile-settings">
        <section className="profile-section">
          <div className="profile-section-header">
            <h2>Account Info</h2>
            <p>Details for the account currently signed in.</p>
          </div>

          <div className="profile-setting-row">
            <span>Name</span>
            <strong>{currentUser?.name}</strong>
          </div>

          <div className="profile-setting-row">
            <span>Email</span>
            <strong>{currentUser?.email}</strong>
          </div>

          <div className="profile-setting-row">
            <span>Role</span>
            <strong>{displayRole}</strong>
          </div>

          <div className="profile-setting-row">
            <span>{displayType === "merchant" ? "Business Type" : "Account Type"}</span>
            <strong>{displayBusinessType}</strong>
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-section-header">
            <h2>Password & Security</h2>
            <p>Update the password used to sign in to this account.</p>
          </div>

          {!canChangePassword ? (
            <div className="profile-info-message">
              Demo admin password is fixed and cannot be changed from the app.
            </div>
          ) : (
            <form className="profile-security-form" onSubmit={submitPasswordChange}>
              {error && <div className="password-error-message">{error}</div>}
              {message && <div className="password-success-message">{message}</div>}

              <div className="profile-setting-row profile-password-row">
                <span>Current Password</span>
                <input
                  type="password"
                  name="current_password"
                  value={passwordForm.current_password}
                  onChange={handleChange}
                  required
                  placeholder="Enter current password"
                />
              </div>

              <div className="profile-setting-row profile-password-row">
                <span>New Password</span>
                <input
                  type="password"
                  name="new_password"
                  value={passwordForm.new_password}
                  onChange={handleChange}
                  required
                  minLength="6"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="profile-setting-row profile-password-row">
                <span>Confirm Password</span>
                <input
                  type="password"
                  name="confirm_password"
                  value={passwordForm.confirm_password}
                  onChange={handleChange}
                  required
                  minLength="6"
                  placeholder="Repeat new password"
                />
              </div>

              <div className="profile-actions">
                <button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Password"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
