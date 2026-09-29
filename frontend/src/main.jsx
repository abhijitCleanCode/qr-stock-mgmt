import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Provider } from "react-redux";
import App from "./App.jsx";
import "./index.css";

import { store } from "./app/store";
import { ModalProvider } from "./components/shared/ModalProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/react-query/getQueryClient";
import { RoleProvider } from "./features/sales/context/RoleContext.jsx";

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ModalProvider>
          <RoleProvider>
            <App />
          </RoleProvider>
        </ModalProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </Provider>,
);
