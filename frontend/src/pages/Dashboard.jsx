import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Snowflake,
  DollarSign
} from "lucide-react";

import PageHeader from "../components/PageHeader";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(value);
  };

  useEffect(() => {
    Promise.all([
      fetch("http://localhost:8000/dashboard/summary").then((res) => res.json()),
      fetch("http://localhost:8000/dashboard/trends").then((res) => res.json()),
      fetch("http://localhost:8000/alerts").then((res) => res.json()),
      fetch("http://localhost:8000/transactions").then((res) => res.json())
    ])
      .then(([summaryData, trendData, alertData, transactionData]) => {
        setSummary(summaryData);
        setTrends(trendData.trends || []);
        setAlerts((alertData.alerts || []).slice(0, 4));
        setTransactions((transactionData.transactions || []).slice(0, 5));
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading || !summary) {
    return (
      <div>
        <PageHeader
          title="Dashboard Overview"
          subtitle="Loading real-time fraud prevention data..."
        />
      </div>
    );
  }

  const maxTrend = Math.max(...trends.map((item) => item.total), 1);

  return (
    <div>
      <PageHeader
        title="FraudShield Command Center"
        subtitle="Real-time fraud prevention dashboard from PostgreSQL"
      />

      <div className="command-stats-grid">
        <div className="command-card blue">
          <div>
            <span>Total Transactions</span>
            <h2>{summary.total_transactions}</h2>
            <p>Live database records</p>
          </div>
          <Activity />
        </div>

        <div className="command-card yellow">
          <div>
            <span>Pending Review</span>
            <h2>{summary.pending_review}</h2>
            <p>Need analyst decision</p>
          </div>
          <AlertTriangle />
        </div>

        <div className="command-card red">
          <div>
            <span>Frozen Transactions</span>
            <h2>{summary.frozen_transactions}</h2>
            <p>Blocked for investigation</p>
          </div>
          <Snowflake />
        </div>

        <div className="command-card green">
          <div>
            <span>Total Value</span>
            <h2>{formatCurrency(summary.total_transaction_value)}</h2>
            <p>Processed transaction value</p>
          </div>
          <DollarSign />
        </div>
      </div>

      <div className="command-main-grid">
        <section className="command-chart-panel">
          <div className="panel-header">
            <div>
              <h3>Fraud Detection Trends</h3>
              <p>Transaction activity grouped by database date</p>
            </div>
            <div className="stable-pill">SYSTEM STABLE</div>
          </div>

          <div className="trend-chart">
            {trends.length === 0 ? (
              <p className="empty-text">No trend data available.</p>
            ) : (
              trends.map((item) => {
                const height = Math.max((item.total / maxTrend) * 100, 8);

                return (
                  <div className="trend-bar-item" key={item.date}>
                    <div className="trend-bar-wrap">
                      <div
                        className="trend-bar total"
                        style={{ height: `${height}%` }}
                      ></div>
                    </div>
                    <span>{item.date.slice(5)}</span>
                    <strong>{item.total}</strong>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="priority-alert-panel">
          <div className="panel-header compact">
            <h3>Priority Alerts</h3>
            <span className="live-pill">LIVE</span>
          </div>

          <div className="priority-alert-list">
            {alerts.length === 0 ? (
              <p className="empty-text">No alerts found.</p>
            ) : (
              alerts.map((alert) => (
                <div className="priority-alert-item" key={alert.alert_id}>
                  <ShieldAlert />
                  <div>
                    <strong>TX-{alert.transaction_id}</strong>
                    <p>{alert.alert_message}</p>
                    <span>{alert.risk_level} • {alert.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="recent-activity-panel">
        <div className="panel-header">
          <div>
            <h3>Recent Activity Log</h3>
            <p>Latest transactions from PostgreSQL</p>
          </div>
        </div>

        <div className="recent-table-wrap">
          <table className="recent-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Customer</th>
                <th>Merchant</th>
                <th>Amount</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Decision</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.transaction_id}>
                  <td>TX-{tx.transaction_id}</td>
                  <td>{tx.customer_name}</td>
                  <td>{tx.merchant_name}</td>
                  <td>{formatCurrency(tx.amount)}</td>
                  <td>{tx.risk_level}</td>
                  <td>{tx.transaction_status}</td>
                  <td>{tx.decision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="command-stats-grid bottom-grid">
        <div className="mini-command-card">
          <CheckCircle />
          <span>Approved</span>
          <strong>{summary.approved_transactions}</strong>
        </div>

        <div className="mini-command-card">
          <AlertTriangle />
          <span>Unread Alerts</span>
          <strong>{summary.unread_alerts}</strong>
        </div>

        <div className="mini-command-card">
          <ShieldAlert />
          <span>Medium Risk</span>
          <strong>{summary.medium_risk}</strong>
        </div>

        <div className="mini-command-card">
          <ShieldAlert />
          <span>Low Risk</span>
          <strong>{summary.low_risk}</strong>
        </div>
      </div>
    </div>
  );
}