import React from "react";
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Users,
  FileSearch
} from "lucide-react";

export default function Sidebar({ page, setPage, allowedPages }) {
  const items = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />
    },
    {
      id: "monitoring",
      label: "Monitoring",
      icon: <Activity size={18} />
    },
    {
      id: "alerts",
      label: "Fraud Alerts",
      icon: <AlertTriangle size={18} />
    },
    {
      id: "detail",
      label: "Transaction Detail",
      icon: <FileSearch size={18} />
    },
    {
      id: "risk",
      label: "Submit Transaction",
      icon: <ShieldAlert size={18} />
    },
    {
      id: "reports",
      label: "Reports",
      icon: <FileText size={18} />
    },
    {
      id: "admin",
      label: "Admin",
      icon: <Users size={18} />
    }
  ];

  const visibleItems = items.filter((item) =>
    !allowedPages || allowedPages.includes(item.id)
  );

  return (
    <div className="sidebar">
      <div>
        <div className="logo">FraudShield</div>

        <div className="nav-menu">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => setPage(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        Cybersecurity Monitoring System
      </div>
    </div>
  );
}
