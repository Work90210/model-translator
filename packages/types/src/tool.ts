export interface McpTool {
  readonly id: string;
  readonly serverId: string;
  readonly name: string;
  readonly description: string | null;
  readonly inputSchema: Record<string, unknown>;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateToolInput {
  readonly serverId: string;
  readonly name: string;
  readonly description?: string | null;
  readonly inputSchema: Record<string, unknown>;
}

export interface UpdateToolInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly inputSchema?: Record<string, unknown>;
  readonly isActive?: boolean;
}

export interface ToolFilters {
  readonly serverId?: string;
  readonly isActive?: boolean;
  readonly name?: string;
}
