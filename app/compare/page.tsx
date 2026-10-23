import { AddressCompare } from "@/components/address-compare";
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string | string[]; b?: string | string[] }>;
}) {
  const query = await searchParams;
  return (
    <AddressCompare
      initialA={typeof query.a === "string" ? query.a : ""}
      initialB={typeof query.b === "string" ? query.b : ""}
    />
  );
}
