import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({
  children,
  page,
  setPage,
  currentUser,
  onLogout,
  allowedPages
}) {
  return (
    <div className="app-layout">
      <Sidebar page={page} setPage={setPage} allowedPages={allowedPages} />

      <div className="main-area">
        <Header currentUser={currentUser} onLogout={onLogout} />

        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}
