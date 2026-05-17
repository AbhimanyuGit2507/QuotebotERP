export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  tenant_id: string;
  role: string;
  permissions: string[];
}
