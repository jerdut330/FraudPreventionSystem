import React, { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";

export default function Monitoring({ setPage, setSelectedTransactionId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchTransactions = () => {
    setLoading(true);
    setError("");

    fetch(`${import.meta.env.VITE_API_URL}/transactions`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch transactions");
        }

        return res.json();
      })
      .then((data) => {
        setTransactions(data.transactions || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load transactions from backend.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTransactions();
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
    if (value.includes("low")) return "safe";

    return "neutral";
  };

  const getStatusClass = (status) => {
    const value = String(status).toLowerCase();

    if (value.includes("approved")) {
      return "safe";
    }

    if (
      value.includes("pending") ||
      value.includes("review") ||
      value.includes("manual")
    ) {
      return "warning";
    }

    if (
      value.includes("rejected") ||
      value.includes("blocked") ||
      value.includes("frozen") ||
      value.includes("freeze")
    ) {
      return "danger";
    }

    return "neutral";
  };

  const handleViewDetails = (transactionId) => {
    setSelectedTransactionId(transactionId);
    setPage("detail");
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const searchValue = searchTerm.toLowerCase();

    return (
      `tx-${transaction.transaction_id}`.includes(searchValue) ||
      String(transaction.transaction_id).includes(searchValue) ||
      String(transaction.customer_name).toLowerCase().includes(searchValue) ||
      String(transaction.customer_email).toLowerCase().includes(searchValue) ||
      String(transaction.merchant_name).toLowerCase().includes(searchValue) ||
      String(transaction.product_category).toLowerCase().includes(searchValue) ||
      String(transaction.transaction_status).toLowerCase().includes(searchValue) ||
      String(transaction.risk_level).toLowerCase().includes(searchValue)
    );
  });

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Transaction Monitoring"
          subtitle="Monitor submitted transactions and fraud risk results"
        />

        <p style={{ marginTop: "30px", color: "#8da2bd" }}>
          Loading transactions...
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Transaction Monitoring"
        subtitle="Monitor submitted transactions and fraud risk results"
      />

      {error && (
        <div className="monitoring-error-message">
          {error}
        </div>
      )}

      <div className="monitoring-toolbar">
        <div>
          <h3>Transactions</h3>
          <p>
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </p>
        </div>

        <input
          type="text"
          className="monitoring-search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search TX ID, customer, merchant, status..."
        />
      </div>

      <div className="monitoring-table-card">
        {filteredTransactions.length === 0 ? (
          <div className="empty-monitoring-box">
            No transactions found.
          </div>
        ) : (
          <table className="monitoring-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Customer</th>
                <th>Merchant</th>
                <th>Amount</th>
                <th>Product</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Decision</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredTransactions.map((transaction) => {
                const riskClass = getRiskClass(transaction.risk_level);
                const statusClass = getStatusClass(transaction.transaction_status);

                return (
                  <tr
                    key={transaction.transaction_id}
                    onClick={() => handleViewDetails(transaction.transaction_id)}
                    className="clickable-row"
                  >
                    <td>TX-{transaction.transaction_id}</td>

                    <td>
                      <div className="table-main-text">
                        {transaction.customer_name}
                      </div>
                      <span>{transaction.customer_email}</span>
                    </td>

                    <td>{transaction.merchant_name}</td>

                    <td>{formatAmount(transaction.amount)}</td>

                    <td>{transaction.product_category}</td>

                    <td>
                      <span className={`risk-badge ${riskClass}`}>
                        {transaction.risk_level}
                      </span>
                    </td>

                    <td>
                      <span className={`status-badge ${statusClass}`}>
                        {transaction.transaction_status}
                      </span>
                    </td>

                    <td>{transaction.decision}</td>

                    <td>{formatDate(transaction.transaction_date)}</td>

                    <td>
                      <button
                        className="view-detail-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleViewDetails(transaction.transaction_id);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}