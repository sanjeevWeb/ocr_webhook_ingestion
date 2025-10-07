declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      user: string;
      sub: string;
      email:string;
      role: string;
      // Add other user properties as needed
    };
    // Add other custom properties here
    someCustomData?: string;
  }
}
