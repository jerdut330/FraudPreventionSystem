import React, { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";

const PRODUCT_CATEGORIES = [
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

export default function SubmitTransaction() {
  const [formData, setFormData] = useState({
    merchant_id: "",
    customer_id: "",
    amount: "",
    product_category: "",
    billing_address: "",
    shipping_address: "",
    ip_location: "",
    new_customer: false
  });

  const [merchants, setMerchants] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  const [errors, setErrors] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    const fetchOptions = async () => {
      setOptionsLoading(true);
      setOptionsError("");

      try {
        const merchantResponse = await fetch(`${import.meta.env.VITE_API_URL}/merchants`);
        const customerResponse = await fetch(`${import.meta.env.VITE_API_URL}/customers`);

        const merchantData = await merchantResponse.json();
        const customerData = await customerResponse.json();

        if (!merchantResponse.ok) {
          throw new Error(merchantData.detail || "Failed to load merchants.");
        }

        if (!customerResponse.ok) {
          throw new Error(customerData.detail || "Failed to load customers.");
        }

        const merchantList = merchantData.merchants || [];
        const customerList = customerData.customers || [];

        setMerchants(merchantList);
        setCustomers(customerList);

        setFormData((prev) => ({
          ...prev,
          merchant_id:
            merchantList.length > 0 ? String(merchantList[0].merchant_id) : "",
          customer_id:
            customerList.length > 0 ? String(customerList[0].customer_id) : ""
        }));
      } catch (err) {
        console.error(err);
        setOptionsError(err.message || "Could not load merchant/customer data.");
      } finally {
        setOptionsLoading(false);
      }
    };

    fetchOptions();
  }, []);

  const getServerErrorMessage = (detail) => {
    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg).join(", ");
    }

    return "Failed to submit transaction.";
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    if (name === "amount") {
      if (value.includes("-")) {
        return;
      }

      if (value !== "" && Number(value) < 0) {
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: ""
    }));

    setServerError("");
  };

  const validateForm = () => {
    const newErrors = {};

    const merchantId = Number(formData.merchant_id);
    const customerId = Number(formData.customer_id);
    const amount = Number(formData.amount);

    if (!formData.merchant_id || !Number.isFinite(merchantId) || merchantId <= 0) {
      newErrors.merchant_id = "Please select a merchant.";
    }

    if (!formData.customer_id || !Number.isFinite(customerId) || customerId <= 0) {
      newErrors.customer_id = "Please select a customer.";
    }

    if (!formData.amount || !Number.isFinite(amount) || amount <= 0) {
      newErrors.amount = "Amount must be greater than 0.";
    }   

    if (!formData.product_category.trim()) {
      newErrors.product_category = "Product category is required.";
    }

    if (!formData.billing_address.trim()) {
      newErrors.billing_address = "Billing address is required.";
    }

    if (!formData.shipping_address.trim()) {
      newErrors.shipping_address = "Shipping address is required.";
    }

    if (!formData.ip_location.trim()) {
      newErrors.ip_location = "IP location is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const getRiskClass = (riskLevel) => {
    const value = String(riskLevel).toLowerCase();

    if (value.includes("high")) return "danger";
    if (value.includes("medium")) return "warning";
    return "safe";
  };

  const getBreakdownClass = (level) => {
    const value = String(level).toLowerCase();

    if (value.includes("high")) return "danger";
    if (value.includes("moderate")) return "warning";
    return "safe";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setResult(null);
    setServerError("");

    const isValid = validateForm();

    if (!isValid) {
      return;
    }

    const payload = {
      merchant_id: Number(formData.merchant_id),
      customer_id: Number(formData.customer_id),
      amount: Number(formData.amount),
      product_category: formData.product_category.trim(),
      billing_address: formData.billing_address.trim(),
      shipping_address: formData.shipping_address.trim(),
      ip_location: formData.ip_location.trim(),
      new_customer: formData.new_customer
    };

    setSubmitLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getServerErrorMessage(data.detail));
      }

      setResult(data);

      setFormData({
        merchant_id: merchants.length > 0 ? String(merchants[0].merchant_id) : "",
        customer_id: customers.length > 0 ? String(customers[0].customer_id) : "",
        amount: "",
        product_category: "",
        billing_address: "",
        shipping_address: "",
        ip_location: "",
        new_customer: false
      });
    } catch (err) {
      console.error(err);
      setServerError(err.message || "Could not submit transaction.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Submit Transaction"
        subtitle="Submit a new transaction for fraud risk analysis"
      />

      <div className="submit-transaction-layout">
        <form className="submit-transaction-card" onSubmit={handleSubmit}>
          <h3>Transaction Form</h3>

          {optionsLoading && (
            <div className="submit-info-message">
              Loading merchants and customers...
            </div>
          )}

          {optionsError && (
            <div className="submit-error-message">
              {optionsError}
            </div>
          )}

          <div className="submit-form-grid">
            <div className="form-field">
              <label>Merchant</label>
              <select
                name="merchant_id"
                value={formData.merchant_id}
                onChange={handleChange}
                disabled={optionsLoading || merchants.length === 0}
              >
                {merchants.length === 0 ? (
                  <option value="">No merchants available</option>
                ) : (
                  merchants.map((merchant) => (
                    <option
                      key={merchant.merchant_id}
                      value={merchant.merchant_id}
                    >
                      {merchant.merchant_name} — {merchant.business_type}
                    </option>
                  ))
                )}
              </select>
              {errors.merchant_id && (
                <span className="field-error">{errors.merchant_id}</span>
              )}
            </div>

            <div className="form-field">
              <label>Customer</label>
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
                disabled={optionsLoading || customers.length === 0}
              >
                {customers.length === 0 ? (
                  <option value="">No customers available</option>
                ) : (
                  customers.map((customer) => (
                    <option
                      key={customer.customer_id}
                      value={customer.customer_id}
                    >
                      {customer.customer_name} — {customer.customer_email}
                    </option>
                  ))
                )}
              </select>
              {errors.customer_id && (
                <span className="field-error">{errors.customer_id}</span>
              )}
            </div>

            <div className="form-field">
              <label>Amount</label>
              <input
                type="number"
                name="amount"
                min="0.01"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                placeholder="Example: 2500000"
              />
              {errors.amount && (
                <span className="field-error">{errors.amount}</span>
              )}
            </div>

            <div className="form-field">
              <label>Product Category</label>
              <select
                name="product_category"
                value={formData.product_category}
                onChange={handleChange}
              >
                <option value="">Select product category</option>
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.product_category && (
                <span className="field-error">{errors.product_category}</span>
              )}
            </div>

            <div className="form-field">
              <label>Billing Address</label>
              <textarea
                name="billing_address"
                value={formData.billing_address}
                onChange={handleChange}
                placeholder="Example: Jakarta, Indonesia"
              />
              {errors.billing_address && (
                <span className="field-error">{errors.billing_address}</span>
              )}
            </div>

            <div className="form-field">
              <label>Shipping Address</label>
              <textarea
                name="shipping_address"
                value={formData.shipping_address}
                onChange={handleChange}
                placeholder="Example: Bandung, Indonesia"
              />
              {errors.shipping_address && (
                <span className="field-error">{errors.shipping_address}</span>
              )}
            </div>

            <div className="form-field">
              <label>IP Location</label>
              <input
                type="text"
                name="ip_location"
                value={formData.ip_location}
                onChange={handleChange}
                placeholder="Example: Jakarta, Indonesia"
              />
              {errors.ip_location && (
                <span className="field-error">{errors.ip_location}</span>
              )}
            </div>

            <div className="form-field checkbox-field">
              <label>
                <input
                  type="checkbox"
                  name="new_customer"
                  checked={formData.new_customer}
                  onChange={handleChange}
                />
                New customer account
              </label>
            </div>
          </div>

          {serverError && (
            <div className="submit-error-message">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            className="submit-transaction-btn"
            disabled={submitLoading || optionsLoading}
          >
            {submitLoading ? "Analyzing..." : "Submit Transaction"}
          </button>
        </form>

        <div className="submit-result-card">
          <h3>Analysis Result</h3>

          {!result ? (
            <p className="empty-result-text">
              Submit a transaction to see the fraud analysis result here.
            </p>
          ) : (
            <div className="result-content">
              <div className="result-row">
                <span>Transaction ID</span>
                <strong>TX-{result.transaction_id}</strong>
              </div>

              <div className="result-row">
                <span>Status</span>
                <strong>{result.transaction_status}</strong>
              </div>

              <div className="result-action-box">
                <span>Recommended Action</span>
                <strong>{result.recommended_action}</strong>
              </div>

              <div className="result-row">
                <span>Risk Score</span>
                <strong>{result.risk_score}/100</strong>
              </div>

              <div className="result-row">
                <span>Risk Level</span>
                <strong className={`result-risk ${getRiskClass(result.risk_level)}`}>
                  {result.risk_level}
                </strong>
              </div>

              {Array.isArray(result.risk_breakdown) && (
                <div className="risk-breakdown-panel">
                  <span>Risk Breakdown</span>

                  <div className="risk-breakdown-list">
                    {result.risk_breakdown.map((item) => (
                      <div className="risk-breakdown-item" key={item.label}>
                        <p>{item.label}</p>
                        <strong className={getBreakdownClass(item.level)}>
                          {item.level}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="result-reasons">
                <span>Reasons</span>

                {result.reasons.length === 0 ? (
                  <p>No suspicious indicators detected.</p>
                ) : (
                  <ul>
                    {result.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
