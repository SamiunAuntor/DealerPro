import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// create instance
const axiosInstance = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true,
});

const useAxios = () => {
    return axiosInstance;
};

export default useAxios;
