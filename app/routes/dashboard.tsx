import { ChartAreaInteractive } from "~/components/chart-area-interactive";
import { DataTable, schema } from "~/components/data-table";
import { SectionCards } from "~/components/section-cards";
import rawData from "~/dashboard/data.json";
import type { Route } from "./+types/dashboard";

export async function loader() {
  // Simula o tempo de resposta de uma API.
  await new Promise((resolve) => setTimeout(resolve, 400));

  return schema.array().parse(rawData);
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <DataTable data={loaderData} />
    </div>
  );
}
