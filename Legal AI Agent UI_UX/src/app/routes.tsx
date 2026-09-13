import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./components/Home";
import { ScanDocument } from "./components/ScanDocument";
import { LegalAdvice } from "./components/LegalAdvice";
import { DocumentAnalysis } from "./components/DocumentAnalysis";
import { NotFound } from "./components/NotFound";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { Profile } from "./components/Profile";
import { CasesList } from "./components/CasesList";
import { CaseDetail } from "./components/CaseDetail";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "scan", Component: ScanDocument },
      { path: "advice", Component: LegalAdvice },
      { path: "analysis/:id", Component: DocumentAnalysis },
      { path: "login", Component: Login },
      { path: "signup", Component: Signup },
      { path: "profile", Component: Profile },
      { path: "cases", Component: CasesList },
      { path: "cases/:id", Component: CaseDetail },
      { path: "*", Component: NotFound },
    ],
  },
]);
