import React from "react";
import { Bell, LogOut } from "lucide-react";

export default function Header({ currentUser, onLogout, onProfileClick }) {
  return (
    <div className="header">
      <div className="header-right">
        <div className="notification">
          <Bell size={18} />
          <span className="notification-dot"></span>
        </div>

        <button
          className="user-profile profile-button"
          type="button"
          onClick={onProfileClick}
        >
          <img
            src="https://i.pravatar.cc/40?img=5"
            alt="user"
          />
          <div>
            <div className="user-name">{currentUser?.name || "User"}</div>
            <div className="user-role">{currentUser?.role || "Fraud Analyst"}</div>
          </div>
        </button>

        <button className="logout-btn" type="button" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
}
