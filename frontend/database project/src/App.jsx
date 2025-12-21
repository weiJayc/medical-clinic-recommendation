import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import HospitalSearch from "./pages/HospitalSearch";
import Favorite from "./pages/Favorite";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ToastProvider } from "./contexts/ToastContext";

function App() {
  return (
    <ToastProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<HospitalSearch />} />
            <Route path="/favorite" element={<Favorite />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </ToastProvider>
  );
}

export default App;
