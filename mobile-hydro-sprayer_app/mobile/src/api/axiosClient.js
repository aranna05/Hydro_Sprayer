import axios from "axios";

// Point this at your deployed Express server (e.g. https://your-server.onrender.com/api)
// export const API_BASE_URL = "http://localhost:8000/api";
export const API_BASE_URL = "https://iot-based-automated-watering-sytem-server.onrender.com/api";

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export default axiosClient;
