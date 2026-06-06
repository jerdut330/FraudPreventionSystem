import React, { useState } from "react";

import Layout from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Monitoring from "./pages/Monitoring";
import Alerts from "./pages/Alerts";
import TransactionDetail from "./pages/TransactionDetail";
import SubmitTransaction from "./pages/SubmitTransaction";
import Reports from "./pages/Reports";
import AdminUsers from "./pages/AdminUsers";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [loggedIn, setLoggedIn] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState(1);

  if (!loggedIn) {
    return <Login setLoggedIn={setLoggedIn} />;
  }

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <Dashboard />;

      case "monitoring":
        return (
          <Monitoring
            setPage={setPage}
            setSelectedTransactionId={setSelectedTransactionId}
          />
        );

      case "alerts":
        return (
          <Alerts
            setPage={setPage}
            setSelectedTransactionId={setSelectedTransactionId}
          />
        );

      case "detail":
        return <TransactionDetail transactionId={selectedTransactionId} />;

      case "risk":
        return <SubmitTransaction />;

      case "reports":
        return <Reports />;

      case "admin":
        return <AdminUsers />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout page={page} setPage={setPage}>
      {renderPage()}
    </Layout>
  );
}