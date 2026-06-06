import React from "react";

export default function RiskBadge({ level }) {
  return (
    <span className={`risk-badge ${level.toLowerCase()}`}>
      {level}
    </span>
  );
}