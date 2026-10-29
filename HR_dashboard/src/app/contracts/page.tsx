import { redirect } from "next/navigation";

/** 기존 /contracts 진입 → 인사총무 이력 관리(계약 DB)로 이동 */
export default function ContractsPage() {
  redirect("/hr-records?main=hr&sub=contracts");
}
