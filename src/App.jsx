import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import TaskDashboard from "./Context/TaskDashboard.jsx";
import AuthHandler from "./AuthHandler.jsx";

function App() {
  return (
    <Router>
      <Routes>
      <Route path="/" element={<div>Home - Go to <a href="/dashboard">/dashboard</a></div>} />
        <Route path="/auth" element={<AuthHandler />} />
        <Route path="/dashboard" element={<TaskDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
