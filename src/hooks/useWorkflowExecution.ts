import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkflows, fetchWorkflow } from "../api/workflowApi";
import type { Workflow, WorkflowNode } from "../types/workflow";

export type ExecutionStatus = "idle" | "running" | "completed";

export interface UseWorkflowExecutionReturn {
  // Workflow list
  workflows: Workflow[];
  workflowsLoading: boolean;
  workflowsError: Error | null;

  // Selected workflow & its nodes
  selectedWorkflow: Workflow | null;
  nodes: WorkflowNode[];
  nodesLoading: boolean;
  nodesError: Error | null;

  // Execution state
  status: ExecutionStatus;
  currentIndex: number;
  currentNode: WorkflowNode | null;
  completedNodeIds: Set<string>;
  progress: number; // 0-100

  // Actions
  selectWorkflow: (workflow: Workflow) => void;
  startExecution: () => void;
  confirmNode: () => void;
  resetExecution: () => void;
}

export function useWorkflowExecution(): UseWorkflowExecutionReturn {
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [status, setStatus] = useState<ExecutionStatus>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedNodeIds, setCompletedNodeIds] = useState<Set<string>>(new Set());

  const {
    data: workflows = [],
    isLoading: workflowsLoading,
    error: workflowsError,
  } = useQuery({
    queryKey: ["workflows"],
    queryFn: fetchWorkflows,
  });

  const {
    data: workflowDetail,
    isLoading: nodesLoading,
    error: nodesError,
  } = useQuery({
    queryKey: ["workflow-detail", selectedWorkflow?.id],
    queryFn: () => fetchWorkflow(selectedWorkflow!.id),
    enabled: selectedWorkflow !== null,
  });

  const nodes: WorkflowNode[] = workflowDetail?.nodes ?? [];

  const currentNode =
    status === "running" && nodes.length > 0
      ? (nodes[currentIndex] ?? null)
      : null;

  const progress =
    nodes.length === 0
      ? 0
      : Math.round((completedNodeIds.size / nodes.length) * 100);

  const selectWorkflow = useCallback((workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setStatus("idle");
    setCurrentIndex(0);
    setCompletedNodeIds(new Set());
  }, []);

  const startExecution = useCallback(() => {
    if (!selectedWorkflow || nodes.length === 0) return;
    setCurrentIndex(0);
    setCompletedNodeIds(new Set());
    setStatus("running");
  }, [selectedWorkflow, nodes.length]);

  const confirmNode = useCallback(() => {
    if (status !== "running" || !currentNode) return;
    setCompletedNodeIds((prev) => new Set(prev).add(currentNode.id));
    const nextIndex = currentIndex + 1;
    if (nextIndex >= nodes.length) {
      setStatus("completed");
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [status, currentNode, currentIndex, nodes.length]);

  const resetExecution = useCallback(() => {
    setStatus("idle");
    setCurrentIndex(0);
    setCompletedNodeIds(new Set());
  }, []);

  return {
    workflows,
    workflowsLoading,
    workflowsError: workflowsError as Error | null,
    selectedWorkflow,
    nodes,
    nodesLoading,
    nodesError: nodesError as Error | null,
    status,
    currentIndex,
    currentNode,
    completedNodeIds,
    progress,
    selectWorkflow,
    startExecution,
    confirmNode,
    resetExecution,
  };
}
