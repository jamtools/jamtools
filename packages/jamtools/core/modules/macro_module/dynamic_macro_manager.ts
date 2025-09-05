import {BehaviorSubject, Observable, Subject, Subscription} from 'rxjs';
import {debounceTime, distinctUntilChanged, filter, map, takeUntil} from 'rxjs/operators';

import {
    MacroWorkflowConfig,
    MacroWorkflowInstance,
    MacroTypeDefinition,
    ConnectableMacroHandler,
    WorkflowTemplate,
    WorkflowPreset,
    ValidationResult,
    WorkflowError,
    WorkflowState,
    MacroConnectionConfig,
    ConnectionHandle,
    MacroNodeConfig,
    WorkflowMetrics,
    MacroError,
    JSONSchema7
} from './dynamic_macro_types';
import {MacroTypeConfigs} from './macro_module_types';
import {MacroAPI} from './registered_macro_types';

// ========================================
// Dynamic Macro Manager - Core System
// ========================================

export class DynamicMacroManager {
    private readonly activeWorkflows = new Map<string, MacroWorkflowInstance>();
    private readonly macroTypeDefinitions = new Map<keyof MacroTypeConfigs, MacroTypeDefinition>();
    private readonly workflowTemplates = new Map<string, WorkflowTemplate>();
    private readonly workflowPresets = new Map<string, WorkflowPreset>();
    
    private readonly workflowsSubject = new BehaviorSubject<Map<string, MacroWorkflowInstance>>(new Map());
    private readonly errorsSubject = new Subject<WorkflowError>();
    private readonly destroyed$ = new Subject<void>();
    
    private persistenceProvider?: WorkflowPersistenceProvider;
    private validationProvider: WorkflowValidationProvider;
    
    constructor(
        private macroAPI: MacroAPI,
        options: DynamicMacroManagerOptions = {}
    ) {
        this.persistenceProvider = options.persistenceProvider;
        this.validationProvider = options.validationProvider ?? new DefaultWorkflowValidator();
        
        // Auto-save workflows on changes with debouncing
        this.workflowsSubject.pipe(
            debounceTime(1000),
            takeUntil(this.destroyed$)
        ).subscribe(() => {
            this.saveWorkflowsToStorage().catch(error => 
                this.errorsSubject.next({
                    id: this.generateId(),
                    workflowId: '',
                    type: 'runtime',
                    message: 'Failed to auto-save workflows',
                    details: error,
                    timestamp: new Date()
                })
            );
        });
    }

    // ========================================
    // Workflow Lifecycle Management
    // ========================================

    async createWorkflow(config: MacroWorkflowConfig): Promise<string> {
        // Validate configuration
        const validation = await this.validationProvider.validateWorkflow(config);
        if (!validation.valid) {
            throw new Error(`Invalid workflow configuration: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        // Create workflow instance
        const instance = new MacroWorkflowInstanceImpl(
            config,
            this.macroAPI,
            this.macroTypeDefinitions,
            this
        );

        // Initialize and start if enabled
        try {
            await instance.initialize();
            if (config.enabled) {
                await instance.start();
            }
            
            this.activeWorkflows.set(config.id, instance);
            this.notifyWorkflowsChanged();
            
            return config.id;
        } catch (error) {
            await instance.destroy();
            throw error;
        }
    }

    async updateWorkflow(id: string, config: MacroWorkflowConfig): Promise<void> {
        const instance = this.activeWorkflows.get(id);
        if (!instance) {
            throw new Error(`Workflow ${id} not found`);
        }

        const validation = await this.validationProvider.validateWorkflow(config);
        if (!validation.valid) {
            throw new Error(`Invalid workflow configuration: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        await instance.reconfigure(config);
    }

    async deleteWorkflow(id: string): Promise<void> {
        const instance = this.activeWorkflows.get(id);
        if (!instance) {
            return; // Already deleted
        }

        await instance.destroy();
        this.activeWorkflows.delete(id);
        this.notifyWorkflowsChanged();
    }

    async enableWorkflow(id: string): Promise<void> {
        const instance = this.activeWorkflows.get(id);
        if (!instance) {
            throw new Error(`Workflow ${id} not found`);
        }

        await instance.start();
    }

    async disableWorkflow(id: string): Promise<void> {
        const instance = this.activeWorkflows.get(id);
        if (!instance) {
            throw new Error(`Workflow ${id} not found`);
        }

        await instance.stop();
    }

    // ========================================
    // Hot Reloading and Runtime Reconfiguration
    // ========================================

    async rehydrateAllWorkflows(): Promise<void> {
        const rehydrationPromises = Array.from(this.activeWorkflows.entries()).map(
            async ([id, instance]) => {
                try {
                    await this.rehydrateWorkflow(id);
                } catch (error) {
                    this.errorsSubject.next({
                        id: this.generateId(),
                        workflowId: id,
                        type: 'runtime',
                        message: `Failed to rehydrate workflow ${id}`,
                        details: error,
                        timestamp: new Date()
                    });
                }
            }
        );

        await Promise.all(rehydrationPromises);
    }

    async rehydrateWorkflow(id: string): Promise<void> {
        const instance = this.activeWorkflows.get(id);
        if (!instance) {
            throw new Error(`Workflow ${id} not found`);
        }

        const currentConfig = instance.config;
        const wasRunning = instance.state.status === 'running';

        // Graceful shutdown with connection preservation
        const connectionStates = this.captureConnectionStates(instance);
        await instance.stop();

        // Reinitialize with preserved state
        await instance.reconfigure(currentConfig);
        this.restoreConnectionStates(instance, connectionStates);

        // Restart if it was running before
        if (wasRunning) {
            await instance.start();
        }
    }

    private captureConnectionStates(instance: MacroWorkflowInstance): Map<string, any> {
        const states = new Map<string, any>();
        for (const [connectionId, connection] of instance.connections) {
            states.set(connectionId, {
                enabled: connection.enabled,
                metrics: { ...connection.metrics }
            });
        }
        return states;
    }

    private restoreConnectionStates(instance: MacroWorkflowInstance, states: Map<string, any>): void {
        for (const [connectionId, connection] of instance.connections) {
            const savedState = states.get(connectionId);
            if (savedState) {
                if (savedState.enabled !== connection.enabled) {
                    savedState.enabled ? connection.enable() : connection.disable();
                }
            }
        }
    }

    // ========================================
    // Template and Preset Management
    // ========================================

    registerWorkflowTemplate<T extends string>(template: WorkflowTemplate<T>): void {
        // Validate template schema
        const validation = this.validationProvider.validateTemplate(template);
        if (!validation.valid) {
            throw new Error(`Invalid template: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        this.workflowTemplates.set(template.id, template);
    }

    async createWorkflowFromTemplate<T extends WorkflowTemplate>(
        templateId: T['id'],
        parameters: any,
        name?: string
    ): Promise<string> {
        const template = this.workflowTemplates.get(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }

        // Validate parameters against template schema
        const paramValidation = this.validateAgainstSchema(parameters, template.configSchema);
        if (!paramValidation.valid) {
            throw new Error(`Invalid parameters: ${paramValidation.errors.map(e => e.message).join(', ')}`);
        }

        // Generate workflow config from template
        const config = await this.instantiateTemplate(template, parameters, name);
        return this.createWorkflow(config);
    }

    private async instantiateTemplate(
        template: WorkflowTemplate,
        parameters: any,
        name?: string
    ): Promise<MacroWorkflowConfig> {
        const workflowId = this.generateId();
        
        // Create nodes from template schema
        const nodes: MacroNodeConfig[] = Object.entries(template.schema.nodes).map(([nodeId, nodeConfig]) => ({
            id: nodeId,
            type: nodeConfig.type,
            position: nodeConfig.position ?? { x: 0, y: 0 },
            config: this.interpolateParameters(nodeConfig.config, parameters),
            customName: nodeConfig.type.toString()
        }));

        // Create connections from template schema
        const connections: MacroConnectionConfig[] = template.schema.connections.map((conn, index) => ({
            id: `${workflowId}_connection_${index}`,
            sourceNodeId: conn.from.nodeId as string,
            targetNodeId: conn.to.nodeId as string,
            sourcePort: conn.from.port,
            targetPort: conn.to.port,
            enabled: true
        }));

        return {
            id: workflowId,
            name: name ?? `${template.name} Instance`,
            description: `Generated from template: ${template.name}`,
            enabled: true,
            version: '1.0.0',
            nodes,
            connections,
            metadata: {
                tags: ['generated', 'template'],
                author: 'system',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        };
    }

    private interpolateParameters(config: any, parameters: any): any {
        if (typeof config === 'string') {
            return config.replace(/\{\{(\w+)\}\}/g, (match, key) => parameters[key] ?? match);
        }
        
        if (Array.isArray(config)) {
            return config.map(item => this.interpolateParameters(item, parameters));
        }
        
        if (config && typeof config === 'object') {
            const result: any = {};
            for (const [key, value] of Object.entries(config)) {
                result[key] = this.interpolateParameters(value, parameters);
            }
            return result;
        }
        
        return config;
    }

    // ========================================
    // Macro Type Definition Management
    // ========================================

    registerMacroTypeDefinition<T extends keyof MacroTypeConfigs>(definition: MacroTypeDefinition<T>): void {
        this.macroTypeDefinitions.set(definition.id, definition);
    }

    getMacroTypeDefinition<T extends keyof MacroTypeConfigs>(typeId: T): MacroTypeDefinition<T> | undefined {
        return this.macroTypeDefinitions.get(typeId) as MacroTypeDefinition<T> | undefined;
    }

    getAllMacroTypes(): MacroTypeDefinition[] {
        return Array.from(this.macroTypeDefinitions.values());
    }

    getMacroTypesByCategory(category: string): MacroTypeDefinition[] {
        return Array.from(this.macroTypeDefinitions.values()).filter(def => def.category === category);
    }

    // ========================================
    // Persistence and Storage
    // ========================================

    async saveWorkflowsToStorage(): Promise<void> {
        if (!this.persistenceProvider) {
            return;
        }

        const workflows = Array.from(this.activeWorkflows.values()).map(instance => instance.config);
        await this.persistenceProvider.saveWorkflows(workflows);
    }

    async loadWorkflowsFromStorage(): Promise<MacroWorkflowConfig[]> {
        if (!this.persistenceProvider) {
            return [];
        }

        const configs = await this.persistenceProvider.loadWorkflows();
        
        // Recreate workflow instances
        for (const config of configs) {
            try {
                await this.createWorkflow(config);
            } catch (error) {
                this.errorsSubject.next({
                    id: this.generateId(),
                    workflowId: config.id,
                    type: 'runtime',
                    message: `Failed to load workflow ${config.name}`,
                    details: error,
                    timestamp: new Date()
                });
            }
        }

        return configs;
    }

    // ========================================
    // Observables and Events
    // ========================================

    get workflows$(): Observable<ReadonlyMap<string, MacroWorkflowInstance>> {
        return this.workflowsSubject.asObservable().pipe(
            map(workflows => new Map(workflows)),
            distinctUntilChanged()
        );
    }

    get errors$(): Observable<WorkflowError> {
        return this.errorsSubject.asObservable();
    }

    getWorkflowErrors$(workflowId: string): Observable<WorkflowError> {
        return this.errors$.pipe(
            filter(error => error.workflowId === workflowId)
        );
    }

    // ========================================
    // Validation and Utilities
    // ========================================

    private validateAgainstSchema(value: any, schema: JSONSchema7): ValidationResult {
        // Basic schema validation - in real implementation, use Ajv or similar
        return { valid: true, errors: [], warnings: [] };
    }

    private notifyWorkflowsChanged(): void {
        this.workflowsSubject.next(new Map(this.activeWorkflows));
    }

    private generateId(): string {
        return `macro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ========================================
    // Cleanup
    // ========================================

    async destroy(): Promise<void> {
        this.destroyed$.next();
        this.destroyed$.complete();

        // Destroy all active workflows
        const destroyPromises = Array.from(this.activeWorkflows.values()).map(instance => instance.destroy());
        await Promise.all(destroyPromises);

        this.activeWorkflows.clear();
        this.workflowsSubject.complete();
        this.errorsSubject.complete();
    }
}

// ========================================
// Workflow Instance Implementation
// ========================================

class MacroWorkflowInstanceImpl implements MacroWorkflowInstance {
    private readonly nodesMap = new Map<string, ConnectableMacroHandler>();
    private readonly connectionsMap = new Map<string, ConnectionHandle>();
    private readonly stateSubject = new BehaviorSubject<WorkflowState>({
        status: 'initializing',
        nodeStates: {}
    });
    private readonly errorsSubject = new Subject<WorkflowError>();
    private readonly destroyed$ = new Subject<void>();
    private readonly subscriptions: Subscription[] = [];
    
    private metricsCollector: WorkflowMetricsCollector;

    constructor(
        public config: MacroWorkflowConfig,
        private macroAPI: MacroAPI,
        private macroTypeDefinitions: Map<keyof MacroTypeConfigs, MacroTypeDefinition>,
        private manager: DynamicMacroManager
    ) {
        this.metricsCollector = new WorkflowMetricsCollector(this.id);
    }

    get id(): string { return this.config.id; }
    get nodes(): ReadonlyMap<string, ConnectableMacroHandler> { return this.nodesMap; }
    get connections(): ReadonlyMap<string, ConnectionHandle> { return this.connectionsMap; }
    get state(): WorkflowState { return this.stateSubject.value; }
    get metrics(): WorkflowMetrics { return this.metricsCollector.getMetrics(); }
    get onError(): Observable<WorkflowError> { return this.errorsSubject.asObservable(); }
    get onStateChange(): Observable<WorkflowState> { return this.stateSubject.asObservable(); }

    async initialize(): Promise<void> {
        this.updateState({ status: 'initializing' });

        try {
            // Create macro handlers for all nodes
            await this.createNodes();
            
            // Initialize all nodes
            await this.initializeNodes();
            
            // Create connections
            await this.createConnections();

            this.updateState({ status: 'stopped' });
        } catch (error) {
            this.updateState({ status: 'error', error: error.message });
            throw error;
        }
    }

    async start(): Promise<void> {
        if (this.state.status !== 'stopped') {
            throw new Error(`Cannot start workflow in ${this.state.status} state`);
        }

        this.updateState({ status: 'running', startTime: new Date() });
        this.metricsCollector.start();

        // Enable all connections
        for (const connection of this.connectionsMap.values()) {
            if (connection.enabled) {
                connection.enable();
            }
        }
    }

    async stop(): Promise<void> {
        if (this.state.status !== 'running') {
            return;
        }

        // Disable all connections
        for (const connection of this.connectionsMap.values()) {
            connection.disable();
        }

        this.metricsCollector.stop();
        this.updateState({ status: 'stopped' });
    }

    async destroy(): Promise<void> {
        this.updateState({ status: 'destroying' });
        this.destroyed$.next();

        // Cleanup subscriptions
        this.subscriptions.forEach(sub => sub.unsubscribe());

        // Destroy connections
        for (const connection of this.connectionsMap.values()) {
            connection.destroy();
        }
        this.connectionsMap.clear();

        // Destroy nodes
        for (const node of this.nodesMap.values()) {
            await node.destroy();
        }
        this.nodesMap.clear();

        // Complete observables
        this.stateSubject.complete();
        this.errorsSubject.complete();
        this.destroyed$.complete();

        this.metricsCollector.destroy();
    }

    async reconfigure(config: MacroWorkflowConfig): Promise<void> {
        const oldConfig = this.config;
        this.config = config;

        try {
            // Compare configurations and apply minimal changes
            await this.applyConfigurationDiff(oldConfig, config);
        } catch (error) {
            // Rollback on error
            this.config = oldConfig;
            throw error;
        }
    }

    private async createNodes(): Promise<void> {
        for (const nodeConfig of this.config.nodes) {
            const definition = this.macroTypeDefinitions.get(nodeConfig.type);
            if (!definition) {
                throw new Error(`Unknown macro type: ${nodeConfig.type}`);
            }

            // Create connectable wrapper for the macro handler
            const handler = new ConnectableMacroHandlerImpl(
                nodeConfig,
                definition,
                this.macroAPI,
                this.errorsSubject
            );

            this.nodesMap.set(nodeConfig.id, handler);
        }
    }

    private async initializeNodes(): Promise<void> {
        const initPromises = Array.from(this.nodesMap.values()).map(node => node.initialize());
        await Promise.all(initPromises);
    }

    private async createConnections(): Promise<void> {
        for (const connectionConfig of this.config.connections) {
            const sourceNode = this.nodesMap.get(connectionConfig.sourceNodeId);
            const targetNode = this.nodesMap.get(connectionConfig.targetNodeId);

            if (!sourceNode || !targetNode) {
                throw new Error(`Invalid connection: missing nodes`);
            }

            const connection = sourceNode.connect(
                connectionConfig.sourcePort,
                targetNode,
                connectionConfig.targetPort
            );

            this.connectionsMap.set(connectionConfig.id, connection);
        }
    }

    private async applyConfigurationDiff(oldConfig: MacroWorkflowConfig, newConfig: MacroWorkflowConfig): Promise<void> {
        // This is a simplified diff application
        // In a full implementation, this would be more sophisticated
        
        const wasRunning = this.state.status === 'running';
        
        if (wasRunning) {
            await this.stop();
        }

        // Destroy and recreate everything
        // In a full implementation, we'd do minimal updates
        await this.destroy();
        await this.initialize();

        if (wasRunning && newConfig.enabled) {
            await this.start();
        }
    }

    async updateNode(nodeId: string, config: Partial<MacroNodeConfig>): Promise<void> {
        const node = this.nodesMap.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found`);
        }

        const nodeConfig = this.config.nodes.find(n => n.id === nodeId);
        if (!nodeConfig) {
            throw new Error(`Node config ${nodeId} not found`);
        }

        // Update configuration
        Object.assign(nodeConfig, config);
        
        // Reconfigure the node
        await node.reconfigure(nodeConfig.config);
    }

    async addNode(node: MacroNodeConfig): Promise<void> {
        // Implementation would add node to running workflow
        throw new Error('Not implemented');
    }

    async removeNode(nodeId: string): Promise<void> {
        // Implementation would remove node from running workflow
        throw new Error('Not implemented');
    }

    async addConnection(connection: MacroConnectionConfig): Promise<ConnectionHandle> {
        // Implementation would add connection to running workflow
        throw new Error('Not implemented');
    }

    async removeConnection(connectionId: string): Promise<void> {
        const connection = this.connectionsMap.get(connectionId);
        if (connection) {
            connection.destroy();
            this.connectionsMap.delete(connectionId);
        }
    }

    private updateState(update: Partial<WorkflowState>): void {
        const currentState = this.stateSubject.value;
        const newState = { ...currentState, ...update };
        this.stateSubject.next(newState);
    }
}

// ========================================
// Supporting Classes and Interfaces
// ========================================

export interface DynamicMacroManagerOptions {
    persistenceProvider?: WorkflowPersistenceProvider;
    validationProvider?: WorkflowValidationProvider;
}

export interface WorkflowPersistenceProvider {
    saveWorkflows(workflows: MacroWorkflowConfig[]): Promise<void>;
    loadWorkflows(): Promise<MacroWorkflowConfig[]>;
}

export interface WorkflowValidationProvider {
    validateWorkflow(config: MacroWorkflowConfig): Promise<ValidationResult>;
    validateTemplate(template: WorkflowTemplate): ValidationResult;
}

class DefaultWorkflowValidator implements WorkflowValidationProvider {
    async validateWorkflow(config: MacroWorkflowConfig): Promise<ValidationResult> {
        return { valid: true, errors: [], warnings: [] };
    }

    validateTemplate(template: WorkflowTemplate): ValidationResult {
        return { valid: true, errors: [], warnings: [] };
    }
}

class WorkflowMetricsCollector {
    private startTime?: Date;
    private messageCount = 0;
    private errorCount = 0;

    constructor(private workflowId: string) {}

    start(): void {
        this.startTime = new Date();
    }

    stop(): void {
        this.startTime = undefined;
    }

    getMetrics(): WorkflowMetrics {
        return {
            uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
            totalMessages: this.messageCount,
            averageLatency: 0, // Would be calculated from actual measurements
            errorRate: this.errorCount / Math.max(this.messageCount, 1),
            nodeMetrics: {},
            connectionMetrics: {}
        };
    }

    destroy(): void {
        // Cleanup
    }
}

// Placeholder for ConnectableMacroHandlerImpl - would be implemented fully
class ConnectableMacroHandlerImpl implements ConnectableMacroHandler {
    constructor(
        private nodeConfig: MacroNodeConfig,
        public definition: MacroTypeDefinition,
        private macroAPI: MacroAPI,
        private errorsSubject: Subject<WorkflowError>
    ) {}

    get id(): string { return this.nodeConfig.id; }
    get type(): keyof MacroTypeConfigs { return this.nodeConfig.type; }
    get inputs(): ReadonlyMap<string, any> { return new Map(); }
    get outputs(): ReadonlyMap<string, any> { return new Map(); }
    get onError(): Observable<MacroError> { return new Subject(); }
    get onStateChange(): Observable<any> { return new Subject(); }

    connect(): ConnectionHandle { throw new Error('Not implemented'); }
    disconnect(): void { throw new Error('Not implemented'); }
    async initialize(): Promise<void> {}
    async destroy(): Promise<void> {}
    async reconfigure(): Promise<void> {}
    getState(): any { return {}; }
    setState(): void {}
}