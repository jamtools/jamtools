import {
    MacroWorkflowConfig,
    MacroNodeConfig,
    MacroConnectionConfig,
    MacroTypeDefinition,
    ValidationResult,
    ValidationError,
    ValidationWarning,
    WorkflowTemplate,
    JSONSchema7
} from './dynamic_macro_types';
import {MacroTypeConfigs} from './macro_module_types';

// ========================================
// Workflow Validation Framework
// ========================================

/**
 * Comprehensive validation framework for workflow configurations
 */
export class WorkflowValidator {
    constructor(
        private macroTypeDefinitions: Map<keyof MacroTypeConfigs, MacroTypeDefinition>
    ) {}

    /**
     * Validates a complete workflow configuration
     */
    async validateWorkflow(config: MacroWorkflowConfig): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // Basic structure validation
        this.validateWorkflowStructure(config, errors);
        
        // Node validation
        await this.validateNodes(config.nodes, errors, warnings);
        
        // Connection validation
        this.validateConnections(config.connections, config.nodes, errors, warnings);
        
        // Circular dependency detection
        this.detectCircularDependencies(config, errors);
        
        // Performance validation
        this.validatePerformanceConstraints(config, warnings);
        
        // Semantic validation
        this.validateWorkflowSemantics(config, warnings);

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validates workflow template definitions
     */
    validateTemplate(template: WorkflowTemplate): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // Template structure validation
        this.validateTemplateStructure(template, errors);
        
        // Schema validation
        this.validateTemplateSchema(template, errors);
        
        // Node type availability
        this.validateTemplateNodeTypes(template, errors);

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    // ========================================
    // Workflow Structure Validation
    // ========================================

    private validateWorkflowStructure(config: MacroWorkflowConfig, errors: ValidationError[]): void {
        // Required fields
        if (!config.id) {
            errors.push({
                path: 'id',
                message: 'Workflow ID is required',
                code: 'MISSING_ID',
                severity: 'error'
            });
        }

        if (!config.name) {
            errors.push({
                path: 'name',
                message: 'Workflow name is required',
                code: 'MISSING_NAME',
                severity: 'error'
            });
        }

        if (!config.version) {
            errors.push({
                path: 'version',
                message: 'Workflow version is required',
                code: 'MISSING_VERSION',
                severity: 'error'
            });
        }

        // ID format validation
        if (config.id && !/^[a-zA-Z0-9_-]+$/.test(config.id)) {
            errors.push({
                path: 'id',
                message: 'Workflow ID must contain only alphanumeric characters, underscores, and hyphens',
                code: 'INVALID_ID_FORMAT',
                severity: 'error'
            });
        }

        // Version format validation
        if (config.version && !/^\d+\.\d+\.\d+$/.test(config.version)) {
            errors.push({
                path: 'version',
                message: 'Version must follow semantic versioning format (x.y.z)',
                code: 'INVALID_VERSION_FORMAT',
                severity: 'error'
            });
        }

        // Arrays should exist
        if (!Array.isArray(config.nodes)) {
            errors.push({
                path: 'nodes',
                message: 'Nodes must be an array',
                code: 'INVALID_NODES_TYPE',
                severity: 'error'
            });
        }

        if (!Array.isArray(config.connections)) {
            errors.push({
                path: 'connections',
                message: 'Connections must be an array',
                code: 'INVALID_CONNECTIONS_TYPE',
                severity: 'error'
            });
        }
    }

    // ========================================
    // Node Validation
    // ========================================

    private async validateNodes(
        nodes: MacroNodeConfig[], 
        errors: ValidationError[], 
        warnings: ValidationWarning[]
    ): Promise<void> {
        const nodeIds = new Set<string>();

        for (const [index, node] of nodes.entries()) {
            const basePath = `nodes[${index}]`;
            
            // Required fields
            if (!node.id) {
                errors.push({
                    path: `${basePath}.id`,
                    message: 'Node ID is required',
                    code: 'MISSING_NODE_ID',
                    severity: 'error'
                });
                continue;
            }

            // Duplicate ID check
            if (nodeIds.has(node.id)) {
                errors.push({
                    path: `${basePath}.id`,
                    message: `Duplicate node ID: ${node.id}`,
                    code: 'DUPLICATE_NODE_ID',
                    severity: 'error'
                });
            } else {
                nodeIds.add(node.id);
            }

            // Node type validation
            if (!node.type) {
                errors.push({
                    path: `${basePath}.type`,
                    message: 'Node type is required',
                    code: 'MISSING_NODE_TYPE',
                    severity: 'error'
                });
                continue;
            }

            const typeDefinition = this.macroTypeDefinitions.get(node.type);
            if (!typeDefinition) {
                errors.push({
                    path: `${basePath}.type`,
                    message: `Unknown macro type: ${node.type}`,
                    code: 'UNKNOWN_MACRO_TYPE',
                    severity: 'error'
                });
                continue;
            }

            // Position validation
            if (!node.position) {
                warnings.push({
                    path: `${basePath}.position`,
                    message: 'Node position not specified, will use default',
                    code: 'MISSING_POSITION',
                    severity: 'warning'
                });
            } else {
                if (typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
                    errors.push({
                        path: `${basePath}.position`,
                        message: 'Position must have numeric x and y coordinates',
                        code: 'INVALID_POSITION',
                        severity: 'error'
                    });
                }
            }

            // Configuration validation
            await this.validateNodeConfiguration(node, typeDefinition, `${basePath}.config`, errors, warnings);
        }
    }

    private async validateNodeConfiguration(
        node: MacroNodeConfig,
        definition: MacroTypeDefinition,
        path: string,
        errors: ValidationError[],
        warnings: ValidationWarning[]
    ): Promise<void> {
        if (!node.config) {
            if (definition.configSchema.required && definition.configSchema.required.length > 0) {
                errors.push({
                    path,
                    message: 'Node configuration is required',
                    code: 'MISSING_CONFIGURATION',
                    severity: 'error'
                });
            }
            return;
        }

        // Validate against JSON schema
        const validation = this.validateAgainstSchema(node.config, definition.configSchema);
        
        for (const error of validation.errors) {
            errors.push({
                path: `${path}.${error.path}`,
                message: error.message,
                code: error.code,
                severity: 'error'
            });
        }

        for (const warning of validation.warnings) {
            warnings.push({
                path: `${path}.${warning.path}`,
                message: warning.message,
                code: warning.code,
                severity: 'warning'
            });
        }
    }

    // ========================================
    // Connection Validation
    // ========================================

    private validateConnections(
        connections: MacroConnectionConfig[],
        nodes: MacroNodeConfig[],
        errors: ValidationError[],
        warnings: ValidationWarning[]
    ): void {
        const nodeMap = new Map(nodes.map(node => [node.id, node]));
        const connectionIds = new Set<string>();

        for (const [index, connection] of connections.entries()) {
            const basePath = `connections[${index}]`;

            // Required fields
            if (!connection.id) {
                errors.push({
                    path: `${basePath}.id`,
                    message: 'Connection ID is required',
                    code: 'MISSING_CONNECTION_ID',
                    severity: 'error'
                });
                continue;
            }

            // Duplicate connection ID check
            if (connectionIds.has(connection.id)) {
                errors.push({
                    path: `${basePath}.id`,
                    message: `Duplicate connection ID: ${connection.id}`,
                    code: 'DUPLICATE_CONNECTION_ID',
                    severity: 'error'
                });
            } else {
                connectionIds.add(connection.id);
            }

            // Node existence validation
            const sourceNode = nodeMap.get(connection.sourceNodeId);
            const targetNode = nodeMap.get(connection.targetNodeId);

            if (!sourceNode) {
                errors.push({
                    path: `${basePath}.sourceNodeId`,
                    message: `Source node not found: ${connection.sourceNodeId}`,
                    code: 'SOURCE_NODE_NOT_FOUND',
                    severity: 'error'
                });
                continue;
            }

            if (!targetNode) {
                errors.push({
                    path: `${basePath}.targetNodeId`,
                    message: `Target node not found: ${connection.targetNodeId}`,
                    code: 'TARGET_NODE_NOT_FOUND',
                    severity: 'error'
                });
                continue;
            }

            // Port validation
            this.validateConnectionPorts(
                connection,
                sourceNode,
                targetNode,
                basePath,
                errors,
                warnings
            );

            // Self-connection check
            if (connection.sourceNodeId === connection.targetNodeId) {
                warnings.push({
                    path: basePath,
                    message: 'Self-connection detected, may cause feedback loops',
                    code: 'SELF_CONNECTION',
                    severity: 'warning'
                });
            }
        }
    }

    private validateConnectionPorts(
        connection: MacroConnectionConfig,
        sourceNode: MacroNodeConfig,
        targetNode: MacroNodeConfig,
        basePath: string,
        errors: ValidationError[],
        warnings: ValidationWarning[]
    ): void {
        const sourceDefinition = this.macroTypeDefinitions.get(sourceNode.type);
        const targetDefinition = this.macroTypeDefinitions.get(targetNode.type);

        if (!sourceDefinition || !targetDefinition) {
            return; // Skip port validation if type definitions are missing
        }

        // Source port validation
        const sourcePort = sourceDefinition.outputs.find(p => p.id === connection.sourcePort);
        if (!sourcePort) {
            errors.push({
                path: `${basePath}.sourcePort`,
                message: `Source port '${connection.sourcePort}' not found on node type '${sourceNode.type}'`,
                code: 'SOURCE_PORT_NOT_FOUND',
                severity: 'error'
            });
            return;
        }

        // Target port validation
        const targetPort = targetDefinition.inputs.find(p => p.id === connection.targetPort);
        if (!targetPort) {
            errors.push({
                path: `${basePath}.targetPort`,
                message: `Target port '${connection.targetPort}' not found on node type '${targetNode.type}'`,
                code: 'TARGET_PORT_NOT_FOUND',
                severity: 'error'
            });
            return;
        }

        // Data type compatibility validation
        if (!this.areDataTypesCompatible(sourcePort.dataType, targetPort.dataType)) {
            errors.push({
                path: basePath,
                message: `Incompatible data types: ${sourcePort.dataType} -> ${targetPort.dataType}`,
                code: 'INCOMPATIBLE_DATA_TYPES',
                severity: 'error'
            });
        }

        // Required port connection validation
        if (targetPort.required) {
            // This would need to be checked at the workflow level to ensure all required inputs are connected
        }
    }

    // ========================================
    // Circular Dependency Detection
    // ========================================

    private detectCircularDependencies(config: MacroWorkflowConfig, errors: ValidationError[]): void {
        const graph = this.buildDependencyGraph(config);
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        for (const nodeId of graph.keys()) {
            if (!visited.has(nodeId)) {
                const cycle = this.detectCycle(nodeId, graph, visited, recursionStack, []);
                if (cycle.length > 0) {
                    errors.push({
                        path: 'connections',
                        message: `Circular dependency detected: ${cycle.join(' -> ')}`,
                        code: 'CIRCULAR_DEPENDENCY',
                        severity: 'error'
                    });
                }
            }
        }
    }

    private buildDependencyGraph(config: MacroWorkflowConfig): Map<string, string[]> {
        const graph = new Map<string, string[]>();

        // Initialize all nodes
        for (const node of config.nodes) {
            graph.set(node.id, []);
        }

        // Add dependencies based on connections
        for (const connection of config.connections) {
            const dependencies = graph.get(connection.targetNodeId) || [];
            dependencies.push(connection.sourceNodeId);
            graph.set(connection.targetNodeId, dependencies);
        }

        return graph;
    }

    private detectCycle(
        nodeId: string,
        graph: Map<string, string[]>,
        visited: Set<string>,
        recursionStack: Set<string>,
        path: string[]
    ): string[] {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        path.push(nodeId);

        const dependencies = graph.get(nodeId) || [];
        for (const dependency of dependencies) {
            if (!visited.has(dependency)) {
                const cycle = this.detectCycle(dependency, graph, visited, recursionStack, [...path]);
                if (cycle.length > 0) {
                    return cycle;
                }
            } else if (recursionStack.has(dependency)) {
                // Found cycle
                const cycleStart = path.indexOf(dependency);
                return path.slice(cycleStart).concat(dependency);
            }
        }

        recursionStack.delete(nodeId);
        return [];
    }

    // ========================================
    // Performance Validation
    // ========================================

    private validatePerformanceConstraints(config: MacroWorkflowConfig, warnings: ValidationWarning[]): void {
        // Check for potential performance issues

        // Too many connections from one node
        const outgoingConnections = new Map<string, number>();
        for (const connection of config.connections) {
            const count = outgoingConnections.get(connection.sourceNodeId) || 0;
            outgoingConnections.set(connection.sourceNodeId, count + 1);
        }

        for (const [nodeId, count] of outgoingConnections) {
            if (count > 10) {
                warnings.push({
                    path: `nodes.${nodeId}`,
                    message: `Node has ${count} outgoing connections, may impact performance`,
                    code: 'HIGH_CONNECTION_COUNT',
                    severity: 'warning'
                });
            }
        }

        // Deep connection chains
        const maxDepth = this.calculateMaxConnectionDepth(config);
        if (maxDepth > 10) {
            warnings.push({
                path: 'connections',
                message: `Connection chain depth is ${maxDepth}, may introduce latency`,
                code: 'DEEP_CONNECTION_CHAIN',
                severity: 'warning'
            });
        }

        // High node count
        if (config.nodes.length > 50) {
            warnings.push({
                path: 'nodes',
                message: `Workflow has ${config.nodes.length} nodes, may impact performance`,
                code: 'HIGH_NODE_COUNT',
                severity: 'warning'
            });
        }
    }

    private calculateMaxConnectionDepth(config: MacroWorkflowConfig): number {
        const graph = this.buildDependencyGraph(config);
        let maxDepth = 0;

        for (const nodeId of graph.keys()) {
            const depth = this.calculateNodeDepth(nodeId, graph, new Set());
            maxDepth = Math.max(maxDepth, depth);
        }

        return maxDepth;
    }

    private calculateNodeDepth(nodeId: string, graph: Map<string, string[]>, visited: Set<string>): number {
        if (visited.has(nodeId)) {
            return 0; // Avoid infinite recursion in cycles
        }

        visited.add(nodeId);
        const dependencies = graph.get(nodeId) || [];
        
        if (dependencies.length === 0) {
            return 1; // Leaf node
        }

        let maxDependencyDepth = 0;
        for (const dependency of dependencies) {
            const depth = this.calculateNodeDepth(dependency, graph, new Set(visited));
            maxDependencyDepth = Math.max(maxDependencyDepth, depth);
        }

        return maxDependencyDepth + 1;
    }

    // ========================================
    // Semantic Validation
    // ========================================

    private validateWorkflowSemantics(config: MacroWorkflowConfig, warnings: ValidationWarning[]): void {
        // Check for orphaned nodes (no connections)
        const connectedNodes = new Set<string>();
        for (const connection of config.connections) {
            connectedNodes.add(connection.sourceNodeId);
            connectedNodes.add(connection.targetNodeId);
        }

        for (const node of config.nodes) {
            if (!connectedNodes.has(node.id)) {
                warnings.push({
                    path: `nodes.${node.id}`,
                    message: `Node '${node.customName || node.id}' has no connections`,
                    code: 'ORPHANED_NODE',
                    severity: 'warning'
                });
            }
        }

        // Check for input nodes without outputs
        const inputTypes = ['midi_control_change_input', 'midi_button_input', 'musical_keyboard_input'];
        const outputTypes = ['midi_control_change_output', 'midi_button_output', 'musical_keyboard_output'];

        const hasInputs = config.nodes.some(node => inputTypes.includes(node.type as string));
        const hasOutputs = config.nodes.some(node => outputTypes.includes(node.type as string));

        if (hasInputs && !hasOutputs) {
            warnings.push({
                path: 'nodes',
                message: 'Workflow has input nodes but no output nodes',
                code: 'NO_OUTPUT_NODES',
                severity: 'warning'
            });
        }

        if (hasOutputs && !hasInputs) {
            warnings.push({
                path: 'nodes',
                message: 'Workflow has output nodes but no input nodes',
                code: 'NO_INPUT_NODES',
                severity: 'warning'
            });
        }
    }

    // ========================================
    // Template Validation
    // ========================================

    private validateTemplateStructure(template: WorkflowTemplate, errors: ValidationError[]): void {
        if (!template.id) {
            errors.push({
                path: 'id',
                message: 'Template ID is required',
                code: 'MISSING_TEMPLATE_ID',
                severity: 'error'
            });
        }

        if (!template.name) {
            errors.push({
                path: 'name',
                message: 'Template name is required',
                code: 'MISSING_TEMPLATE_NAME',
                severity: 'error'
            });
        }

        if (!template.schema) {
            errors.push({
                path: 'schema',
                message: 'Template schema is required',
                code: 'MISSING_TEMPLATE_SCHEMA',
                severity: 'error'
            });
        }

        if (!template.configSchema) {
            errors.push({
                path: 'configSchema',
                message: 'Template configuration schema is required',
                code: 'MISSING_CONFIG_SCHEMA',
                severity: 'error'
            });
        }
    }

    private validateTemplateSchema(template: WorkflowTemplate, errors: ValidationError[]): void {
        if (!template.schema) return;

        // Validate schema structure
        if (!template.schema.nodes || typeof template.schema.nodes !== 'object') {
            errors.push({
                path: 'schema.nodes',
                message: 'Template schema must have a nodes object',
                code: 'INVALID_SCHEMA_NODES',
                severity: 'error'
            });
        }

        if (!Array.isArray(template.schema.connections)) {
            errors.push({
                path: 'schema.connections',
                message: 'Template schema must have a connections array',
                code: 'INVALID_SCHEMA_CONNECTIONS',
                severity: 'error'
            });
        }
    }

    private validateTemplateNodeTypes(template: WorkflowTemplate, errors: ValidationError[]): void {
        if (!template.schema || !template.schema.nodes) return;

        for (const [nodeId, nodeConfig] of Object.entries(template.schema.nodes)) {
            if (!this.macroTypeDefinitions.has(nodeConfig.type)) {
                errors.push({
                    path: `schema.nodes.${nodeId}.type`,
                    message: `Unknown macro type in template: ${nodeConfig.type}`,
                    code: 'UNKNOWN_TEMPLATE_MACRO_TYPE',
                    severity: 'error'
                });
            }
        }
    }

    // ========================================
    // Utility Methods
    // ========================================

    private validateAgainstSchema(value: any, schema: JSONSchema7): { errors: ValidationError[], warnings: ValidationWarning[] } {
        // This is a simplified schema validation
        // In a real implementation, use a library like Ajv
        return { errors: [], warnings: [] };
    }

    private areDataTypesCompatible(sourceType: string, targetType: string): boolean {
        // Simplified compatibility check
        // In real implementation, this would be more sophisticated
        return sourceType === targetType || targetType === 'generic';
    }
}

// ========================================
// Validation Rule Engine
// ========================================

/**
 * Extensible validation rule system for custom validation logic
 */
export class ValidationRuleEngine {
    private rules: ValidationRule[] = [];

    addRule(rule: ValidationRule): void {
        this.rules.push(rule);
    }

    removeRule(ruleId: string): void {
        this.rules = this.rules.filter(rule => rule.id !== ruleId);
    }

    async validateWorkflow(config: MacroWorkflowConfig): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        for (const rule of this.rules) {
            try {
                const result = await rule.validate(config);
                errors.push(...result.errors);
                warnings.push(...result.warnings);
            } catch (error) {
                errors.push({
                    path: 'validation',
                    message: `Validation rule '${rule.id}' failed: ${error.message}`,
                    code: 'VALIDATION_RULE_ERROR',
                    severity: 'error'
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
}

export interface ValidationRule {
    id: string;
    name: string;
    description: string;
    validate(config: MacroWorkflowConfig): Promise<ValidationResult> | ValidationResult;
}

// ========================================
// Built-in Validation Rules
// ========================================

export const builtInValidationRules: ValidationRule[] = [
    {
        id: 'midi_device_availability',
        name: 'MIDI Device Availability',
        description: 'Check if referenced MIDI devices are available',
        validate: async (config: MacroWorkflowConfig): Promise<ValidationResult> => {
            // Implementation would check actual MIDI device availability
            return { valid: true, errors: [], warnings: [] };
        }
    },
    {
        id: 'resource_usage',
        name: 'Resource Usage',
        description: 'Check for potential resource usage issues',
        validate: (config: MacroWorkflowConfig): ValidationResult => {
            const warnings: ValidationWarning[] = [];
            
            if (config.nodes.length > 20) {
                warnings.push({
                    path: 'nodes',
                    message: 'High node count may impact CPU usage',
                    code: 'HIGH_CPU_USAGE_RISK',
                    severity: 'warning'
                });
            }

            return { valid: true, errors: [], warnings };
        }
    }
];