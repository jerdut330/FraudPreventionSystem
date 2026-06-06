import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children, page, setPage }) {
  return (
    <div className="app-layout">
      <Sidebar page={page} setPage={setPage} />

      <div className="main-area">
        <Header />

        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}