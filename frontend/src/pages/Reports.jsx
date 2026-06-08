import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { buildApiUrl, buildAuthHeaders } from "../utils/api";

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    return new Date(dateString).toLocaleString("en-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  useEffect(() => {
    const requestOptions = { headers: buildAuthHeaders() };

    Promise.all([
      fetch(buildApiUrl("/dashboard/summary"), requestOptions).then((res) => res.json()),
      fetch(buildApiUrl("/transactions"), requestOptions).then((res) => res.json()),
      fetch(buildApiUrl("/alerts"), requestOptions).then((res) => res.json())
    ])
      .then(([summaryData, transactionData, alertData]) => {
        setSummary(summaryData);
        setTransactions(transactionData.transactions || []);
        setAlerts(alertData.alerts || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load report data from backend.");
        setLoading(false);
      });
  }, []);

  const filteredTransactions = transactions.filter((transaction) => {
    const riskValue = String(transaction.risk_level).toLowerCase();
    const statusValue = String(transaction.transaction_status).toLowerCase();
    const matchesRisk =
      riskFilter === "all" || riskValue.includes(riskFilter);
    const matchesStatus =
      statusFilter === "all" || statusValue.includes(statusFilter);

    return matchesRisk && matchesStatus;
  });

  const escapeCsvValue = (value) => {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };

  const exportTransactionsCsv = () => {
    const headers = [
      "Transaction ID",
      "Customer",
      "Customer Email",
      "Merchant",
      "Amount",
      "Product Category",
      "Risk Score",
      "Risk Level",
      "Status",
      "Decision",
      "Date"
    ];

    const rows = filteredTransactions.map((transaction) => [
      `TX-${transaction.transaction_id}`,
      transaction.customer_name,
      transaction.customer_email,
      transaction.merchant_name,
      transaction.amount,
      transaction.product_category,
      transaction.risk_score,
      transaction.risk_level,
      transaction.transaction_status,
      transaction.decision,
      formatDate(transaction.transaction_date)
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `fraudshield-transactions-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Reports & History"
          subtitle="Loading fraud prevention report data..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Reports & History"
          subtitle="Fraud prevention report summary"
        />
        <p style={{ marginTop: "30px", color: "#ff7b7b" }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reports & History"
        subtitle="Historical fraud report generated from PostgreSQL"
      />

      <div className="report-summary-grid">
        <div className="report-card">
          <span>Total Transactions</span>
          <strong>{summary.total_transactions}</strong>
        </div>

        <div className="report-card">
          <span>Total Value</span>
          <strong>{formatCurrency(summary.total_transaction_value)}</strong>
        </div>

        <div className="report-card">
          <span>Total Alerts</span>
          <strong>{summary.total_alerts}</strong>
        </div>

        <div className="report-card">
          <span>Reviewed Alerts</span>
          <strong>{summary.reviewed_alerts}</strong>
        </div>
      </div>

      <div className="report-breakdown-grid">
        <div className="report-panel">
          <h3>Transaction Status Breakdown</h3>

          <div className="report-list">
            <div>
              <span>Approved</span>
              <strong className="safe-text">{summary.approved_transactions}</strong>
            </div>

            <div>
              <span>Pending Review</span>
              <strong className="warning-text">{summary.pending_review}</strong>
            </div>

            <div>
              <span>Frozen</span>
              <strong className="danger-text">{summary.frozen_transactions}</strong>
            </div>

            <div>
              <span>Rejected</span>
              <strong className="danger-text">{summary.rejected_transactions}</strong>
            </div>
          </div>
        </div>

        <div className="report-panel">
          <h3>Risk Level Breakdown</h3>

          <div className="report-list">
            <div>
              <span>High Risk</span>
              <strong className="danger-text">{summary.high_risk}</strong>
            </div>

            <div>
              <span>Medium Risk</span>
              <strong className="warning-text">{summary.medium_risk}</strong>
            </div>

            <div>
              <span>Low Risk</span>
              <strong className="safe-text">{summary.low_risk}</strong>
            </div>

            <div>
              <span>Unread Alerts</span>
              <strong className="warning-text">{summary.unread_alerts}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="report-panel report-table-panel">
        <div className="report-panel-header">
          <div>
            <h3>Transaction History Report</h3>
            <p>Complete recent transaction history and fraud decisions</p>
          </div>

          <div className="report-table-controls">
            <select
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
            >
              <option value="all">All Risks</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending Review</option>
              <option value="rejected">Rejected</option>
              <option value="frozen">Frozen</option>
            </select>

            <span>{filteredTransactions.length} records</span>

            <button
              className="report-export-btn"
              type="button"
              onClick={exportTransactionsCsv}
              disabled={filteredTransactions.length === 0}
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Customer</th>
                <th>Merchant</th>
                <th>Amount</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Decision</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.transaction_id}>
                  <td>TX-{transaction.transaction_id}</td>
                  <td>{transaction.customer_name}</td>
                  <td>{transaction.merchant_name}</td>
                  <td>{formatCurrency(transaction.amount)}</td>
                  <td>{transaction.risk_level}</td>
                  <td>{transaction.transaction_status}</td>
                  <td>{transaction.decision}</td>
                  <td>{formatDate(transaction.transaction_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="report-panel report-table-panel">
        <div className="report-panel-header">
          <div>
            <h3>Alert History Report</h3>
            <p>Fraud alerts generated by the system</p>
          </div>

          <span>{alerts.length} alerts</span>
        </div>

        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Transaction</th>
                <th>Customer</th>
                <th>Merchant</th>
                <th>Risk Score</th>
                <th>Risk Level</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.alert_id}>
                  <td>AL-{alert.alert_id}</td>
                  <td>TX-{alert.transaction_id}</td>
                  <td>{alert.customer_name}</td>
                  <td>{alert.merchant_name}</td>
                  <td>{alert.risk_score}/100</td>
                  <td>{alert.risk_level}</td>
                  <td>{alert.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
