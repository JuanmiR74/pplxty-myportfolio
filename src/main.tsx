// Forzar carga de React antes de nada
import * as React from "react";
import * as ReactDOM from "react-dom/client";

// Exponer globalmente para evitar duplicados en librerías de terceros
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;

import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);


import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
