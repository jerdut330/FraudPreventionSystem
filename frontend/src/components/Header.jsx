import React from "react";
import { Bell} from "lucide-react";

export default function Header() {
  return (
    <div className="header">
      

      <div className="header-right">
        <div className="notification">
          <Bell size={18} />
          <span className="notification-dot"></span>
        </div>

        <div className="user-profile">
          <img
            src="https://i.pravatar.cc/40?img=5"
            alt="user"
          />
          <div>
            <div className="user-name">Admin</div>
            <div className="user-role">Fraud Analyst</div>
          </div>
        </div>
      </div>
    </div>
  );
}