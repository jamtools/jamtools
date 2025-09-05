import {Observable, Subject} from 'rxjs';
import {MacroTypeConfigs} from './macro_module_types';
import {MacroAPI} from './registered_macro_types';

// ========================================
// Dynamic Workflow Configuration Types
// ========================================

export interface MacroWorkflowConfig {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    version: string;
    metadata?: {
        tags: string[];
        author?: string;
        createdAt: string;
        updatedAt: string;
    };
    nodes: MacroNodeConfig[];
    connections: MacroConnectionConfig[];
    layout?: WorkflowLayoutConfig;
}

export interface MacroNodeConfig {
    id: string;
    type: keyof MacroTypeConfigs;
    position: Point2D;
    config: any; // Will be type-safe via WorkflowSchema
    customName?: string;
    metadata?: {
        collapsed?: boolean;
        notes?: string;
    };
}

export interface MacroConnectionConfig {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourcePort: string;
    targetPort: string;
    enabled: boolean;
    metadata?: {
        label?: string;
        color?: string;
    };
}

export interface Point2D {
    x: number;
    y: number;
}

export interface WorkflowLayoutConfig {
    zoom: number;
    pan: Point2D;
    gridSize: number;
    snapToGrid: boolean;
}

// ========================================
// Type-Safe Workflow Schema System
// ========================================

export interface WorkflowSchema<T extends string = keyof MacroTypeConfigs> {
    id: T;
    nodes: {
        [K in keyof WorkflowSchemaNodes<T>]: WorkflowSchemaNodeConfig<WorkflowSchemaNodes<T>[K]>;
    };
    connections: Array<{
        from: { nodeId: keyof WorkflowSchemaNodes<T>; port: string };
        to: { nodeId: keyof WorkflowSchemaNodes<T>; port: string };
    }>;
}

export type WorkflowSchemaNodes<T extends string> = {
    [key: string]: keyof MacroTypeConfigs;
};

export interface WorkflowSchemaNodeConfig<T extends keyof MacroTypeConfigs> {
    type: T;
    config: MacroTypeConfigs[T]['input'];
    position?: Point2D;
}

// Type-safe workflow configuration that ensures node configs match their types
export type TypeSafeWorkflowConfig<S extends WorkflowSchema> = Omit<MacroWorkflowConfig, 'nodes'> & {
    schema: S['id'];
    nodes: {
        [K in keyof S['nodes']]: {
            id: K;
            type: S['nodes'][K]['type'];
            config: S['nodes'][K]['config'];
            position: Point2D;
            customName?: string;
        };
    }[keyof S['nodes']][];
};

// ========================================
// Enhanced Macro Type Definitions
// ========================================

export interface MacroTypeDefinition<T extends keyof MacroTypeConfigs = keyof MacroTypeConfigs> {
    id: T;
    displayName: string;
    description: string;
    category: MacroCategory;
    icon?: string;
    configSchema: JSONSchema7;
    inputs: MacroPortDefinition[];
    outputs: MacroPortDefinition[];
    metadata?: {
        version: string;
        author?: string;
        tags: string[];
        documentation?: string;
        examples?: Array<{
            name: string;
            description: string;
            config: MacroTypeConfigs[T]['input'];
        }>;
    };
}

export type MacroCategory = 
    | 'input' 
    | 'output' 
    | 'processor' 
    | 'utility' 
    | 'effect' 
    | 'generator' 
    | 'analyzer';

export interface MacroPortDefinition {
    id: string;
    name: string;
    description?: string;
    type: MacroPortType;
    dataType: MacroDataType;
    required: boolean;
    multiple?: boolean; // Can connect to multiple targets/sources
    metadata?: {
        constraints?: any;
        defaultValue?: any;
        validation?: JSONSchema7;
    };
}

export type MacroPortType = 'input' | 'output';

export type MacroDataType = 
    | 'midi_event' 
    | 'control_value' 
    | 'note_sequence' 
    | 'audio_stream' 
    | 'parameter_map'
    | 'trigger_signal'
    | 'generic';

// ========================================
// Connectable Macro Handler Interface
// ========================================

export interface ConnectableMacroHandler<
    TInput = any,
    TOutput = any
> {
    readonly id: string;
    readonly type: keyof MacroTypeConfigs;
    readonly definition: MacroTypeDefinition;
    
    // Port management
    readonly inputs: ReadonlyMap<string, MacroInputPort<TInput>>;
    readonly outputs: ReadonlyMap<string, MacroOutputPort<TOutput>>;
    
    // Connection management
    connect(outputPort: string, target: ConnectableMacroHandler, inputPort: string): ConnectionHandle;
    disconnect(connectionId: string): void;
    
    // Lifecycle
    initialize(): Promise<void>;
    destroy(): Promise<void>;
    reconfigure(config: any): Promise<void>;
    
    // State management
    getState(): MacroHandlerState;
    setState(state: Partial<MacroHandlerState>): void;
    
    // Event handling
    readonly onError: Observable<MacroError>;
    readonly onStateChange: Observable<MacroHandlerState>;
}

export interface MacroInputPort<T = any> {
    readonly id: string;
    readonly definition: MacroPortDefinition;
    readonly subject: Subject<T>;
    readonly connections: ReadonlySet<string>; // Connection IDs
    
    process(value: T): void;
    validate(value: T): ValidationResult;
}

export interface MacroOutputPort<T = any> {
    readonly id: string;
    readonly definition: MacroPortDefinition;
    readonly observable: Observable<T>;
    readonly connections: ReadonlySet<string>; // Connection IDs
    
    emit(value: T): void;
    subscribe(handler: (value: T) => void): () => void;
}

export interface ConnectionHandle {
    readonly id: string;
    readonly sourceNode: string;
    readonly sourcePort: string;
    readonly targetNode: string;
    readonly targetPort: string;
    readonly enabled: boolean;
    
    enable(): void;
    disable(): void;
    destroy(): void;
    
    // Performance monitoring
    readonly metrics: ConnectionMetrics;
}

export interface ConnectionMetrics {
    messagesTransmitted: number;
    bytesTransmitted: number;
    errors: number;
    latency: {
        min: number;
        max: number;
        average: number;
    };
}

// ========================================
// Workflow Instance Management
// ========================================

export interface MacroWorkflowInstance {
    readonly id: string;
    readonly config: MacroWorkflowConfig;
    readonly nodes: ReadonlyMap<string, ConnectableMacroHandler>;
    readonly connections: ReadonlyMap<string, ConnectionHandle>;
    readonly state: WorkflowState;
    
    // Lifecycle
    initialize(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    destroy(): Promise<void>;
    
    // Hot reconfiguration
    reconfigure(config: MacroWorkflowConfig): Promise<void>;
    updateNode(nodeId: string, config: Partial<MacroNodeConfig>): Promise<void>;
    addNode(node: MacroNodeConfig): Promise<void>;
    removeNode(nodeId: string): Promise<void>;
    
    // Connection management
    addConnection(connection: MacroConnectionConfig): Promise<ConnectionHandle>;
    removeConnection(connectionId: string): Promise<void>;
    
    // Performance and monitoring
    readonly metrics: WorkflowMetrics;
    readonly onError: Observable<WorkflowError>;
    readonly onStateChange: Observable<WorkflowState>;
}

export interface WorkflowState {
    status: 'initializing' | 'running' | 'stopped' | 'error' | 'destroying';
    error?: string;
    startTime?: Date;
    nodeStates: Record<string, MacroHandlerState>;
}

export interface MacroHandlerState {
    status: 'idle' | 'active' | 'error' | 'disabled';
    error?: string;
    config: any;
    metadata?: Record<string, any>;
}

export interface WorkflowMetrics {
    uptime: number;
    totalMessages: number;
    averageLatency: number;
    errorRate: number;
    nodeMetrics: Record<string, NodeMetrics>;
    connectionMetrics: Record<string, ConnectionMetrics>;
}

export interface NodeMetrics {
    messagesProcessed: number;
    errors: number;
    averageProcessingTime: number;
    memoryUsage?: number;
    cpuUsage?: number;
}

// ========================================
// Validation and Error Types
// ========================================

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    path: string;
    message: string;
    code: string;
    severity: 'error' | 'warning';
}

export interface ValidationWarning extends ValidationError {
    severity: 'warning';
}

export interface MacroError {
    id: string;
    nodeId?: string;
    connectionId?: string;
    type: 'configuration' | 'runtime' | 'connection' | 'validation';
    message: string;
    details?: any;
    timestamp: Date;
    stack?: string;
}

export interface WorkflowError extends MacroError {
    workflowId: string;
}

// ========================================
// Template and Preset System
// ========================================

export interface WorkflowTemplate<T extends string = string> {
    id: T;
    name: string;
    description: string;
    category: string;
    version: string;
    schema: WorkflowSchema<T>;
    configSchema: JSONSchema7;
    metadata?: {
        author?: string;
        tags: string[];
        documentation?: string;
        examples?: Array<{
            name: string;
            description: string;
            parameters: any;
        }>;
    };
}

export interface WorkflowPreset<T extends WorkflowTemplate = WorkflowTemplate> {
    id: string;
    templateId: T['id'];
    name: string;
    description?: string;
    parameters: any; // Matches template's configSchema
    metadata?: {
        tags: string[];
        author?: string;
        createdAt: string;
    };
}

// ========================================
// JSON Schema Types
// ========================================

export interface JSONSchema7 {
    $schema?: string;
    $id?: string;
    title?: string;
    description?: string;
    type?: 'null' | 'boolean' | 'object' | 'array' | 'number' | 'string' | 'integer';
    properties?: Record<string, JSONSchema7>;
    required?: string[];
    additionalProperties?: boolean | JSONSchema7;
    items?: JSONSchema7 | JSONSchema7[];
    anyOf?: JSONSchema7[];
    oneOf?: JSONSchema7[];
    allOf?: JSONSchema7[];
    not?: JSONSchema7;
    enum?: any[];
    const?: any;
    default?: any;
    examples?: any[];
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: boolean | number;
    exclusiveMaximum?: boolean | number;
    multipleOf?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
    minProperties?: number;
    maxProperties?: number;
    patternProperties?: Record<string, JSONSchema7>;
    dependencies?: Record<string, JSONSchema7 | string[]>;
    if?: JSONSchema7;
    then?: JSONSchema7;
    else?: JSONSchema7;
}