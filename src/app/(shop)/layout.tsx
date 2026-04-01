import { ShopCustomerFooter } from "@/components/landing/ShopCustomerFooter";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 flex-col">{children}</div>
      <ShopCustomerFooter />
    </div>
  );
}
