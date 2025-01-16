import { useState } from "react";
import type { Vertex, VertexId } from "@/types/entities";
import { PanelError, PanelFooter, VertexRow } from "@/components";
import Button from "@/components/Button";
import ExpandGraphIcon from "@/components/icons/ExpandGraphIcon";
import GraphIcon from "@/components/icons/GraphIcon";
import LoadingSpinner from "@/components/LoadingSpinner";
import PanelEmptyState from "@/components/PanelEmptyState/PanelEmptyState";
import { DisplayVertex, useNeighbors, useNode, useWithTheme } from "@/core";
import { useExpandNode } from "@/hooks";
import useNeighborsOptions, {
  NeighborOption,
} from "@/hooks/useNeighborsOptions";
import useTranslations from "@/hooks/useTranslations";
import NeighborsList from "@/modules/common/NeighborsList/NeighborsList";
import defaultStyles from "./NodeExpandContent.styles";
import NodeExpandFilters, { NodeExpandFilter } from "./NodeExpandFilters";
import { ExpandNodeRequest } from "@/hooks/useExpandNode";
import { useUpdateNodeCountsQuery } from "@/hooks/useUpdateNodeCounts";
import { cn } from "@/utils";

export type NodeExpandContentProps = {
  vertex: DisplayVertex;
};

export default function NodeExpandContent({ vertex }: NodeExpandContentProps) {
  const styleWithTheme = useWithTheme();

  return (
    <div
      className={cn(styleWithTheme(defaultStyles), "flex h-full grow flex-col")}
    >
      <VertexRow vertex={vertex} className="border-b p-3" />
      <ExpandSidebarContent id={vertex.id} />
    </div>
  );
}

function ExpandSidebarContent({ id }: { id: VertexId }) {
  const vertex = useNode(id);
  const t = useTranslations();
  const query = useUpdateNodeCountsQuery(vertex);
  const neighborsOptions = useNeighborsOptions(vertex);

  if (query.isError) {
    return <PanelError error={query.error} onRetry={query.refetch} />;
  }

  if (query.isPending) {
    return (
      <PanelEmptyState icon={<LoadingSpinner />} title="Loading Neighbors" />
    );
  }

  if (!query.data || query.data?.totalCount <= 0) {
    return (
      <PanelEmptyState
        icon={<GraphIcon />}
        title={t("node-expand.no-connections-title")}
        subtitle={t("node-expand.no-connections-subtitle")}
      />
    );
  }

  return (
    <>
      <NeighborsList id={vertex.id} />
      <ExpansionOptions
        vertex={vertex}
        neighborsOptions={neighborsOptions}
        key={neighborsOptions.map(o => o.value).join()}
      />
    </>
  );
}

function ExpansionOptions({
  vertex,
  neighborsOptions,
}: {
  vertex: Vertex;
  neighborsOptions: NeighborOption[];
}) {
  const t = useTranslations();
  const neighbors = useNeighbors(vertex);

  const [selectedType, setSelectedType] = useState<string>(
    firstNeighborAvailableForExpansion(neighborsOptions)?.value ?? ""
  );
  const [filters, setFilters] = useState<Array<NodeExpandFilter>>([]);
  const [limit, setLimit] = useState<number | null>(null);

  const hasSelectedType = Boolean(selectedType);
  const hasUnfetchedNeighbors = (neighbors?.unfetched ?? 0) > 0;
  const expandOffset =
    limit !== null && neighbors ? neighbors.fetched : undefined;

  // Reset filters when selected type changes
  const [prevSelectedType, setPrevSelectedType] = useState(selectedType);
  if (prevSelectedType !== selectedType) {
    setPrevSelectedType(selectedType);
    setFilters([]);
  }

  if (!hasUnfetchedNeighbors) {
    return (
      <PanelEmptyState
        className="empty-panel-state"
        icon={<GraphIcon />}
        title={t("node-expand.no-unfetched-title")}
        subtitle={t("node-expand.no-unfetched-subtitle")}
      />
    );
  }

  return (
    <>
      <NodeExpandFilters
        neighborsOptions={neighborsOptions}
        selectedType={selectedType}
        onSelectedTypeChange={setSelectedType}
        filters={filters}
        onFiltersChange={setFilters}
        limit={limit}
        onLimitChange={setLimit}
      />
      <PanelFooter className="flex flex-row justify-end">
        <ExpandButton
          isDisabled={!hasUnfetchedNeighbors || !hasSelectedType}
          vertex={vertex}
          filters={{
            filterByVertexTypes: [selectedType],
            filterCriteria: filters.map(filter => ({
              name: filter.name,
              operator: "LIKE",
              value: filter.value,
            })),
            limit: limit || undefined,
            offset: expandOffset,
          }}
        />
      </PanelFooter>
    </>
  );
}

function ExpandButton({
  isDisabled,
  vertex,
  filters,
}: ExpandNodeRequest & { isDisabled: boolean }) {
  const { expandNode, isPending } = useExpandNode();

  return (
    <Button
      icon={
        isPending ? (
          <LoadingSpinner style={{ width: 24, height: 24 }} />
        ) : (
          <ExpandGraphIcon />
        )
      }
      variant="filled"
      isDisabled={isPending || isDisabled}
      onPress={() => expandNode(vertex, filters)}
    >
      Expand
    </Button>
  );
}

function firstNeighborAvailableForExpansion(
  neighborsOptions: NeighborOption[]
) {
  return neighborsOptions.find(x => !x.isDisabled) ?? neighborsOptions[0];
}
