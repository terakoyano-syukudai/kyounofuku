"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { TimelineEditor } from "@/components/timeline/TimelineEditor";
import { getDayPlanOrLatest, listScenes, useAppData } from "@/lib/store";
import { todayISO } from "@/lib/weather";

export default function PlanPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Plan />
    </Suspense>
  );
}

function Plan() {
  const data = useAppData();
  const sp = useSearchParams();
  if (!data) return <Loading />;
  const today = todayISO();
  const tomorrow = todayISO(1);
  const date = sp.get("date") === tomorrow ? tomorrow : today;
  const { plan } = getDayPlanOrLatest(data, date);
  return <TimelineEditor key={date} scenes={listScenes()} initial={plan} dates={{ today, tomorrow }} />;
}
