import { Route, Routes } from "react-router";
import { Bounce, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import MainLayout from "./layouts/MainLayout";
import Designs from "./features/design/pages/Designs";
import CreateDesign from "./features/design/pages/CreateDesign";
import StockIn from "./features/inventory/pages/StockIn";
import StockOut from "./features/inventory/pages/StockOut";
import QrCenter from "./features/inventory/pages/QrCenter";
import CurrentStock from "./features/inventory/pages/CurrentStock";
import CurrentStockDetail from "./features/inventory/pages/CurrentStockDetail";
import StockHistory from "./features/inventory/pages/StockHistory";

const App = () => {
  return (
    <>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/designs" element={<Designs />} />
          <Route path="/add-designs" element={<CreateDesign />} />
          <Route path="/stock-in" element={<StockIn />} />
          <Route path="/stock-out" element={<StockOut />} />
          <Route path="/qr-center" element={<QrCenter />} />
          <Route path="/current-stock" element={<CurrentStock />} />
          <Route path="/current-stock/:colorVariantId" element={<CurrentStockDetail />} />
          <Route path="/stock-history" element={<StockHistory />} />
        </Route>
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        transition={Bounce}
      />
    </>
  );
};

export default App;
