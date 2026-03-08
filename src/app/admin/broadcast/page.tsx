import type { Metadata } from "next";
import BroadcastContent from "./broadcast-content";

export const metadata: Metadata = {
  title: "通知广播",
};

export default function BroadcastPage() {
  return <BroadcastContent />;
}
