export enum UserRole {
  ADMIN  = 'ROLE_ADMIN',
  CLIENT = 'ROLE_CLIENT',
}

export interface User {
  id:    number;
  email: string;
  name:  string;
  role:  UserRole;
}
