export interface User {
  uuid: string;
  name: string;
  lastname: string;
  email: string;
  password: string;
}

export interface UserController {
  name: string;
  lastname: string;
  email: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}
