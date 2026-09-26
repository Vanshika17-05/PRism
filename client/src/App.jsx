import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import Overview from "@/pages/Overview";

export default function App() { return <Routes><Route element={<AppShell />}><Route index element={<Overview />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Routes>; }
