import { Inngest } from "inngest";
import { Resend } from "resend";

// Initialize the Inngest client
export const inngest = new Inngest({
  id: "splitr",
  name: "Splitr",
});

// Lazily initialize Resend to avoid build-time errors when env var is missing
export const getResend = () => new Resend(process.env.RESEND_API_KEY);
