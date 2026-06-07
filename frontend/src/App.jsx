import React, { useEffect, useState } from "react";

import Layout from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Monitoring from "./pages/Monitoring";
import Alerts from "./pages/Alerts";
import TransactionDetail from "./pages/TransactionDetail";
import SubmitTransaction from "./pages/SubmitTransaction";
import Reports from "./pages/Reports";
import AdminUsers from "./pages/AdminUsers";
import Profile from "./pages/Profile";

const PAGE_ACCESS = {
  admin: ["dashboard", "monitoring", "alerts", "detail", "risk", "reports", "admin", "profile"],
  merchant: ["dashboard", "monitoring", "detail", "risk", "profile"]
};

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState(1);

  useEffect(() => {
    const savedUser =
      localStorage.getItem("fraudshield_user") ||
      sessionStorage.getItem("fraudshield_user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setLoggedIn(true);
    }
  }, []);

  const handleLogin = (user, rememberUser) => {
    const storage = rememberUser ? localStorage : sessionStorage;
    storage.setItem("fraudshield_user", JSON.stringify(user));
    setCurrentUser(user);
    setLoggedIn(true);
    setPage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("fraudshield_user");
    sessionStorage.removeItem("fraudshield_user");
    setCurrentUser(null);
    setLoggedIn(false);
    setPage("dashboard");
  };

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const accountType = currentUser?.account_type || "merchant";
  const allowedPages = PAGE_ACCESS[accountType] || PAGE_ACCESS.merchant;

  const handlePageChange = (nextPage) => {
    if (allowedPages.includes(nextPage)) {
      setPage(nextPage);
      return;
    }

    setPage("dashboard");
  };

  const renderPage = () => {
    if (!allowedPages.includes(page)) {
      return <Dashboard />;
    }

    switch (page) {
      case "dashboard":
        return <Dashboard currentUser={currentUser} />;

      case "monitoring":
        return (
          <Monitoring
            setPage={setPage}
            setSelectedTransactionId={setSelectedTransactionId}
            currentUser={currentUser}
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
        return (
          <TransactionDetail
            transactionId={selectedTransactionId}
            currentUser={currentUser}
          />
        );

      case "risk":
        return <SubmitTransaction />;

      case "reports":
        return <Reports currentUser={currentUser} />;

      case "admin":
        return <AdminUsers />;

      case "profile":
        return <Profile currentUser={currentUser} />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout
      page={page}
      setPage={handlePageChange}
      currentUser={currentUser}
      onLogout={handleLogout}
      allowedPages={allowedPages}
    >
      {renderPage()}
    </Layout>
  );
}
