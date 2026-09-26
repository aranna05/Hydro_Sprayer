import React from "react";
import ReactDOM from "react-dom/client";
import { SplashScreen } from "@capacitor/splash-screen";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Native splash is shown by Capacitor on launch; hide it once React has mounted.
// (launchAutoHide is also on in capacitor.config.json as a fallback.)
SplashScreen.hide().catch(() => {});
