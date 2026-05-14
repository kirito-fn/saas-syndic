import { UserRole } from "@syndic/shared";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        name: string;
        role: UserRole;
        buildingId: number | null;
      };
    }
  }
}
