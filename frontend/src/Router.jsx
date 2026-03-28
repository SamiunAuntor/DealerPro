import { createBrowserRouter } from "react-router";
import MainLayout from "./Layouts/MainLayout";
import Error404Page from "./Pages/Error404Page";
import InventoryPage from "./Pages/InventoryPage";
import CustomersPage from "./Pages/CustomersPage";
import POSPage from "./Pages/POSPage";

const router = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout />,
        children: [
            {
                index: true,
                element: <h1>Dashboard Home</h1>,
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
                path: "company-due",
                element: <h1>Company Due Section</h1>,
            },
            {
                path: "analytics",
                element: <h1>Analytics Section</h1>,
            },
        ],
    },
    {
        path: "*",
        element: <Error404Page />,
    },
]);

export default router;
