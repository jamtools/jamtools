import {Observable, Subject, BehaviorSubject, Subscription, combineLatest, EMPTY} from 'rxjs';
import {
    map, filter, catchError, retry, debounceTime, throttleTime, 
    bufferTime, bufferCount, share, distinctUntilChanged, takeUntil,
    tap, switchMap, mergeMap, concatMap
} from 'rxjs/operators';

import {
    ConnectableMacroHandler,
    MacroInputPort,
    MacroOutputPort,
    ConnectionHandle,
    ConnectionMetrics,
    MacroPortDefinition,
    MacroDataType,
    ValidationResult,
    MacroError
} from './dynamic_macro_types';

// ========================================
// Reactive Connection Management System
// ========================================

/**
 * Manages real-time data flow between macro nodes with performance optimization,
 * error handling, and backpressure management
 */
export class ReactiveConnectionManager {
    private readonly connections = new Map<string, ReactiveConnection>();
    private readonly connectionMetrics = new Map<string, ConnectionMetricsCollector>();
    private readonly errorsSubject = new Subject<MacroError>();
    private readonly destroyed$ = new Subject<void>();

    constructor(private performanceConfig: ConnectionPerformanceConfig = {}) {
        this.performanceConfig = {
            maxLatencyMs: 10, // MIDI real-time requirement
            backpressureStrategy: 'drop',
            errorRetryCount: 3,
            metricsCollectionInterval: 1000,
            ...performanceConfig
        };
    }

    /**
     * Creates a connection between two nodes with performance optimization
     */
    createConnection<TData = any>(
        sourceNode: ConnectableMacroHandler,
        sourcePortId: string,
        targetNode: ConnectableMacroHandler,
        targetPortId: string,
        options: ConnectionOptions = {}
    ): ConnectionHandle {
        const connectionId = this.generateConnectionId();
        
        const sourcePort = sourceNode.outputs.get(sourcePortId);
        const targetPort = targetNode.inputs.get(targetPortId);

        if (!sourcePort || !targetPort) {
            throw new Error(`Invalid ports: ${sourcePortId} -> ${targetPortId}`);
        }

        // Validate data type compatibility
        this.validatePortCompatibility(sourcePort.definition, targetPort.definition);

        // Create reactive connection with performance optimizations
        const connection = new ReactiveConnection(
            connectionId,
            sourceNode.id,
            sourcePortId,
            targetNode.id,
            targetPortId,
            sourcePort,
            targetPort,
            {
                ...this.performanceConfig,
                ...options
            }
        );

        // Create metrics collector
        const metricsCollector = new ConnectionMetricsCollector(
            connectionId,
            this.performanceConfig.metricsCollectionInterval!
        );

        this.connections.set(connectionId, connection);
        this.connectionMetrics.set(connectionId, metricsCollector);

        // Subscribe to connection errors
        connection.errors$.pipe(
            takeUntil(this.destroyed$)
        ).subscribe(error => this.errorsSubject.next(error));

        // Start metrics collection
        metricsCollector.start(connection.dataFlow$);

        return connection;
    }

    /**
     * Destroys a connection and cleans up resources
     */
    destroyConnection(connectionId: string): void {
        const connection = this.connections.get(connectionId);
        const metrics = this.connectionMetrics.get(connectionId);

        if (connection) {
            connection.destroy();
            this.connections.delete(connectionId);
        }

        if (metrics) {
            metrics.stop();
            this.connectionMetrics.delete(connectionId);
        }
    }

    /**
     * Gets connection metrics for monitoring and debugging
     */
    getConnectionMetrics(connectionId: string): ConnectionMetrics | undefined {
        return this.connectionMetrics.get(connectionId)?.getMetrics();
    }

    /**
     * Gets all connections for a specific node
     */
    getNodeConnections(nodeId: string): ConnectionHandle[] {
        return Array.from(this.connections.values()).filter(
            conn => conn.sourceNode === nodeId || conn.targetNode === nodeId
        );
    }

    /**
     * Observable stream of all connection errors
     */
    get errors$(): Observable<MacroError> {
        return this.errorsSubject.asObservable();
    }

    /**
     * Validates that two ports can be connected
     */
    private validatePortCompatibility(
        sourcePort: MacroPortDefinition,
        targetPort: MacroPortDefinition
    ): void {
        // Check data type compatibility
        if (!this.areDataTypesCompatible(sourcePort.dataType, targetPort.dataType)) {
            throw new Error(
                `Incompatible data types: ${sourcePort.dataType} -> ${targetPort.dataType}`
            );
        }

        // Check multiplicity constraints
        if (!sourcePort.multiple && !targetPort.multiple) {
            // One-to-one connections are always valid
            return;
        }

        // Additional validation logic for multiple connections
    }

    private areDataTypesCompatible(sourceType: MacroDataType, targetType: MacroDataType): boolean {
        // Exact match
        if (sourceType === targetType) {
            return true;
        }

        // Generic type accepts anything
        if (targetType === 'generic') {
            return true;
        }

        // Define compatible type mappings
        const compatibilityMap: Record<MacroDataType, MacroDataType[]> = {
            'midi_event': ['generic'],
            'control_value': ['generic'],
            'note_sequence': ['generic', 'midi_event'],
            'audio_stream': ['generic'],
            'parameter_map': ['generic'],
            'trigger_signal': ['generic'],
            'generic': [] // Generic can accept but not convert to specific types
        };

        return compatibilityMap[sourceType]?.includes(targetType) ?? false;
    }

    private generateConnectionId(): string {
        return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Cleanup all connections and resources
     */
    destroy(): void {
        this.destroyed$.next();
        this.destroyed$.complete();

        // Destroy all connections
        for (const connection of this.connections.values()) {
            connection.destroy();
        }
        this.connections.clear();

        // Stop all metrics collectors
        for (const metrics of this.connectionMetrics.values()) {
            metrics.stop();
        }
        this.connectionMetrics.clear();

        this.errorsSubject.complete();
    }
}

// ========================================
// Reactive Connection Implementation
// ========================================

class ReactiveConnection implements ConnectionHandle {
    private readonly enabledSubject = new BehaviorSubject<boolean>(true);
    private readonly dataFlowSubject = new Subject<ConnectionDataFlow>();
    private readonly errorsSubject = new Subject<MacroError>();
    private readonly destroyed$ = new Subject<void>();
    private subscription?: Subscription;

    private readonly metricsData = {
        messagesTransmitted: 0,
        bytesTransmitted: 0,
        errors: 0,
        latencies: [] as number[]
    };

    constructor(
        public readonly id: string,
        public readonly sourceNode: string,
        public readonly sourcePort: string,
        public readonly targetNode: string,
        public readonly targetPort: string,
        private readonly sourcePortImpl: MacroOutputPort,
        private readonly targetPortImpl: MacroInputPort,
        private readonly config: Required<ConnectionPerformanceConfig>
    ) {
        this.initializeDataFlow();
    }

    get enabled(): boolean {
        return this.enabledSubject.value;
    }

    get dataFlow$(): Observable<ConnectionDataFlow> {
        return this.dataFlowSubject.asObservable();
    }

    get errors$(): Observable<MacroError> {
        return this.errorsSubject.asObservable();
    }

    get metrics(): ConnectionMetrics {
        const latencies = this.metricsData.latencies;
        return {
            messagesTransmitted: this.metricsData.messagesTransmitted,
            bytesTransmitted: this.metricsData.bytesTransmitted,
            errors: this.metricsData.errors,
            latency: {
                min: Math.min(...latencies, Infinity),
                max: Math.max(...latencies, -Infinity),
                average: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0
            }
        };
    }

    enable(): void {
        if (!this.enabled) {
            this.enabledSubject.next(true);
            this.initializeDataFlow();
        }
    }

    disable(): void {
        if (this.enabled) {
            this.enabledSubject.next(false);
            this.subscription?.unsubscribe();
        }
    }

    destroy(): void {
        this.destroyed$.next();
        this.destroyed$.complete();
        
        this.subscription?.unsubscribe();
        this.enabledSubject.complete();
        this.dataFlowSubject.complete();
        this.errorsSubject.complete();
    }

    private initializeDataFlow(): void {
        if (this.subscription && !this.subscription.closed) {
            return; // Already initialized
        }

        const dataStream = this.sourcePortImpl.observable.pipe(
            // Only process when connection is enabled
            filter(() => this.enabled),
            
            // Apply backpressure strategy
            this.applyBackpressureStrategy(),
            
            // Add latency monitoring
            tap(data => this.measureLatency(() => this.processData(data))),
            
            // Error handling with retry
            catchError(error => {
                this.handleError(error);
                return this.config.errorRetryCount > 0 ? 
                    this.sourcePortImpl.observable.pipe(retry(this.config.errorRetryCount)) : 
                    EMPTY;
            }),
            
            // Cleanup on destroy
            takeUntil(this.destroyed$)
        );

        this.subscription = dataStream.subscribe({
            next: data => this.processData(data),
            error: error => this.handleError(error)
        });
    }

    private applyBackpressureStrategy() {
        switch (this.config.backpressureStrategy) {
            case 'drop':
                return throttleTime(1); // Drop excess messages
            case 'buffer':
                return bufferTime(10); // Buffer messages for batch processing
            case 'throttle':
                return throttleTime(this.config.maxLatencyMs / 2); // Throttle to maintain latency
            default:
                return tap(); // No backpressure handling
        }
    }

    private processData(data: any): void {
        try {
            const startTime = performance.now();
            
            // Validate data if needed
            const validation = this.targetPortImpl.validate(data);
            if (!validation.valid) {
                throw new Error(`Data validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
            }

            // Process data through target port
            this.targetPortImpl.process(data);

            // Update metrics
            this.metricsData.messagesTransmitted++;
            this.metricsData.bytesTransmitted += this.estimateDataSize(data);
            
            const latency = performance.now() - startTime;
            this.metricsData.latencies.push(latency);
            
            // Keep only recent latency measurements
            if (this.metricsData.latencies.length > 1000) {
                this.metricsData.latencies.splice(0, 500); // Keep last 500
            }

            // Emit data flow event for monitoring
            this.dataFlowSubject.next({
                connectionId: this.id,
                data,
                timestamp: new Date(),
                latency,
                size: this.estimateDataSize(data)
            });

            // Check latency warning
            if (latency > this.config.maxLatencyMs) {
                this.handleError(new Error(`High latency detected: ${latency}ms > ${this.config.maxLatencyMs}ms`));
            }

        } catch (error) {
            this.handleError(error);
        }
    }

    private measureLatency<T>(fn: () => T): T {
        const start = performance.now();
        const result = fn();
        const latency = performance.now() - start;
        
        this.metricsData.latencies.push(latency);
        return result;
    }

    private handleError(error: any): void {
        this.metricsData.errors++;
        
        const macroError: MacroError = {
            id: `${this.id}_error_${Date.now()}`,
            nodeId: this.targetNode,
            connectionId: this.id,
            type: 'connection',
            message: error.message || 'Connection error',
            details: error,
            timestamp: new Date(),
            stack: error.stack
        };

        this.errorsSubject.next(macroError);
    }

    private estimateDataSize(data: any): number {
        if (typeof data === 'string') {
            return data.length * 2; // Approximate UTF-16 byte size
        }
        if (typeof data === 'object') {
            return JSON.stringify(data).length * 2; // Rough estimate
        }
        return 8; // Default for primitives
    }
}

// ========================================
// Connection Metrics Collection
// ========================================

class ConnectionMetricsCollector {
    private subscription?: Subscription;
    private readonly metricsSubject = new BehaviorSubject<ConnectionMetrics>({
        messagesTransmitted: 0,
        bytesTransmitted: 0,
        errors: 0,
        latency: { min: 0, max: 0, average: 0 }
    });

    constructor(
        private readonly connectionId: string,
        private readonly collectionInterval: number
    ) {}

    start(dataFlow$: Observable<ConnectionDataFlow>): void {
        if (this.subscription && !this.subscription.closed) {
            return; // Already started
        }

        this.subscription = dataFlow$.pipe(
            bufferTime(this.collectionInterval),
            filter(flows => flows.length > 0),
            map(flows => this.aggregateMetrics(flows))
        ).subscribe(metrics => this.metricsSubject.next(metrics));
    }

    stop(): void {
        this.subscription?.unsubscribe();
        this.metricsSubject.complete();
    }

    getMetrics(): ConnectionMetrics {
        return this.metricsSubject.value;
    }

    private aggregateMetrics(flows: ConnectionDataFlow[]): ConnectionMetrics {
        const messagesTransmitted = flows.length;
        const bytesTransmitted = flows.reduce((sum, flow) => sum + flow.size, 0);
        const latencies = flows.map(flow => flow.latency);
        
        return {
            messagesTransmitted,
            bytesTransmitted,
            errors: 0, // Would be tracked separately
            latency: {
                min: Math.min(...latencies),
                max: Math.max(...latencies),
                average: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
            }
        };
    }
}

// ========================================
// Connection Builder Pattern
// ========================================

/**
 * Fluent builder for creating optimized connections
 */
export class ConnectionBuilder {
    private options: ConnectionOptions = {};

    constructor(
        private manager: ReactiveConnectionManager,
        private sourceNode: ConnectableMacroHandler,
        private sourcePort: string
    ) {}

    to(targetNode: ConnectableMacroHandler, targetPort: string): ConnectionBuilder {
        this.targetNode = targetNode;
        this.targetPort = targetPort;
        return this;
    }

    withBackpressure(strategy: BackpressureStrategy): ConnectionBuilder {
        this.options.backpressureStrategy = strategy;
        return this;
    }

    withMaxLatency(ms: number): ConnectionBuilder {
        this.options.maxLatencyMs = ms;
        return this;
    }

    withErrorRecovery(handler: (error: MacroError) => void): ConnectionBuilder {
        this.options.errorHandler = handler;
        return this;
    }

    withValidation(validator: (data: any) => ValidationResult): ConnectionBuilder {
        this.options.dataValidator = validator;
        return this;
    }

    withTransform<T, U>(transformer: (data: T) => U): ConnectionBuilder {
        this.options.dataTransformer = transformer;
        return this;
    }

    create(): ConnectionHandle {
        if (!this.targetNode || !this.targetPort) {
            throw new Error('Target node and port must be specified');
        }

        return this.manager.createConnection(
            this.sourceNode,
            this.sourcePort,
            this.targetNode,
            this.targetPort,
            this.options
        );
    }

    private targetNode?: ConnectableMacroHandler;
    private targetPort?: string;
}

// ========================================
// Type Definitions
// ========================================

export interface ConnectionPerformanceConfig {
    maxLatencyMs?: number;
    backpressureStrategy?: BackpressureStrategy;
    errorRetryCount?: number;
    metricsCollectionInterval?: number;
}

export interface ConnectionOptions extends ConnectionPerformanceConfig {
    errorHandler?: (error: MacroError) => void;
    dataValidator?: (data: any) => ValidationResult;
    dataTransformer?: (data: any) => any;
}

export type BackpressureStrategy = 'drop' | 'buffer' | 'throttle' | 'none';

export interface ConnectionDataFlow {
    connectionId: string;
    data: any;
    timestamp: Date;
    latency: number;
    size: number;
}

// ========================================
// Real-time Performance Monitor
// ========================================

/**
 * Monitors connection performance in real-time for MIDI applications
 */
export class RealTimePerformanceMonitor {
    private readonly performanceSubject = new BehaviorSubject<PerformanceSnapshot>({
        timestamp: new Date(),
        totalConnections: 0,
        activeConnections: 0,
        averageLatency: 0,
        maxLatency: 0,
        errorRate: 0,
        throughput: 0
    });

    constructor(private connectionManager: ReactiveConnectionManager) {
        // Monitor performance every 100ms for real-time feedback
        setInterval(() => this.collectPerformanceSnapshot(), 100);
    }

    get performance$(): Observable<PerformanceSnapshot> {
        return this.performanceSubject.asObservable();
    }

    private collectPerformanceSnapshot(): void {
        // Implementation would collect real metrics from connection manager
        const snapshot: PerformanceSnapshot = {
            timestamp: new Date(),
            totalConnections: 0,
            activeConnections: 0,
            averageLatency: 0,
            maxLatency: 0,
            errorRate: 0,
            throughput: 0
        };

        this.performanceSubject.next(snapshot);
    }
}

export interface PerformanceSnapshot {
    timestamp: Date;
    totalConnections: number;
    activeConnections: number;
    averageLatency: number;
    maxLatency: number;
    errorRate: number;
    throughput: number; // Messages per second
}