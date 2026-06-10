import { createRoot } from "react-dom/client";
import "./styles/index.css";
import "./styles/main.css"; // legacy — keeping for visual compatibility during migration
import AppRouter from "./router";

createRoot(document.getElementById("root")!).render(<AppRouter />);
