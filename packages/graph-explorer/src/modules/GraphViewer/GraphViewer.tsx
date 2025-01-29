import { MouseEvent, useCallback, useMemo, useRef, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { EdgeId, Vertex, VertexId } from "@/core";
import {
  Panel,
  PanelContent,
  PanelHeader,
  PanelHeaderActionButton,
  PanelHeaderActions,
  PanelHeaderDivider,
  PanelTitle,
  RemoveFromCanvasIcon,
  ResetIcon,
  VertexSymbol,
  ZoomInIcon,
  ZoomOutIcon,
} from "@/components";
import Card from "@/components/Card";
import Graph from "@/components/Graph";
import { GraphRef } from "@/components/Graph/Graph";
import { ElementEventCallback } from "@/components/Graph/hooks/useAddClickEvents";
import { IconButton } from "@/components";
import CloseIcon from "@/components/icons/CloseIcon";
import InfoIcon from "@/components/icons/InfoIcon";
import ScreenshotIcon from "@/components/icons/ScreenshotIcon";
import Select from "@/components/Select";
import {
  edgesOutOfFocusIdsAtom,
  edgesSelectedIdsAtom,
} from "@/core/StateProvider/edges";
import {
  nodesOutOfFocusIdsAtom,
  nodesSelectedIdsAtom,
} from "@/core/StateProvider/nodes";
import { useClearGraph, useEntities, useExpandNode } from "@/hooks";
import ContextMenu from "./internalComponents/ContextMenu";
import useContextMenu from "./useContextMenu";
import useGraphGlobalActions from "./useGraphGlobalActions";
import useGraphStyles from "./useGraphStyles";
import useNodeBadges from "./useNodeBadges";
import { SelectedElements } from "@/components/Graph/Graph.model";
import { useAutoOpenDetailsSidebar } from "./useAutoOpenDetailsSidebar";
import { useDisplayVertexTypeConfigs, useNeighborsCallback } from "@/core";

export type GraphViewerProps = {
  onNodeCustomize(nodeType?: string): void;
  onEdgeCustomize(edgeType?: string): void;
};

const LAYOUT_OPTIONS = [
  {
    label: "Force Directed  (F0Cose)",
    value: "F_COSE",
  },
  {
    label: "Force Directed (D3)",
    value: "D3",
  },
  {
    label: "Hierarchical - Vertical",
    value: "DAGRE_VERTICAL",
  },
  {
    label: "Hierarchical - Horizontal",
    value: "DAGRE_HORIZONTAL",
  },
  {
    label: "Subway - Vertical",
    value: "SUBWAY_VERTICAL",
  },
  {
    label: "Subway - Horizontal",
    value: "SUBWAY_HORIZONTAL",
  },
  {
    label: "Klay",
    value: "KLAY",
  },
  {
    label: "Concentric",
    value: "CONCENTRIC",
  },
];

// Prevent open context menu on Windows
function onContextMenu(e: MouseEvent<HTMLDivElement>) {
  e.preventDefault();
  e.stopPropagation();
}

export default function GraphViewer({
  onNodeCustomize,
  onEdgeCustomize,
}: GraphViewerProps) {
  const graphRef = useRef<GraphRef | null>(null);
  const [entities] = useEntities();

  const [nodesSelectedIds, setNodesSelectedIds] =
    useRecoilState(nodesSelectedIdsAtom);

  const [edgesSelectedIds, setEdgesSelectedIds] =
    useRecoilState(edgesSelectedIdsAtom);
  const nodesOutIds = useRecoilValue(nodesOutOfFocusIdsAtom);
  const edgesOutIds = useRecoilValue(edgesOutOfFocusIdsAtom);

  const autoOpenDetails = useAutoOpenDetailsSidebar();

  const onSelectedElementIdsChange = useCallback(
    ({ nodeIds, edgeIds }: SelectedElements) => {
      setNodesSelectedIds(nodeIds as Set<VertexId>);
      setEdgesSelectedIds(edgeIds as Set<EdgeId>);

      if (
        (nodeIds.size === 1 && edgeIds.size === 0) ||
        (nodeIds.size === 0 && edgeIds.size === 1)
      ) {
        autoOpenDetails();
      }
    },
    [autoOpenDetails, setEdgesSelectedIds, setNodesSelectedIds]
  );

  const [legendOpen, setLegendOpen] = useState(false);
  const { onZoomIn, onZoomOut, onSaveScreenshot } =
    useGraphGlobalActions(graphRef);

  const {
    clearAllLayers,
    contextLayerProps,
    contextNodeId,
    contextEdgeId,
    isContextOpen,
    onGraphRightClick,
    onNodeRightClick,
    onEdgeRightClick,
    parentRef,
    renderContextLayer,
  } = useContextMenu();

  const styles = useGraphStyles();
  const getNodeBadges = useNodeBadges();

  const { expandNode } = useExpandNode();
  const neighborCallback = useNeighborsCallback();
  const onNodeDoubleClick: ElementEventCallback<Vertex> = useCallback(
    async (_, vertex) => {
      const neighborCount = await neighborCallback(vertex.id);
      const offset = neighborCount ? neighborCount.fetched : undefined;

      expandNode(vertex, {
        limit: 10,
        offset,
      });
    },
    [expandNode, neighborCallback]
  );

  const [layout, setLayout] = useState("F_COSE");
  const onClearGraph = useClearGraph();

  const nodes = useMemo(
    () =>
      entities.nodes
        .values()
        .map(n => ({ data: n }))
        .toArray(),
    [entities]
  );
  const edges = useMemo(
    () =>
      entities.edges
        .values()
        .map(e => ({ data: e }))
        .toArray(),
    [entities]
  );

  return (
    <div className="relative size-full grow" onContextMenu={onContextMenu}>
      <Panel>
        <PanelHeader>
          <PanelTitle>Graph View</PanelTitle>
          <PanelHeaderActions>
            <Select
              className="min-w-auto max-w-64"
              label="Layout"
              labelPlacement="inner"
              hideError={true}
              options={LAYOUT_OPTIONS}
              value={layout}
              noMargin
              onChange={v => setLayout(v as string)}
            />
            <IconButton
              tooltipText="Re-run Layout"
              icon={<ResetIcon />}
              variant="text"
              onClick={() => {
                graphRef.current?.runLayout();
              }}
            />
            <div className="grow" />
            <PanelHeaderActionButton
              label="Download Screenshot"
              icon={<ScreenshotIcon />}
              onActionClick={onSaveScreenshot}
            />
            <PanelHeaderDivider />
            <PanelHeaderActionButton
              label="Zoom in"
              icon={<ZoomInIcon />}
              onActionClick={onZoomIn}
            />
            <PanelHeaderActionButton
              label="Zoom out"
              icon={<ZoomOutIcon />}
              onActionClick={onZoomOut}
            />
            <PanelHeaderDivider />
            <PanelHeaderActionButton
              label="Clear canvas"
              icon={<RemoveFromCanvasIcon />}
              color="error"
              onActionClick={onClearGraph}
            />
            <PanelHeaderActionButton
              label="Legend"
              icon={<InfoIcon />}
              onActionClick={() => setLegendOpen(open => !open)}
            />
          </PanelHeaderActions>
        </PanelHeader>
        <PanelContent
          className="bg-background-secondary relative flex h-full w-full"
          ref={parentRef}
        >
          <Graph
            ref={graphRef}
            nodes={nodes}
            edges={edges}
            badgesEnabled={false}
            getNodeBadges={getNodeBadges(nodesOutIds)}
            selectedNodesIds={nodesSelectedIds}
            selectedEdgesIds={edgesSelectedIds}
            outOfFocusNodesIds={nodesOutIds}
            outOfFocusEdgesIds={edgesOutIds}
            onSelectedElementIdsChange={onSelectedElementIdsChange}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeRightClick={onNodeRightClick}
            onEdgeRightClick={onEdgeRightClick}
            onGraphRightClick={onGraphRightClick}
            styles={styles}
            layout={layout}
          />
          {isContextOpen &&
            renderContextLayer(
              <div
                {...contextLayerProps}
                style={{ ...contextLayerProps.style, zIndex: 999999 }}
              >
                <ContextMenu
                  graphRef={graphRef}
                  onClose={clearAllLayers}
                  affectedNodesIds={contextNodeId ? [contextNodeId] : []}
                  affectedEdgesIds={contextEdgeId ? [contextEdgeId] : []}
                  onNodeCustomize={onNodeCustomize}
                  onEdgeCustomize={onEdgeCustomize}
                />
              </div>
            )}
          {legendOpen && <Legend onClose={() => setLegendOpen(false)} />}
        </PanelContent>
      </Panel>
    </div>
  );
}

function Legend({ onClose }: { onClose: () => void }) {
  const vtConfigs = useDisplayVertexTypeConfigs().values().toArray();

  return (
    <Card className="z-panes absolute bottom-2 right-2 top-2 min-w-48 max-w-80 overflow-auto">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-base font-bold">Legend</h1>
        <IconButton
          icon={<CloseIcon />}
          onClick={onClose}
          variant="text"
          size="small"
        />
      </div>
      <ul className="space-y-2 overflow-y-scroll">
        {vtConfigs.map(vtConfig => (
          <li
            key={vtConfig.type}
            className="flex items-center gap-2 text-balance"
          >
            <VertexSymbol
              vertexStyle={vtConfig.style}
              className="size-8 p-1.5"
            />
            {vtConfig.displayLabel}
          </li>
        ))}
      </ul>
    </Card>
  );
}
