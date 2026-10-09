"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Switches the daily charts between the last 30 days and month to date.
export function PeriodToggle({ value, onChange }) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList>
        <TabsTrigger value="30d">Last 30 days</TabsTrigger>
        <TabsTrigger value="mtd">Month to date</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
