import React, { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { buildAuthHeaders } from "../utils/api";

const BUSINESS_TYPES = [
  "Groceries",
  "Fashion",
  "Books",
  "Home",
  "Beauty",
  "Electronics",
  "Jewelry",
  "Luxury",
  "Travel"
];

export default function AdminUsers() {
  const [merchants, setMerchants] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState("merchants");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [merchantForm, setMerchantForm] = useState({
    merchant_name: "",
    merchant_email: "",
    business_type: ""
  });
  const [customerForm, setCustomerForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_pnumber: "",
    customer_address: ""
  });

  const fetchAdminData = () => {
    setLoading(true);
    setError("");

    Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/merchants`, {
        headers: buildAuthHeaders()
      }).then((res) => res.json()),
      fetch(`${import.meta.env.VITE_API_URL}/customers`, {
        headers: buildAuthHeaders()
      }).then((res) => res.json())
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
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const getServerErrorMessage = (detail) => {
    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg).join(", ");
    }

    return "Request failed.";
  };

  const handleMerchantChange = (event) => {
    const { name, value } = event.target;
    setMerchantForm((prev) => ({ ...prev, [name]: value }));
    setFormError("");
    setFormMessage("");
  };

  const handleCustomerChange = (event) => {
    const { name, value } = event.target;
    setCustomerForm((prev) => ({ ...prev, [name]: value }));
    setFormError("");
    setFormMessage("");
  };

  const createMerchant = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFormMessage("");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/merchants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders()
        },
        body: JSON.stringify({
          merchant_name: merchantForm.merchant_name.trim(),
          merchant_email: merchantForm.merchant_email.trim(),
          business_type: merchantForm.business_type.trim() || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getServerErrorMessage(data.detail));
      }

      setMerchants((prev) => [...prev, data.merchant].sort((a, b) =>
        a.merchant_name.localeCompare(b.merchant_name)
      ));
      setMerchantForm({
        merchant_name: "",
        merchant_email: "",
        business_type: ""
      });
      setFormMessage(
        `Merchant created successfully. Login: ${data.merchant.merchant_email} / ${data.initial_password}`
      );
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Could not create merchant.");
    } finally {
      setSaving(false);
    }
  };

  const createCustomer = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFormMessage("");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders()
        },
        body: JSON.stringify({
          customer_name: customerForm.customer_name.trim(),
          customer_email: customerForm.customer_email.trim(),
          customer_pnumber: customerForm.customer_pnumber.trim() || null,
          customer_address: customerForm.customer_address.trim() || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getServerErrorMessage(data.detail));
      }

      setCustomers((prev) => [...prev, data.customer].sort((a, b) =>
        a.customer_name.localeCompare(b.customer_name)
      ));
      setCustomerForm({
        customer_name: "",
        customer_email: "",
        customer_pnumber: "",
        customer_address: ""
      });
      setFormMessage("Customer created successfully.");
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Could not create customer.");
    } finally {
      setSaving(false);
    }
  };

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
      {formError && <div className="admin-error-message">{formError}</div>}
      {formMessage && <div className="admin-success-message">{formMessage}</div>}

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
        <>
          <form className="admin-form-card" onSubmit={createMerchant}>
            <div className="admin-table-header">
              <div>
                <h3>Create Merchant</h3>
                <p>Add a merchant account that can submit transactions</p>
              </div>
            </div>

            <div className="admin-form-grid">
              <label>
                Merchant Name
                <input
                  name="merchant_name"
                  value={merchantForm.merchant_name}
                  onChange={handleMerchantChange}
                  required
                  maxLength="50"
                  placeholder="Example: Jeri Electronics"
                />
              </label>

              <label>
                Merchant Email
                <input
                  name="merchant_email"
                  type="email"
                  value={merchantForm.merchant_email}
                  onChange={handleMerchantChange}
                  required
                  maxLength="100"
                  placeholder="merchant@example.com"
                />
              </label>

              <label>
                Business Type
                <select
                  name="business_type"
                  value={merchantForm.business_type}
                  onChange={handleMerchantChange}
                  required
                >
                  <option value="">Select business type</option>
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create Merchant"}
              </button>
            </div>
          </form>

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
        </>
      )}

      {activeTab === "customers" && (
        <>
          <form className="admin-form-card" onSubmit={createCustomer}>
            <div className="admin-table-header">
              <div>
                <h3>Create Customer</h3>
                <p>Add a customer record for transaction submission</p>
              </div>
            </div>

            <div className="admin-form-grid">
              <label>
                Customer Name
                <input
                  name="customer_name"
                  value={customerForm.customer_name}
                  onChange={handleCustomerChange}
                  required
                  maxLength="50"
                  placeholder="Example: Andi Wijaya"
                />
              </label>

              <label>
                Customer Email
                <input
                  name="customer_email"
                  type="email"
                  value={customerForm.customer_email}
                  onChange={handleCustomerChange}
                  required
                  maxLength="100"
                  placeholder="customer@example.com"
                />
              </label>

              <label>
                Phone Number
                <input
                  name="customer_pnumber"
                  value={customerForm.customer_pnumber}
                  onChange={handleCustomerChange}
                  maxLength="20"
                  placeholder="08123456789"
                />
              </label>

              <label>
                Address
                <input
                  name="customer_address"
                  value={customerForm.customer_address}
                  onChange={handleCustomerChange}
                  placeholder="Jakarta, Indonesia"
                />
              </label>

              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create Customer"}
              </button>
            </div>
          </form>

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
        </>
      )}
    </div>
  );
}
