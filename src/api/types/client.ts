export interface Client {
  uuid: string;
  name: string;
  lastname: string;
  telephone: string;
  title: string;
  description: string;
  time_from: string; // ISO string (e.g., from new Date().toISOString())
  time_to: string;
  datetime: string;
  added_description: unknown; // if it's JSON, this could be typed more strictly
  user_uuid: string;
}

export interface ClientController {
  name: string;
  lastname: string;
  telephone: string;
  title: string;
  description: string;
  time_from: string;
  time_to: string;
  datetime: string;
  added_description?: unknown; // optional
}
