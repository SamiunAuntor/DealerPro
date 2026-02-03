import { createBrowserRouter, Navigate } from "react-router";
import MainLayout from "./Layouts/MainLayout";



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
                element: <h1>Inventory Section</h1>
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
        element: <h1>404 Page Not Found</h1>
    }
])

export default router;