import { ShopCustomerFooter } from "@/components/landing/ShopCustomerFooter";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-amazon-bg">
      <div className="flex flex-1 flex-col">{children}</div>
      <ShopCustomerFooter />
    </div>
  );
}
