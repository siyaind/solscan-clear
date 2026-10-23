import { AccountExplorer } from "@/components/account-explorer";
export default async function AccountPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return <AccountExplorer address={address} />;
}
