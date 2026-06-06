import React, { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";

export default function AdminUsers() {
  const [merchants, setMerchants] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState("merchants");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("http://localhost:8000/merchants").then((res) => res.json()),
      fetch("http://localhost:8000/customers").then((res) => res.json())
    ])
      .then(([merchantData, customerData]) => {
        setMerchants(merchantData.merchants || []);
        setCustomers(customerData.customers || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load admin data from backend.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Admin & User Management"
          subtitle="Loading merchants and customers..."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Admin & User Management"
        subtitle="Manage system merchants and customer records"
      />

      {error && <div className="admin-error-message">{error}</div>}

      <div className="admin-summary-grid">
        <div className="admin-summary-card">
          <span>Total Merchants</span>
          <strong>{merchants.length}</strong>
        </div>

        <div className="admin-summary-card">
          <span>Total Customers</span>
          <strong>{customers.length}</strong>
        </div>

        <div className="admin-summary-card">
          <span>Admin Role</span>
          <strong>Fraud Analyst</strong>
        </div>

        <div className="admin-summary-card">
          <span>System Access</span>
          <strong>Active</strong>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={activeTab === "merchants" ? "active" : ""}
          onClick={() => setActiveTab("merchants")}
        >
          Merchants
        </button>

        <button
          className={activeTab === "customers" ? "active" : ""}
          onClick={() => setActiveTab("customers")}
        >
          Customers
        </button>
      </div>

      {activeTab === "merchants" && (
        <div className="admin-table-card">
          <div className="admin-table-header">
            <div>
              <h3>Merchant Accounts</h3>
              <p>Registered merchants connected to the fraud prevention system</p>
            </div>

            <span>{merchants.length} records</span>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Merchant ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Business Type</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {merchants.map((merchant) => (
                  <tr key={merchant.merchant_id}>
                    <td>M-{merchant.merchant_id}</td>
                    <td>{merchant.merchant_name}</td>
                    <td>{merchant.merchant_email}</td>
                    <td>{merchant.business_type || "N/A"}</td>
                    <td>
                      <span className="admin-status active">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "customers" && (
        <div className="admin-table-card">
          <div className="admin-table-header">
            <div>
              <h3>Customer Records</h3>
              <p>Customers involved in transaction monitoring and fraud checks</p>
            </div>

            <span>{customers.length} records</span>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.customer_id}>
                    <td>C-{customer.customer_id}</td>
                    <td>{customer.customer_name}</td>
                    <td>{customer.customer_email}</td>
                    <td>{customer.customer_pnumber || "N/A"}</td>
                    <td>{customer.customer_address || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}