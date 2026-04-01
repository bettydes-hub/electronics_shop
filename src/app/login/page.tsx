import { Suspense } from "react";
import { StaffLoginForm } from "@/components/staff/StaffLoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
          Loading…
        </div>
      }
    >
      <StaffLoginForm />
    </Suspense>
  );
}
