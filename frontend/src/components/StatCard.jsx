import React from "react";

export default function StatCard({ title, value, status, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div>{icon}</div>

        <span className={`status ${status}`}>
          {status}
        </span>
      </div>

      <h2>{value}</h2>

      <p>{title}</p>
    </div>
  );
}