import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { applyAppearanceMode, getAppearancePreference } from "@/lib/appearance";

const basename = import.meta.env.BASE_URL;
applyAppearanceMode(getAppearancePreference());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
      <Toaster />
    </BrowserRouter>
  </React.StrictMode>,
);
