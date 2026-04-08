import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./components/Home";
import { ScanDocument } from "./components/ScanDocument";
import { LegalAdvice } from "./components/LegalAdvice";
import { DocumentAnalysis } from "./components/DocumentAnalysis";
import { NotFound } from "./components/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "scan", Component: ScanDocument },
      { path: "advice", Component: LegalAdvice },
      { path: "analysis/:id", Component: DocumentAnalysis },
      { path: "*", Component: NotFound },
    ],
  },
]);
