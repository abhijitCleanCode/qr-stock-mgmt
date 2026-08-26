import { Route, Routes } from "react-router";

import CreateDesign from "./features/design/pages/CreateDesign";
import MainLayout from "./layouts/MainLayout";

const App = () => {
  return (
    <>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/design" element={<CreateDesign />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;
