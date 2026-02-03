import { createBrowserRouter, Navigate } from "react-router";



const router = createBrowserRouter([
    {
        path: "/",
        element: <h1>Home Page</h1>

    },

    {
        path: "*",
        element: <h1>404 Page Not Found</h1>
    }
])

export default router;