import { BrowserRouter, Route, Routes } from "react-router";
import Auth from "./pages/Auth";
import HomePage from "./pages/Home";

export function App() {
  return (
    // <div>
    //   frontend
    // </div>
    <BrowserRouter>
      <Routes>
         <Route path="/" element={<HomePage/>} />
         <Route path="/auth" element={<Auth/>} />
         
      </Routes>
    </BrowserRouter>
  );
}

export default App;
