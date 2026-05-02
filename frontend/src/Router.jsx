import { createBrowserRouter } from "react-router";
import Error404Page from "./Pages/Error404Page";
import InventoryPage from "./Pages/InventoryPage";
import CustomersPage from "./Pages/CustomersPage";
import POSPage from "./Pages/POSPage";
import SalesHistoryPage from "./Pages/SalesHistoryPage";
import CompanyDuePage from "./Pages/CompanyDuePage";
import DashboardPage from "./Pages/DashboardPage";
import LoginPage from "./Pages/LoginPage";
import ProtectedLayout from "./Components/ProtectedLayout";

const router = createBrowserRouter([
    {
        path: "/",
        element: <LoginPage />,
    },
    {
        element: <ProtectedLayout />,
        children: [
            {
                path: "dashboard",
                element: <DashboardPage />,
            },
            {
                path: "inventory",
                element: <InventoryPage />,
            },
            {
                path: "customers",
                element: <CustomersPage />,
            },
            {
                path: "pos",
                element: <POSPage />,
            },
            {
                path: "sales",
                element: <SalesHistoryPage />,
            },
            {
                path: "company-due",
                element: <CompanyDuePage />,
            },
        ],
    },
    {
        path: "*",
        element: <Error404Page />,
    },
]);

export default router;
