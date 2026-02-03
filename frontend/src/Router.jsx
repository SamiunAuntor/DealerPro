import { createBrowserRouter, Navigate } from "react-router";
import MainLayout from "./Layouts/MainLayout";
import Error404Page from "./Pages/Error404Page";
import InventoryPage from "./Pages/InventoryPage";



const router = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout></MainLayout>,
        children: [
            {
                index: true,
                element: <h1>Dashboard Home</h1>
            },
            {
                path: "inventory",
                element: <InventoryPage></InventoryPage>
            },
            {
                path: "customers",
                element: <h1>Customers Section</h1>
            },
            {
                path: "company-due",
                element: <h1>Company Due Section</h1>
            },
            {
                path: "analytics",
                element: <h1>Analytics Section</h1>
            }
        ]
    },

    {
        path: "*",
        element: <Error404Page></Error404Page>
    }
])

export default router;