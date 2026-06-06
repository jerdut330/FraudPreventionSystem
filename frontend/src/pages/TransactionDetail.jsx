import React, { useCallback, useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";

export default function TransactionDetail({ transactionId }) {
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [lastAction, setLastAction] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [error, setError] = useState("");

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

  const fetchTransactionDetail = useCallback(
    (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      fetch(`http://localhost:8000/transactions/${transactionId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch transaction detail");
          }

          return res.json();
        })
        .then((data) => {
          setTransaction(data.transaction);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError("Could not load transaction detail from backend.");
          setLoading(false);
        });
    },
    [transactionId]
  );

  useEffect(() => {
    fetchTransactionDetail();
  }, [fetchTransactionDetail]);

  const handleTransactionAction = async (action) => {
    if (!transaction) return;

    setActionLoading(action);
    setLastAction(action);
    setActionMessage("");
    setError("");

    try {
      const response = await fetch(
        `http://localhost:8000/transactions/${transaction.transaction_id}/${action}`,
        {
          method: "POST"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Action failed");
      }

      setActionMessage(data.message);
      fetchTransactionDetail(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not update transaction.");
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Transaction Detail"
          subtitle="Detailed transaction investigation"
        />
        <p style={{ marginTop: "30px", color: "#8da2bd" }}>
          Loading transaction detail...
        </p>
      </div>
    );
  }

  if (error && !transaction) {
    return (
      <div>
        <PageHeader
          title="Transaction Detail"
          subtitle="Detailed transaction investigation"
        />
        <p style={{ marginTop: "30px", color: "#ff7b7b" }}>
          {error}
        </p>
      </div>
    );
  }

  const riskClass = getRiskClass(transaction.risk_level);

  return (
    <div>
      <PageHeader
        title={`Transaction TX-${transaction.transaction_id}`}
        subtitle="Detailed fraud investigation and transaction analysis"
      />

      <div className="detail-summary-grid">
        <div className="detail-stat-card">
          <span>Amount</span>
          <strong>{formatAmount(transaction.amount)}</strong>
        </div>

        <div className="detail-stat-card">
          <span>Risk Score</span>
          <strong>{transaction.risk_score}/100</strong>
        </div>

        <div className="detail-stat-card">
          <span>Risk Level</span>
          <strong className={`detail-risk ${riskClass}`}>
            {transaction.risk_level}
          </strong>
        </div>

        <div className="detail-stat-card">
          <span>Decision</span>
          <strong>{transaction.decision}</strong>
        </div>
      </div>

      <div className="transaction-action-panel">
        <div>
          <h3>Transaction Decision</h3>
          <p>
            Approve, reject, or freeze this transaction. The action will update
            the database and create an audit log.
          </p>
        </div>

        <div className="transaction-action-buttons">
          <button
            className="approve-action-btn"
            onClick={() => handleTransactionAction("approve")}
            disabled={actionLoading !== ""}
          >
            {actionLoading === "approve" ? "Approving..." : "Approve"}
          </button>

          <button
            className="reject-action-btn"
            onClick={() => handleTransactionAction("reject")}
            disabled={actionLoading !== ""}
          >
            {actionLoading === "reject" ? "Rejecting..." : "Reject"}
          </button>

          <button
            className="freeze-action-btn"
            onClick={() => handleTransactionAction("freeze")}
            disabled={actionLoading !== ""}
          >
            {actionLoading === "freeze" ? "Freezing..." : "Freeze"}
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`action-feedback-message action-${lastAction}`}>
          {actionMessage}
        </div>
      )}

      {error && (
        <div className="action-error-message">
          {error}
        </div>
      )}

      <div className="transaction-detail-layout">
        <div className="detail-card">
          <h3>Transaction Information</h3>

          <div className="detail-row">
            <span>Transaction ID</span>
            <strong>TX-{transaction.transaction_id}</strong>
          </div>

          <div className="detail-row">
            <span>Product Category</span>
            <strong>{transaction.product_category}</strong>
          </div>

          <div className="detail-row">
            <span>Status</span>
            <strong>{transaction.transaction_status}</strong>
          </div>

          <div className="detail-row">
            <span>IP Location</span>
            <strong>{transaction.ip_location}</strong>
          </div>

          <div className="detail-row">
            <span>Date</span>
            <strong>{formatDate(transaction.transaction_date)}</strong>
          </div>
        </div>

        <div className="detail-card">
          <h3>Customer Information</h3>

          <div className="detail-row">
            <span>Name</span>
            <strong>{transaction.customer_name}</strong>
          </div>

          <div className="detail-row">
            <span>Email</span>
            <strong>{transaction.customer_email}</strong>
          </div>

          <div className="detail-row">
            <span>Phone</span>
            <strong>{transaction.customer_pnumber}</strong>
          </div>

          <div className="detail-row">
            <span>Address</span>
            <strong>{transaction.customer_address}</strong>
          </div>
        </div>

        <div className="detail-card">
          <h3>Merchant Information</h3>

          <div className="detail-row">
            <span>Merchant</span>
            <strong>{transaction.merchant_name}</strong>
          </div>

          <div className="detail-row">
            <span>Email</span>
            <strong>{transaction.merchant_email}</strong>
          </div>

          <div className="detail-row">
            <span>Business Type</span>
            <strong>{transaction.business_type}</strong>
          </div>
        </div>

        <div className="detail-card">
          <h3>Fraud Analysis</h3>

          <div className="detail-row">
            <span>Risk Score</span>
            <strong>{transaction.risk_score}/100</strong>
          </div>

          <div className="detail-row">
            <span>Risk Level</span>
            <strong className={`detail-risk ${riskClass}`}>
              {transaction.risk_level}
            </strong>
          </div>

          <div className="detail-row">
            <span>Decision</span>
            <strong>{transaction.decision}</strong>
          </div>

          <div className="reason-panel">
            <span>Reason</span>
            <p>{transaction.reason}</p>
          </div>
        </div>

        <div className="detail-card wide-card">
          <h3>Address Verification</h3>

          <div className="address-grid">
            <div>
              <span>Billing Address</span>
              <strong>{transaction.billing_address}</strong>
            </div>

            <div>
              <span>Shipping Address</span>
              <strong>{transaction.shipping_address}</strong>
            </div>
          </div>

          {transaction.billing_address !== transaction.shipping_address && (
            <div className="mismatch-warning">
              Billing and shipping addresses are different. This is one of the
              suspicious indicators.
            </div>
          )}
        </div>

        <div className="detail-card">
          <h3>Delivery Information</h3>

          <div className="detail-row">
            <span>Courier</span>
            <strong>{transaction.courier_name || "Not assigned"}</strong>
          </div>

          <div className="detail-row">
            <span>Tracking Number</span>
            <strong>{transaction.tracking_number || "N/A"}</strong>
          </div>

          <div className="detail-row">
            <span>Delivery Status</span>
            <strong>{transaction.delivery_status || "Pending"}</strong>
          </div>
        </div>

        <div className="detail-card">
          <h3>Audit Log</h3>

          {transaction.audit_logs.length === 0 ? (
            <p className="empty-text">No audit logs available.</p>
          ) : (
            <div className="audit-list">
              {transaction.audit_logs.map((log) => (
                <div className="audit-item" key={log.audit_id}>
                  <strong>{log.action}</strong>
                  <span>
                    {log.performed_by} • {formatDate(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}