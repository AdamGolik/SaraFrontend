import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://0.0.0.0:8080";

// Helper function to format date
const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toISOString().split(".")[0]; // Removes milliseconds and timezone
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  console.log("Request interceptor - token exists:", !!token);
  console.log("Request URL:", config.url);
  console.log("Request method:", config.method);
  console.log("Request headers before:", config.headers);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log("Request headers after:", config.headers);
  } else {
    // If no token is found and the request is not for auth endpoints
    if (!config.url?.includes("/login") && !config.url?.includes("/register")) {
      console.error("No authentication token found for request:", config.url);
      throw new Error("No authentication token found");
    }
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.config?.headers,
      error: error.message,
      stack: error.stack,
    });

    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// Auth endpoints
export const auth = {
  login: async (email: string, password: string) => {
    const response = await api.post("/login", { email, password });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }
    return response.data;
  },
  register: async (
    email: string,
    password: string,
    name: string,
    lastname: string,
  ) => {
    const response = await api.post("/register", {
      email,
      password,
      name,
      lastname,
    });
    return response.data;
  },
};

// Client endpoints
export const clients = {
  getAll: async (page = 1, perPage = 6, search?: string) => {
    try {
      // Check if we're on mobile device
      const isMobile = window.innerWidth <= 768;
      const actualPerPage = isMobile ? 3 : perPage;

      console.log("Fetching clients list with params:", {
        page,
        perPage: actualPerPage,
        search,
      });
      const params = { page, per_page: actualPerPage, search };
      const response = await api.get("/clients/", { params });

      // Format dates in the response
      if (response.data.clients) {
        response.data.clients = response.data.clients.map((client: any) => ({
          ...client,
          created_at: client.created_at ? formatDate(client.created_at) : null,
          updated_at: client.updated_at ? formatDate(client.updated_at) : null,
        }));
      }

      console.log("Clients list response:", response.data);
      if (response.data.clients && response.data.clients.length > 0) {
        console.log(
          "Available client UUIDs:",
          response.data.clients.map((client: any) => client.uuid),
        );
      }
      return response.data;
    } catch (error: any) {
      console.error("Error fetching clients list:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        error: error,
        stack: error.stack,
      });
      throw error;
    }
  },
  getById: async (clientId: string) => {
    try {
      console.log("Fetching client with ID:", clientId);
      const response = await api.get(`/clients/${clientId}`);

      // Format dates in the response
      if (response.data) {
        response.data.created_at = response.data.created_at
          ? formatDate(response.data.created_at)
          : null;
        response.data.updated_at = response.data.updated_at
          ? formatDate(response.data.updated_at)
          : null;
      }

      console.log("Client fetch response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching client:", {
        clientId,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
      });
      throw error;
    }
  },
  create: async (clientData: any) => {
    try {
      const response = await api.post("/clients/add", clientData);
      return response.data;
    } catch (error: any) {
      console.error("Create client error:", error.response?.data);
      throw error;
    }
  },
  update: async (clientId: string, clientData: any) => {
    try {
      const response = await api.put(`/clients/${clientId}`, clientData);
      return response.data;
    } catch (error: any) {
      console.error("Update client error:", error.response?.data);
      throw error;
    }
  },
  delete: async (clientId: string) => {
    await api.delete(`/clients/${clientId}`);
  },
  getByDateRange: async (
    from: string,
    to: string,
    page: number = 1,
    perPage: number = 6,
  ) => {
    try {
      const response = await api.get(
        `/clients/?from=${formatDate(from)}&to=${formatDate(to)}&page=${page}&per_page=${perPage}`,
      );
      // Format dates in the response
      if (response.data.clients) {
        response.data.clients = response.data.clients.map((client: any) => ({
          ...client,
          created_at: client.created_at ? formatDate(client.created_at) : null,
          updated_at: client.updated_at ? formatDate(client.updated_at) : null,
        }));
      }
      return response.data;
    } catch (error) {
      console.error("Error fetching clients by date range:", error);
      throw error;
    }
  },
};

// User endpoints
export const user = {
  getSettings: async () => {
    const response = await api.get("/user/settings");
    return response.data;
  },
  updateProfile: async (userData: any) => {
    const response = await api.put("/user/update", userData);
    return response.data;
  },
  deleteAccount: async () => {
    await api.delete("/user/delete");
  },
};

export default api;
