import { useCallback, useEffect, useState, type DragEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Node palette recovered from the bundle: step / task / branch / delay / parallel / await. */
const NODE_TYPES = [
  { type: "step", labelKey: "workflows.step", color: "#3b82f6" },
  { type: "task", labelKey: "workflows.task", color: "#10b981" },
  { type: "branch", labelKey: "workflows.branch", color: "#f59e0b" },
  { type: "delay", labelKey: "workflows.delay", color: "#8b5cf6" },
  { type: "parallel", labelKey: "workflows.parallel", color: "#ec4899" },
  { type: "await", labelKey: "workflows.await", color: "#6b7280" },
];

let nodeSeq = 1;

/** Visual workflow editor (React Flow) → definition {nodes, edges} via /admin/workflows. */
export function WorkflowEditor() {
  const { t } = useT();
  const [params] = useSearchParams();
  const id = params.get("id");
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<Node | null>(null);

  const existing = useQuery({
    queryKey: ["workflows", id],
    queryFn: () => api.workflows.get(id!),
    enabled: !!id,
    retry: false,
  });

  useEffect(() => {
    const wf = existing.data;
    if (!wf) return;
    setName(wf.name ?? "");
    const def = wf.definition ?? {};
    setNodes((def.nodes ?? []) as Node[]);
    setEdges((def.edges ?? []) as Edge[]);
  }, [existing.data]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((ns) => applyNodeChanges(changes, ns)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((es) => applyEdgeChanges(changes, es)), []);
  const onConnect = useCallback((conn: Connection) => setEdges((es) => addEdge({ ...conn, animated: true }, es)), []);

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/raisfast-node");
    if (!type) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const meta = NODE_TYPES.find((n) => n.type === type);
    const node: Node = {
      id: `${type}-${Date.now()}`,
      type: "default",
      position: { x: e.clientX - bounds.left - 80, y: e.clientY - bounds.top - 20 },
      data: { label: `${meta?.labelKey.split(".")[1] ?? type} ${nodeSeq++}`, nodeType: type, config: {} },
      style: { borderLeft: `4px solid ${meta?.color}`, width: 160 },
    };
    setNodes((ns) => [...ns, node]);
  }, []);

  const save = useMutation({
    mutationFn: () => {
      const definition = {
        nodes: nodes.map((n) => ({ id: n.id, type: (n.data as any).nodeType ?? "step", position: n.position, data: n.data })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label })),
      };
      return id ? api.workflows.update(id, { name, definition } as any) : api.workflows.create({ name, definition } as any);
    },
    onSuccess: () => {
      toast.success(t("workflows.saved"));
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link to="/workflows">
          <Button variant="outline" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("common.name")} className="w-64" />
        <div className="flex-1" />
        <Button onClick={() => save.mutate()} disabled={save.isPending || !name}>
          <Save /> {t("common.save")}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* palette */}
        <Card className="w-44 shrink-0">
          <CardHeader className="p-3">
            <CardTitle className="text-xs font-medium">{t("workflows.palette")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3 pt-0">
            {NODE_TYPES.map((n) => (
              <div
                key={n.type}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("application/raisfast-node", n.type)}
                className="cursor-grab rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm transition-colors hover:border-primary/50"
                style={{ borderLeft: `4px solid ${n.color}` }}
              >
                {t(n.labelKey)}
              </div>
            ))}
            <p className="pt-1 text-[11px] text-muted-foreground">{t("workflows.dragHint")}</p>
          </CardContent>
        </Card>

        {/* canvas */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-border" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelected(node)}
            onPaneClick={() => setSelected(null)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} />
            <Controls />
            <MiniMap pannable zoomable className="!bg-muted" />
          </ReactFlow>
        </div>

        {/* properties */}
        {selected && (
          <Card className="w-64 shrink-0 overflow-y-auto">
            <CardHeader className="p-3">
              <CardTitle className="text-xs font-medium">{t("workflows.properties")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3 pt-0">
              <Field label={t("workflows.nodeLabel")}>
                <Input
                  value={String(selected.data.label ?? "")}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNodes((ns) => ns.map((n) => (n.id === selected.id ? { ...n, data: { ...n.data, label: v } } : n)));
                    setSelected((s) => (s ? { ...s, data: { ...s.data, label: v } } : s));
                  }}
                />
              </Field>
              <Field label={t("workflows.nodeConfig")}>
                <Textarea
                  value={JSON.stringify((selected.data as any).config ?? {}, null, 2)}
                  onChange={(e) => {
                    let config: unknown = e.target.value;
                    try {
                      config = JSON.parse(e.target.value);
                    } catch {
                      /* keep typing */
                    }
                    setNodes((ns) => ns.map((n) => (n.id === selected.id ? { ...n, data: { ...n.data, config } } : n)));
                  }}
                  className="min-h-32 font-mono text-xs"
                />
              </Field>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => {
                  setNodes((ns) => ns.filter((n) => n.id !== selected.id));
                  setEdges((es) => es.filter((e) => e.source !== selected.id && e.target !== selected.id));
                  setSelected(null);
                }}
              >
                {t("common.delete")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
