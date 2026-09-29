import { Route, Routes } from "react-router";
import { Bounce, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import MainLayout from "./layouts/MainLayout";
import Designs from "./features/design/pages/Designs";
import CreateDesign from "./features/design/pages/CreateDesign";
import StockIn from "./features/inventory/pages/StockIn";
import QrCenter from "./features/inventory/pages/QrCenter";
import QrGrid from "./features/inventory/pages/QrGrid";
import CurrentStock from "./features/inventory/pages/CurrentStock";
import CurrentStockDetail from "./features/inventory/pages/CurrentStockDetail";
import StockHistory from "./features/inventory/pages/StockHistory";
import StockTransformation from "./features/inventory/pages/StockTransformation";
import StockOutLayout from "./features/sales/layouts/StockOutLayout";
import Overview from "./features/sales/pages/Overview";
import Parties from "./features/sales/pages/Parties";
import SlicePlaceholder from "./features/sales/pages/SlicePlaceholder";

const App = () => {
  return (
    <>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/designs" element={<Designs />} />
          <Route path="/add-designs" element={<CreateDesign />} />
          <Route path="/stock-in" element={<StockIn />} />
          <Route path="/stock-out" element={<StockOutLayout />}>
            <Route index element={<Overview />} />
            <Route
              path="orders"
              element={<SlicePlaceholder
                title="Order Forms are coming in the next slice"
                description="Party Master had to land first, because every order form is filled from it. Order Forms is the next piece of work."
              />}
            />
            <Route
              path="invoices"
              element={<SlicePlaceholder
                title="Invoices follow Order Forms"
                description="An invoice is built by scanning stock against an order form, so it depends on Order Forms being in place first."
              />}
            />
            <Route path="parties" element={<Parties />} />
          </Route>
          <Route path="/qr-center" element={<QrCenter />} />
          <Route path="/qr-center/transformation/:transformationId" element={<QrGrid />} />
          <Route path="/qr-center/:stockInTransactionId" element={<QrGrid />} />
          <Route path="/current-stock" element={<CurrentStock />} />
          <Route path="/current-stock/:colorVariantId" element={<CurrentStockDetail />} />
          <Route path="/stock-history" element={<StockHistory />} />
          <Route path="/stock-transformation" element={<StockTransformation />} />
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
