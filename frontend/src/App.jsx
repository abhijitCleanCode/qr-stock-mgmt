import { Route, Routes } from "react-router";

import CreateDesign from "./features/design/pages/CreateDesign";

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/design/register" element={<CreateDesign />} />
      </Routes>
    </>
  );
};

export default App;
