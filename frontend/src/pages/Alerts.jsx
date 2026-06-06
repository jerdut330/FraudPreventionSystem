import React, { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";

export default function Alerts({ setPage, setSelectedTransactionId }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [reviewLoading, setReviewLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchAlerts = () => {
    setLoading(true);
    setError("");

    fetch("http://localhost:8000/alerts")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch alerts");
        }

        return res.json();
      })
      .then((data) => {
        setAlerts(data.alerts);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load fraud alerts from backend.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR"
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    return new Date(dateString).toLocaleString("en-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const getRiskClass = (riskLevel) => {
    const value = String(riskLevel).toLowerCase();

    if (value.includes("high")) return "danger";
    if (value.includes("medium")) return "warning";
    return "safe";
  };

  const handleInvestigate = (transactionId) => {
    setSelectedTransactionId(transactionId);
    setPage("detail");
  };

  const handleFreeze = async (transactionId) => {
    setActionLoading(transactionId);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `http://localhost:8000/transactions/${transactionId}/freeze`,
        {
          method: "POST"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to freeze transaction");
      }

      setMessage(`TX-${transactionId} has been frozen.`);
      fetchAlerts();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not freeze transaction.");
    } finally {
      setActionLoading("");
    }
  };

  const handleMarkReviewed = async (alertId, transactionId) => {
    setReviewLoading(alertId);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `http://localhost:8000/alerts/${alertId}/review`,
        {
          method: "POST"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to mark alert as reviewed");
      }

      setMessage(`TX-${transactionId} alert has been marked as reviewed.`);
      fetchAlerts();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not mark alert as reviewed.");
    } finally {
      setReviewLoading("");
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Fraud Alerts"
          subtitle="Review suspicious transactions that need attention"
        />

        <p style={{ marginTop: "30px", color: "#8da2bd" }}>
          Loading alerts...
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Fraud Alerts"
        subtitle="Review suspicious transactions that need attention"
      />

      {message && <div className="alert-freeze-message">{message}</div>}

      {error && <div className="alert-error-message">{error}</div>}

      {alerts.length === 0 ? (
        <div className="empty-alert-box">
          No fraud alerts found.
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map((alert) => {
            const riskClass = getRiskClass(alert.risk_level);

            return (
              <div className="fraud-alert-card" key={alert.alert_id}>
                <div className="fraud-alert-top">
                  <div>
                    <h3>TX-{alert.transaction_id}</h3>
                    <p>{alert.alert_message}</p>
                  </div>

                  <span className={`alert-risk-badge ${riskClass}`}>
                    {alert.risk_level}
                  </span>
                </div>

                <div className="fraud-alert-grid">
                  <div>
                    <span>Customer</span>
                    <strong>{alert.customer_name}</strong>
                  </div>

                  <div>
                    <span>Merchant</span>
                    <strong>{alert.merchant_name}</strong>
                  </div>

                  <div>
                    <span>Amount</span>
                    <strong>{formatAmount(alert.amount)}</strong>
                  </div>

                  <div>
                    <span>Product</span>
                    <strong>{alert.product_category}</strong>
                  </div>

                  <div>
                    <span>Risk Score</span>
                    <strong>{alert.risk_score}/100</strong>
                  </div>

                  <div>
                    <span>Alert Status</span>
                    <strong>{alert.status}</strong>
                  </div>

                  <div>
                    <span>Transaction Status</span>
                    <strong>{alert.transaction_status}</strong>
                  </div>

                  <div>
                    <span>Date</span>
                    <strong>{formatDate(alert.transaction_date)}</strong>
                  </div>
                </div>

                <div className="alert-reason-box">
                  <span>Reason</span>
                  <p>{alert.reason || "No reason provided."}</p>
                </div>

                <div className="fraud-alert-actions">
                  <button
                    className="investigate-alert-btn"
                    onClick={() => handleInvestigate(alert.transaction_id)}
                  >
                    Investigate
                  </button>

                  <button
                    className="freeze-alert-btn"
                    onClick={() => handleFreeze(alert.transaction_id)}
                    disabled={actionLoading === alert.transaction_id}
                  >
                    {actionLoading === alert.transaction_id
                      ? "Freezing..."
                      : "Freeze"}
                  </button>

                  <button
                    className="review-alert-btn"
                    onClick={() =>
                      handleMarkReviewed(alert.alert_id, alert.transaction_id)
                    }
                    disabled={reviewLoading === alert.alert_id}
                  >
                    {reviewLoading === alert.alert_id
                      ? "Marking..."
                      : "Mark Reviewed"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}