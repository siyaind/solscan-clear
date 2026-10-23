import { TransactionWorkspace } from "@/components/transaction-workspace";
export default async function TransactionPage({
  params,
}: {
  params: Promise<{ signature: string }>;
}) {
  const { signature } = await params;
  return <TransactionWorkspace signature={signature} />;
}
