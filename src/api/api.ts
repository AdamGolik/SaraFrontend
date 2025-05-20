// api.ts

import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

// --- Typy danych (models) ---

export interface UserRegister {
  name: string;
  lastname: string;
  email: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserModel {
  uuid: string;
  name: string;
  lastname: string;
  email: string;
  // Hasło nie jest zwracane z backendu po logowaniu
}

export interface Client {
  uuid: string;
  name: string;
  lastname: string;
  telephone: string;
  title: string;
  description: string;
  time_from: string; // ISO datetime string
  time_to: string; // ISO datetime string
  datetime: string; // ISO datetime string
  added_description?: unknown; // JSON object or null
  user_uuid: string;
}

export interface ClientCreate {
  name: string;
  lastname: string;
  telephone: string;
  title: string;
  description: string;
  time_from: string; // ISO datetime string
  time_to: string; // ISO datetime string
  datetime: string; // ISO datetime string
  added_description?: unknown;
}

export interface ClientUpdate extends Partial<ClientCreate> {}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  search?: string;
  from?: string;
  to?: string;
}

export interface JwtResponse {
  token: string;
}

// --- Konfiguracja klienta axios ---

const API_BASE_URL = process.env.API_BASE_URL || "http://0.0.0.0:8080";

class Api {
  private axios: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Dodaj interceptor do wstawiania tokenu JWT w nagłówkach
    this.axios.interceptors.request.use((config) => {
      if (this.token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  // --- Public Endpoints ---

  async healthCheck(): Promise<string> {
    const res = await this.axios.get("/");
    return res.data;
  }

  async register(user: UserRegister): Promise<UserModel> {
    const res = await this.axios.post<UserModel>("/register", user);
    return res.data;
  }

  async login(credentials: UserLogin): Promise<JwtResponse> {
    const res = await this.axios.post<JwtResponse>("/login", credentials);
    return res.data;
  }

  // --- Protected Endpoints (JWT required) ---

  // USER ACCOUNT

  async getUserAccount(): Promise<UserModel> {
    const res = await this.axios.get<UserModel>("/user/account");
    return res.data;
  }

  async updateUserAccount(data: Partial<UserRegister>): Promise<UserModel> {
    const res = await this.axios.put<UserModel>("/user/account", data);
    return res.data;
  }

  async deleteUserAccount(): Promise<void> {
    await this.axios.delete("/user/account");
  }

  // CLIENTS CRUD

  async addClient(client: ClientCreate): Promise<Client> {
    const res = await this.axios.post<Client>("/clients/add", client);
    return res.data;
  }

  async getClients(params?: PaginationParams): Promise<Client[]> {
    const res = await this.axios.get<Client[]>("/clients/", { params });
    return res.data;
  }

  async getClient(client_uuid: string): Promise<Client> {
    const res = await this.axios.get<Client>(`/clients/${client_uuid}`);
    return res.data;
  }

  async updateClient(
    client_uuid: string,
    client: ClientUpdate,
  ): Promise<Client> {
    const res = await this.axios.put<Client>(`/clients/${client_uuid}`, client);
    return res.data;
  }

  async deleteClient(client_uuid: string): Promise<void> {
    await this.axios.delete(`/clients/${client_uuid}`);
  }
}

export const api = new Api();
