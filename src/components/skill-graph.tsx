import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SkillGraphData } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  getStackIconUrl,
  handleStackIconError,
} from "@/lib/stack-icons";

type GraphNode = {
  id: string;
  label: string;
  group: string;
  distance: number;
  x: number;
  y: number;
};

type GraphEdge = {
  key: string;
  type: string;
  source: string;
  target: string;
};

type Camera = {
  x: number;
  y: number;
  zoom: number;
};

const WIDTH = 900;
const HEIGHT = 560;

const MIN_ZOOM = 0.55;
const MAX_ZOOM = 2.8;

const DRAG_THRESHOLD = 4;

const CENTER_RADIUS = 40;
const FIRST_HOP_RADIUS = 29;
const OTHER_RADIUS = 22;

const LABEL_BUDGET = 65;

const COLORS = {
  primary: "var(--color-card)",
  accent: "var(--color-accent)",
  card: "var(--color-card)",
  border: "var(--color-border)",
};

function getRadius(
  node: GraphNode,
  center: string,
) {
  if (node.id === center) {
    return CENTER_RADIUS;
  }

  if (node.distance === 1) {
    return FIRST_HOP_RADIUS;
  }

  return OTHER_RADIUS;
}

/**
 * Stable deterministic radial layout.
 *
 * No physics.
 * No random movement.
 * Nodes only move when dragged.
 */
function createLayout(
  data: SkillGraphData,
  center: string,
): GraphNode[] {
  const groups = new Map<
    number,
    SkillGraphData["nodes"]
  >();

  for (const node of data.nodes) {
    const list =
      groups.get(node.distance) ?? [];

    list.push(node);
    groups.set(node.distance, list);
  }

  const result: GraphNode[] = [];

  for (const [distance, nodes] of [
    ...groups.entries(),
  ].sort((a, b) => a[0] - b[0])) {
    if (distance === 0) {
      const centerNode = nodes.find(
        (node) => node.id === center,
      );

      if (centerNode) {
        result.push({
          ...centerNode,
          x: WIDTH / 2,
          y: HEIGHT / 2,
        });
      }

      continue;
    }

    const radius =
      distance === 1
        ? 145
        : distance === 2
          ? 245
          : 325;

    const sorted = [...nodes].sort((a, b) =>
      a.label.localeCompare(b.label),
    );

    const count = sorted.length;

    sorted.forEach((node, index) => {
      const angle =
        -Math.PI / 2 +
        (index / Math.max(count, 1)) *
          Math.PI *
          2 +
        distance * 0.18;

      result.push({
        ...node,
        x:
          WIDTH / 2 +
          Math.cos(angle) * radius,
        y:
          HEIGHT / 2 +
          Math.sin(angle) *
            radius *
            0.68,
      });
    });
  }

  if (
    !result.some(
      (node) => node.id === center,
    )
  ) {
    const centerNode =
      data.nodes.find(
        (node) => node.id === center,
      );

    if (centerNode) {
      result.push({
        ...centerNode,
        x: WIDTH / 2,
        y: HEIGHT / 2,
      });
    }
  }

  return result;
}

export function SkillGraph({
  data,
  center,
  onSelectSkill,
}: {
  data: SkillGraphData;
  center: string;
  onSelectSkill: (skill: string) => void;
}) {
  const [inspected, setInspected] =
    useState<string | null>(null);

  const [hovered, setHovered] =
    useState<string | null>(null);

  const [isFullscreen, setIsFullscreen] =
    useState(false);

  const [exporting, setExporting] =
    useState(false);

  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const svgRef =
    useRef<SVGSVGElement | null>(null);

  const graphRef =
    useRef<SVGGElement | null>(null);

  const nodeRefs =
    useRef(
      new Map<string, SVGGElement>(),
    );

  const edgeRefs =
    useRef(
      new Map<string, SVGPathElement>(),
    );

  const positionsRef =
    useRef<GraphNode[]>([]);

  const cameraRef =
    useRef<Camera>({
      x: 0,
      y: 0,
      zoom: 1,
    });

  const dragRef =
    useRef<{
      type: "node" | "pan" | null;
      pointerId: number;
      nodeId: string | null;
      startX: number;
      startY: number;
      startCameraX: number;
      startCameraY: number;
      moved: boolean;
    }>({
      type: null,
      pointerId: -1,
      nodeId: null,
      startX: 0,
      startY: 0,
      startCameraX: 0,
      startCameraY: 0,
      moved: false,
    });

  const movedRef =
    useRef(false);

  const nodes = useMemo(
    () => createLayout(data, center),
    [data, center],
  );

  const edges = useMemo<GraphEdge[]>(
    () =>
      data.edges.map((edge, index) => ({
        key: `${edge.source}-${edge.target}-${edge.type}-${index}`,
        type: edge.type,
        source: edge.source,
        target: edge.target,
      })),
    [data.edges],
  );

  const showAllLabels =
    nodes.length <= LABEL_BUDGET;

  /*
   * Selected/hovered node is used only
   * for subtle relationship highlighting.
   *
   * It NEVER controls node opacity.
   */
  const activeNode =
    hovered ?? inspected;

  const connectedEdgeKeys = useMemo(() => {
    if (!activeNode) {
      return new Set<string>();
    }

    const result = new Set<string>();

    for (const edge of edges) {
      if (
        edge.source === activeNode ||
        edge.target === activeNode
      ) {
        result.add(edge.key);
      }
    }

    return result;
  }, [activeNode, edges]);

  /*
   * Icon error callback.
   *
   * This is called when Simple Icons
   * returns an invalid/missing resource.
   */
  const handleIconError =
    useCallback(
      (
        skillName: string,
        error: unknown,
      ) => {
        handleStackIconError(
          skillName,
          error,
          (name) => {
            console.warn(
              `[CareerGraph] Stack icon unavailable: ${name}`,
            );
          },
        );
      },
      [],
    );

  const applyCamera = useCallback(() => {
    const graph = graphRef.current;

    if (!graph) {
      return;
    }

    const {
      x,
      y,
      zoom,
    } = cameraRef.current;

    graph.setAttribute(
      "transform",
      `translate(${x} ${y}) scale(${zoom})`,
    );
  }, []);

  const scheduleCamera = useCallback(() => {
    requestAnimationFrame(
      applyCamera,
    );
  }, [applyCamera]);

  const screenToGraph = useCallback(
    (
      clientX: number,
      clientY: number,
    ) => {
      const svg = svgRef.current;

      if (!svg) {
        return {
          x: WIDTH / 2,
          y: HEIGHT / 2,
        };
      }

      const rect =
        svg.getBoundingClientRect();

      const screenX =
        ((clientX - rect.left) /
          rect.width) *
        WIDTH;

      const screenY =
        ((clientY - rect.top) /
          rect.height) *
        HEIGHT;

      const camera =
        cameraRef.current;

      return {
        x:
          (screenX - camera.x) /
          camera.zoom,
        y:
          (screenY - camera.y) /
          camera.zoom,
      };
    },
    [],
  );

  const updateNodePosition =
    useCallback(
      (node: GraphNode) => {
        const element =
          nodeRefs.current.get(
            node.id,
          );

        if (!element) {
          return;
        }

        element.setAttribute(
          "transform",
          `translate(${node.x} ${node.y})`,
        );
      },
      [],
    );

  const updateEdge =
    useCallback(
      (
        edge: GraphEdge,
        nodeMap: Map<string, GraphNode>,
      ) => {
        const element =
          edgeRefs.current.get(
            edge.key,
          );

        if (!element) {
          return;
        }

        const source =
          nodeMap.get(edge.source);

        const target =
          nodeMap.get(edge.target);

        if (!source || !target) {
          return;
        }

        const dx =
          target.x - source.x;

        const dy =
          target.y - source.y;

        const distance = Math.max(
          Math.sqrt(
            dx * dx + dy * dy,
          ),
          1,
        );

        const nx =
          -dy / distance;

        const ny =
          dx / distance;

        const curve = Math.min(
          distance * 0.1,
          24,
        );

        const direction =
          edge.source < edge.target
            ? 1
            : -1;

        const cx =
          (source.x + target.x) /
            2 +
          nx * curve * direction;

        const cy =
          (source.y + target.y) /
            2 +
          ny * curve * direction;

        element.setAttribute(
          "d",
          `M ${source.x} ${source.y}
           Q ${cx} ${cy}
           ${target.x} ${target.y}`,
        );
      },
      [],
    );

  const updateAllEdges =
    useCallback(() => {
      const nodeMap = new Map(
        positionsRef.current.map(
          (node) => [
            node.id,
            node,
          ],
        ),
      );

      for (const edge of edges) {
        updateEdge(
          edge,
          nodeMap,
        );
      }
    }, [edges, updateEdge]);

  /*
   * Initialize graph.
   */
  useLayoutEffect(() => {
    positionsRef.current =
      nodes.map((node) => ({
        ...node,
      }));

    cameraRef.current = {
      x: 0,
      y: 0,
      zoom: 1,
    };

    setInspected(null);
    setHovered(null);

    movedRef.current = false;

    requestAnimationFrame(() => {
      applyCamera();

      for (const node of nodes) {
        updateNodePosition(node);
      }

      updateAllEdges();
    });
  }, [
    nodes,
    applyCamera,
    updateNodePosition,
    updateAllEdges,
  ]);

  /*
   * Cursor-centered zoom.
   */
  useEffect(() => {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    const handleWheel = (
      event: WheelEvent,
    ) => {
      event.preventDefault();

      const rect =
        svg.getBoundingClientRect();

      const px =
        ((event.clientX -
          rect.left) /
          rect.width) *
        WIDTH;

      const py =
        ((event.clientY -
          rect.top) /
          rect.height) *
        HEIGHT;

      const camera =
        cameraRef.current;

      const factor = Math.exp(
        -event.deltaY * 0.0014,
      );

      const nextZoom =
        Math.min(
          MAX_ZOOM,
          Math.max(
            MIN_ZOOM,
            camera.zoom * factor,
          ),
        );

      const scale =
        nextZoom /
        camera.zoom;

      camera.x =
        px -
        (px - camera.x) * scale;

      camera.y =
        py -
        (py - camera.y) * scale;

      camera.zoom = nextZoom;

      scheduleCamera();
    };

    svg.addEventListener(
      "wheel",
      handleWheel,
      {
        passive: false,
      },
    );

    return () => {
      svg.removeEventListener(
        "wheel",
        handleWheel,
      );
    };
  }, [scheduleCamera]);

  /*
   * NODE DRAG START
   */
  const handleNodePointerDown =
    useCallback(
      (
        event: React.PointerEvent,
        nodeId: string,
      ) => {
        event.stopPropagation();

        dragRef.current = {
          type: "node",
          pointerId:
            event.pointerId,
          nodeId,
          startX:
            event.clientX,
          startY:
            event.clientY,
          startCameraX: 0,
          startCameraY: 0,
          moved: false,
        };

        movedRef.current = false;

        (
          event.currentTarget as SVGGElement
        ).setPointerCapture(
          event.pointerId,
        );
      },
      [],
    );

  /*
   * DIRECT NODE MOVEMENT.
   */
  const handleNodePointerMove =
    useCallback(
      (
        event: React.PointerEvent,
        nodeId: string,
      ) => {
        const drag =
          dragRef.current;

        if (
          drag.type !== "node" ||
          drag.nodeId !== nodeId ||
          drag.pointerId !==
            event.pointerId
        ) {
          return;
        }

        const dx =
          event.clientX -
          drag.startX;

        const dy =
          event.clientY -
          drag.startY;

        if (
          !drag.moved &&
          Math.hypot(dx, dy) <
            DRAG_THRESHOLD
        ) {
          return;
        }

        drag.moved = true;
        movedRef.current = true;

        const point =
          screenToGraph(
            event.clientX,
            event.clientY,
          );

        const node =
          positionsRef.current.find(
            (item) =>
              item.id === nodeId,
          );

        if (!node) {
          return;
        }

        node.x = point.x;
        node.y = point.y;

        updateNodePosition(node);
        updateAllEdges();
      },
      [
        screenToGraph,
        updateNodePosition,
        updateAllEdges,
      ],
    );

  /*
   * CANVAS PAN START
   */
  const handleCanvasPointerDown =
    useCallback(
      (
        event: React.PointerEvent<SVGSVGElement>,
      ) => {
        if (
          event.target !==
          event.currentTarget
        ) {
          return;
        }

        dragRef.current = {
          type: "pan",
          pointerId:
            event.pointerId,
          nodeId: null,
          startX:
            event.clientX,
          startY:
            event.clientY,
          startCameraX:
            cameraRef.current.x,
          startCameraY:
            cameraRef.current.y,
          moved: false,
        };

        movedRef.current = false;

        event.currentTarget.setPointerCapture(
          event.pointerId,
        );
      },
      [],
    );

  /*
   * CANVAS PAN MOVE
   */
  const handleCanvasPointerMove =
    useCallback(
      (
        event: React.PointerEvent<SVGSVGElement>,
      ) => {
        const drag =
          dragRef.current;

        if (
          drag.type !== "pan" ||
          drag.pointerId !==
            event.pointerId
        ) {
          return;
        }

        const dx =
          event.clientX -
          drag.startX;

        const dy =
          event.clientY -
          drag.startY;

        if (
          !drag.moved &&
          Math.hypot(dx, dy) <
            DRAG_THRESHOLD
        ) {
          return;
        }

        drag.moved = true;
        movedRef.current = true;

        const svg =
          svgRef.current;

        const rect =
          svg?.getBoundingClientRect();

        const scaleX = rect?.width
          ? WIDTH / rect.width
          : 1;

        const scaleY = rect?.height
          ? HEIGHT / rect.height
          : 1;

        cameraRef.current.x =
          drag.startCameraX +
          dx * scaleX;

        cameraRef.current.y =
          drag.startCameraY +
          dy * scaleY;

        scheduleCamera();
      },
      [scheduleCamera],
    );

  /*
   * POINTER END
   */
  const handlePointerEnd =
    useCallback(
      (
        event: React.PointerEvent,
      ) => {
        if (
          dragRef.current
            .pointerId !==
          event.pointerId
        ) {
          return;
        }

        dragRef.current.type =
          null;

        dragRef.current.nodeId =
          null;
      },
      [],
    );

  /*
   * NODE CLICK
   *
   * Nothing gets dimmed.
   */
  const handleNodeClick =
    useCallback(
      (nodeId: string) => {
        if (movedRef.current) {
          return;
        }

        setInspected(nodeId);
      },
      [],
    );

  /*
   * NODE DOUBLE CLICK
   */
  const handleNodeDoubleClick =
    useCallback(
      (
        event: React.MouseEvent,
        label: string,
      ) => {
        event.stopPropagation();

        if (movedRef.current) {
          return;
        }

        onSelectSkill(label);
      },
      [onSelectSkill],
    );

  /*
   * ZOOM BUTTON
   */
  const zoomCenter =
    useCallback(
      (factor: number) => {
        const camera =
          cameraRef.current;

        const nextZoom =
          Math.min(
            MAX_ZOOM,
            Math.max(
              MIN_ZOOM,
              camera.zoom * factor,
            ),
          );

        const scale =
          nextZoom /
          camera.zoom;

        const px =
          WIDTH / 2;

        const py =
          HEIGHT / 2;

        camera.x =
          px -
          (px - camera.x) * scale;

        camera.y =
          py -
          (py - camera.y) * scale;

        camera.zoom = nextZoom;

        scheduleCamera();
      },
      [scheduleCamera],
    );

  /*
   * FIT GRAPH
   */
  const fitGraph =
    useCallback(() => {
      const graphNodes =
        positionsRef.current;

      if (!graphNodes.length) {
        return;
      }

      const xs = graphNodes.map(
        (node) => node.x,
      );

      const ys = graphNodes.map(
        (node) => node.y,
      );

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const graphWidth =
        Math.max(
          maxX - minX,
          180,
        );

      const graphHeight =
        Math.max(
          maxY - minY,
          180,
        );

      const padding = 90;

      const zoomX =
        (WIDTH - padding * 2) /
        graphWidth;

      const zoomY =
        (HEIGHT - padding * 2) /
        graphHeight;

      const zoom = Math.min(
        zoomX,
        zoomY,
        1.45,
      );

      cameraRef.current.zoom =
        Math.max(
          MIN_ZOOM,
          Math.min(
            MAX_ZOOM,
            zoom,
          ),
        );

      const graphCenterX =
        (minX + maxX) / 2;

      const graphCenterY =
        (minY + maxY) / 2;

      cameraRef.current.x =
        WIDTH / 2 -
        graphCenterX *
          cameraRef.current.zoom;

      cameraRef.current.y =
        HEIGHT / 2 -
        graphCenterY *
          cameraRef.current.zoom;

      scheduleCamera();
    }, [scheduleCamera]);

  /*
   * RESET GRAPH
   */
  const resetGraph =
    useCallback(() => {
      const fresh =
        createLayout(
          data,
          center,
        );

      positionsRef.current =
        fresh;

      cameraRef.current = {
        x: 0,
        y: 0,
        zoom: 1,
      };

      setInspected(null);
      setHovered(null);

      requestAnimationFrame(() => {
        applyCamera();

        for (const node of fresh) {
          updateNodePosition(node);
        }

        updateAllEdges();
      });
    }, [
      data,
      center,
      applyCamera,
      updateNodePosition,
      updateAllEdges,
    ]);

  /*
   * FOCUS NODE
   */
  const centerOnNode =
    useCallback(
      (nodeId: string) => {
        const node =
          positionsRef.current.find(
            (item) =>
              item.id === nodeId,
          );

        if (!node) {
          return;
        }

        const zoom = 1.35;

        cameraRef.current.zoom =
          zoom;

        cameraRef.current.x =
          WIDTH / 2 -
          node.x * zoom;

        cameraRef.current.y =
          HEIGHT / 2 -
          node.y * zoom;

        scheduleCamera();
      },
      [scheduleCamera],
    );

  /*
   * FULLSCREEN
   */
  const toggleFullscreen =
    useCallback(() => {
      const container =
        containerRef.current;

      if (!container) {
        return;
      }

      if (
        document.fullscreenElement ===
        container
      ) {
        void document.exitFullscreen();
      } else {
        void container.requestFullscreen?.();
      }
    }, []);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(
        document.fullscreenElement ===
          containerRef.current,
      );
    };

    document.addEventListener(
      "fullscreenchange",
      handler,
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handler,
      );
    };
  }, []);

  /*
   * EXPORT PNG
   */
  const exportPng =
    useCallback(async () => {
      if (!svgRef.current) {
        return;
      }

      setExporting(true);

      try {
        const {
          downloadGraphPng,
        } = await import(
          "@/lib/graph-export"
        );

        await downloadGraphPng(
          svgRef.current,
          `careergraph-${center
            .toLowerCase()
            .replace(
              /\s+/g,
              "-",
            )}.png`,
        );
      } finally {
        setExporting(false);
      }
    }, [center]);

  const inspectedNode =
    inspected
      ? positionsRef.current.find(
          (node) =>
            node.id === inspected,
        )
      : null;

  const inspectedEdgeCount =
    inspected
      ? edges.reduce(
          (count, edge) =>
            count +
            (edge.source === inspected ||
            edge.target === inspected
              ? 1
              : 0),
          0,
        )
      : 0;

  return (
    <div
      ref={containerRef}
      className="card-surface flex flex-col overflow-hidden bg-card"
    >
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            Skill Graph
          </span>

          <span>
            {data.nodes.length} nodes
          </span>

          <span>
            {data.edges.length} relationships
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <GraphButton
            onClick={() =>
              zoomCenter(1.18)
            }
          >
            +
          </GraphButton>

          <GraphButton
            onClick={() =>
              zoomCenter(1 / 1.18)
            }
          >
            −
          </GraphButton>

          <GraphButton
            onClick={fitGraph}
          >
            Fit
          </GraphButton>

          <GraphButton
            onClick={resetGraph}
          >
            Reset
          </GraphButton>

          <GraphButton
            onClick={toggleFullscreen}
          >
            {isFullscreen
              ? "Exit"
              : "Fullscreen"}
          </GraphButton>

          {/* <GraphButton
            onClick={exportPng}
            disabled={exporting}
          >
            {exporting
              ? "Exporting…"
              : "Export"}
          </GraphButton> */}
        </div>
      </div>

      {/* GRAPH */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(45, 212, 191, 0.045), transparent 42%), var(--color-graph-surface)",
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className={cn(
            "w-full touch-none select-none",
            isFullscreen
              ? "h-[calc(100vh-105px)]"
              : "h-[520px]",
          )}
          role="img"
          aria-label={`Interactive skill graph centered on ${center}`}
          onPointerDown={
            handleCanvasPointerDown
          }
          onPointerMove={
            handleCanvasPointerMove
          }
          onPointerUp={
            handlePointerEnd
          }
          onPointerCancel={
            handlePointerEnd
          }
        >
          <defs>
            <filter
              id="skill-node-shadow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="5"
                floodOpacity="0.24"
              />
            </filter>

            <filter
              id="skill-node-glow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur
                stdDeviation="4"
                result="blur"
              />

              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g
            ref={graphRef}
            transform="translate(0 0) scale(1)"
          >
            {/* RELATIONSHIPS */}
            <g pointerEvents="none">
              {edges.map((edge) => {
                const isActive =
                  connectedEdgeKeys.has(
                    edge.key,
                  );

                const color =
                   COLORS.accent
              

                return (
                  <path
                    key={edge.key}
                    ref={(element) => {
                      if (element) {
                        edgeRefs.current.set(
                          edge.key,
                          element,
                        );
                      } else {
                        edgeRefs.current.delete(
                          edge.key,
                        );
                      }
                    }}
                    d=""
                    fill="none"
                    stroke={color}
                    strokeWidth={
                      isActive
                        ? 2.3
                        : 1.15
                    }
                    strokeOpacity={
                      isActive
                        ? 0.8
                        : 0.25
                    }
                    strokeLinecap="round"
                    className="transition-[stroke-opacity,stroke-width] duration-200"
                  />
                );
              })}
            </g>

            {/* NODES */}
            <g>
              {nodes.map((node) => {
                const radius =
                  getRadius(
                    node,
                    center,
                  );

                const isCenter =
                  node.id === center;

                const isHovered =
                  node.id === hovered;

                const isInspected =
                  node.id === inspected;

                const iconUrl =
                  getStackIconUrl(
                    node.label,
                  );

                const iconSize =
                  isCenter
                    ? 30
                    : node.distance ===
                        1
                      ? 22
                      : 18;

                return (
                  <g
                    key={node.id}
                    ref={(element) => {
                      if (element) {
                        nodeRefs.current.set(
                          node.id,
                          element,
                        );
                      } else {
                        nodeRefs.current.delete(
                          node.id,
                        );
                      }
                    }}
                    transform={`translate(${node.x} ${node.y})`}
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(
                      event,
                    ) =>
                      handleNodePointerDown(
                        event,
                        node.id,
                      )
                    }
                    onPointerMove={(
                      event,
                    ) =>
                      handleNodePointerMove(
                        event,
                        node.id,
                      )
                    }
                    onPointerUp={
                      handlePointerEnd
                    }
                    onPointerCancel={
                      handlePointerEnd
                    }
                    onMouseEnter={() =>
                      setHovered(
                        node.id,
                      )
                    }
                    onMouseLeave={() =>
                      setHovered(null)
                    }
                    onClick={() =>
                      handleNodeClick(
                        node.id,
                      )
                    }
                    onDoubleClick={(
                      event,
                    ) =>
                      handleNodeDoubleClick(
                        event,
                        node.label,
                      )
                    }
                  >
                    {/* CENTER HALO */}
                    {isCenter && (
                      <>
                        <circle
                          r={
                            radius + 16
                          }
                          fill="none"
                          stroke={
                            COLORS.primary
                          }
                          strokeWidth="1"
                          strokeOpacity="0.1"
                        />

                        <circle
                          r={
                            radius + 8
                          }
                          fill="none"
                          stroke={
                            COLORS.primary
                          }
                          strokeWidth="1.5"
                          strokeOpacity="0.25"
                        />
                      </>
                    )}

                    {/* SELECTED / HOVERED HALO */}
                    {(isHovered ||
                      isInspected) &&
                      !isCenter && (
                        <circle
                          r={
                            radius + 7
                          }
                          fill="none"
                          stroke={
                            COLORS.accent
                          }
                          strokeWidth="1.5"
                          strokeOpacity="0.4"
                        />
                      )}

                    {/* NODE */}
                    <circle
                      r={radius}
                      fill={
                        isCenter
                          ? COLORS.primary
                          : isInspected
                            ? COLORS.accent
                            : COLORS.card
                      }
                      stroke={
                        isCenter
                          ? COLORS.primary
                          : isHovered ||
                              isInspected
                            ? COLORS.accent
                            : COLORS.border
                      }
                      strokeWidth={
                        isCenter ||
                        isHovered ||
                        isInspected
                          ? 2.5
                          : 1.5
                      }
                      filter={
                        isCenter ||
                        isHovered ||
                        isInspected
                          ? "url(#skill-node-glow)"
                          : "url(#skill-node-shadow)"
                      }
                      className="transition-[fill,stroke,stroke-width] duration-200"
                    />

                    {/* ICON */}
                    {iconUrl ? (
                      <image
                        href={iconUrl}
                        x={
                          -iconSize / 2
                        }
                        y={
                          -iconSize / 2
                        }
                        width={
                          iconSize
                        }
                        height={
                          iconSize
                        }
                        preserveAspectRatio="xMidYMid meet"
                        pointerEvents="none"
                        opacity={
                          isCenter ||
                          isHovered ||
                          isInspected
                            ? 1
                            : 0.9
                        }
                        onError={(
                          event,
                        ) => {
                          /*
                           * Hide broken SVG
                           * resource.
                           */
                          event.currentTarget.style.display =
                            "none";

                          handleIconError(
                            node.label,
                            event,
                          );
                        }}
                      />
                    ) : (
                      <text
                        x="0"
                        y="5"
                        textAnchor="middle"
                        pointerEvents="none"
                        className="fill-muted-foreground text-[11px] font-bold"
                      >
                        {node.label
                          .slice(
                            0,
                            2,
                          )
                          .toUpperCase()}
                      </text>
                    )}

                    {/* LABEL */}
                    {(showAllLabels ||
                      isCenter ||
                      node.distance <=
                        1 ||
                      isHovered ||
                      isInspected) && (
                      <text
                        y={
                          radius + 15
                        }
                        textAnchor="middle"
                        className={cn(
                          "pointer-events-none fill-foreground text-[12px] font-medium",
                          isCenter &&
                            "text-[14px] font-bold",
                          node.distance ===
                            1 &&
                            "font-semibold",
                        )}
                      >
                        {
                          node.label
                        }
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* INTERACTION HINT */}
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-border/70 bg-card/80 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-md">
          <span className="font-medium text-foreground">
            Drag nodes
          </span>{" "}
          · drag empty space to pan · scroll to
          zoom
        </div>

        {/* LEGEND */}
        <div className="pointer-events-none absolute right-4 bottom-4 flex items-center gap-4 rounded-lg border border-border/70 bg-card/80 px-3 py-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur-md">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-5 rounded-full bg-primary" />
            Related
          </span>

          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-5 rounded-full bg-accent" />
            Prerequisite
          </span>
        </div>
      </div>

      {/* INSPECTOR */}
      <div className="border-t border-border px-4 py-3">
        {inspectedNode ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-3">
              {getStackIconUrl(
                inspectedNode.label,
              ) ? (
                <img
                  src={
                    getStackIconUrl(
                      inspectedNode.label,
                    )!
                  }
                  alt=""
                  width={28}
                  height={28}
                  className="object-contain"
                  onError={(
                    event,
                  ) => {
                    event.currentTarget.style.display =
                      "none";

                    handleIconError(
                      inspectedNode.label,
                      event,
                    );
                  }}
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-[10px] font-bold text-muted-foreground">
                  {inspectedNode.label
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}

              <div>
                <div className="font-semibold text-foreground">
                  {
                    inspectedNode.label
                  }
                </div>

                <div className="text-xs text-muted-foreground">
                  {
                    inspectedNode.group
                  }{" "}
                  ·{" "}
                  {
                    inspectedNode.distance
                  }{" "}
                  hop
                  {inspectedNode.distance ===
                  1
                    ? ""
                    : "s"}{" "}
                  from {center} ·{" "}
                  {
                    inspectedEdgeCount
                  }{" "}
                  relationship
                  {inspectedEdgeCount ===
                  1
                    ? ""
                    : "s"}
                </div>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  centerOnNode(
                    inspectedNode.id,
                  )
                }
                className="focus-ring rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                Focus
              </button>

              <button
                type="button"
                onClick={() =>
                  onSelectSkill(
                    inspectedNode.label,
                  )
                }
                className="focus-ring rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Make center
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                Drag
              </span>{" "}
              nodes to arrange the graph.{" "}
              <span className="font-medium text-foreground">
                Hover
              </span>{" "}
              to explore relationships.{" "}
              <span className="font-medium text-foreground">
                Double-click
              </span>{" "}
              to make a skill the center.
            </p>

            <span className="hidden text-xs text-muted-foreground sm:block">
              {center} · Center skill
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function GraphButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="focus-ring rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-secondary active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}