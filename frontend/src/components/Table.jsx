import React from "react";
import RiskBadge from "./RiskBadge";

export default function Table({ data, onRowClick }) {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Merchant</th>
            <th>Amount</th>
            <th>Category</th>
            <th>Location</th>
            <th>Risk</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item) => (
            <tr
              key={item.id}
              className={onRowClick ? "clickable-row" : ""}
              onClick={() => onRowClick && onRowClick(item)}
            >
              <td>{item.id}</td>

              <td>
                <div className="table-main-text">{item.customer}</div>
                <div className="table-sub-text">{item.email}</div>
              </td>

              <td>{item.merchant}</td>
              <td>{item.amount}</td>
              <td>{item.category}</td>
              <td>{item.location}</td>

              <td>
                <RiskBadge level={item.risk} />
              </td>

              <td>
                <span className={`table-status ${item.statusClass}`}>
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}