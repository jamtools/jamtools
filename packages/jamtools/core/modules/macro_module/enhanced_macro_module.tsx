import React from 'react';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {map, takeUntil} from 'rxjs/operators';

import type {Module} from 'springboard/module_registry/module_registry';
import {CoreDependencies, ModuleDependencies} from 'springboard/types/module_types';
import {BaseModule, ModuleHookValue} from 'springboard/modules/base_module/base_module';
import {ModuleAPI} from 'springboard/engine/module_api';
import springboard from 'springboard';

// Legacy imports
import {MacroConfigItem, MacroTypeConfigs} from './macro_module_types';
import {CapturedRegisterMacroTypeCall, MacroAPI, MacroCallback} from './registered_macro_types';
import {macroTypeRegistry} from './registered_macro_types';

// New dynamic system imports
import {DynamicMacroManager, DynamicMacroManagerOptions} from './dynamic_macro_manager';
import {LegacyMacroAdapter, MacroMigrationService} from './legacy_compatibility';
import {ReactiveConnectionManager} from './reactive_connection_system';
import {WorkflowValidator} from './workflow_validation';
import {
    MacroWorkflowConfig,
    MacroWorkflowInstance,
    MacroTypeDefinition,
    WorkflowTemplate,
    WorkflowPreset,
    ValidationResult,
    WorkflowError
} from './dynamic_macro_types';

// Import all existing handlers to maintain compatibility
import './macro_handlers';

// ========================================
// Enhanced Macro Module State
// ========================================

export interface EnhancedMacroConfigState {
    // Legacy state for backward compatibility
    configs: Record<string, Record<string, {type: keyof MacroTypeConfigs}>>;
    producedMacros: Record<string, Record<string, any>>;
    
    // New dynamic workflow state
    workflows: Record<string, MacroWorkflowConfig>;
    workflowInstances: Record<string, 'running' | 'stopped' | 'error'>;
    templates: Record<string, WorkflowTemplate>;
    presets: Record<string, WorkflowPreset>;
    
    // System state
    migrationStatus: 'not_started' | 'in_progress' | 'completed' | 'failed';
    validationErrors: Record<string, ValidationResult>;
}

type EnhancedMacroHookValue = ModuleHookValue<EnhancedMacroModule>;

const enhancedMacroContext = React.createContext<EnhancedMacroHookValue>({} as EnhancedMacroHookValue);

// ========================================
// Enhanced Macro Module Implementation
// ========================================

/**
 * Enhanced macro module that provides both legacy compatibility and new dynamic workflow system
 */
export class EnhancedMacroModule implements Module<EnhancedMacroConfigState> {
    moduleId = 'macro';

    // Legacy system components
    registeredMacroTypes: CapturedRegisterMacroTypeCall[] = [];
    private localMode = false;

    // New dynamic system components
    private dynamicMacroManager!: DynamicMacroManager;
    private legacyAdapter!: LegacyMacroAdapter;
    private connectionManager!: ReactiveConnectionManager;
    private workflowValidator!: WorkflowValidator;
    private migrationService!: MacroMigrationService;

    // Observables for reactive UI
    private readonly workflowsSubject = new BehaviorSubject<Map<string, MacroWorkflowInstance>>(new Map());
    private readonly errorsSubject = new Subject<WorkflowError>();
    private readonly destroyed$ = new Subject<void>();

    // State management
    state: EnhancedMacroConfigState = {
        // Legacy state
        configs: {},
        producedMacros: {},
        
        // New dynamic state
        workflows: {},
        workflowInstances: {},
        templates: {},
        presets: {},
        
        // System state
        migrationStatus: 'not_started',
        validationErrors: {}
    };

    constructor(private coreDeps: CoreDependencies, private moduleDeps: ModuleDependencies) {}

    // ========================================
    // Module Lifecycle
    // ========================================

    initialize = async () => {
        // Initialize legacy macro type registry
        const registeredMacroCallbacks = (macroTypeRegistry.registerMacroType as unknown as {calls: CapturedRegisterMacroTypeCall[]}).calls || [];
        macroTypeRegistry.registerMacroType = this.registerMacroType;

        for (const macroType of registeredMacroCallbacks) {
            this.registerMacroType(...macroType);
        }

        // Initialize dynamic system components
        await this.initializeDynamicSystem();

        // Set up state synchronization
        this.setupStateSync();

        // Load persisted workflows
        await this.loadPersistedWorkflows();

        // Create common templates
        this.createCommonTemplates();

        // Update state
        const allConfigs = {...this.state.configs};
        const allProducedMacros = {...this.state.producedMacros};
        this.setState({
            ...this.state,
            configs: allConfigs,
            producedMacros: allProducedMacros
        });
    };

    private async initializeDynamicSystem(): Promise<void> {
        // Create macro type definitions from legacy registered types
        const macroTypeDefinitions = this.createMacroTypeDefinitions();

        // Initialize connection manager
        this.connectionManager = new ReactiveConnectionManager();

        // Initialize workflow validator
        this.workflowValidator = new WorkflowValidator(macroTypeDefinitions);

        // Initialize dynamic macro manager
        const managerOptions: DynamicMacroManagerOptions = {
            validationProvider: this.workflowValidator,
            persistenceProvider: this.createPersistenceProvider()
        };

        this.dynamicMacroManager = new DynamicMacroManager(
            this.createMacroAPI(),
            managerOptions
        );

        // Register macro type definitions
        for (const [typeId, definition] of macroTypeDefinitions) {
            this.dynamicMacroManager.registerMacroTypeDefinition(definition);
        }

        // Initialize legacy adapter
        const legacyRegisteredTypes = new Map(
            this.registeredMacroTypes.map(([name, options, callback]) => [name, [options, callback]])
        );
        this.legacyAdapter = new LegacyMacroAdapter(this.dynamicMacroManager, legacyRegisteredTypes);

        // Initialize migration service
        this.migrationService = new MacroMigrationService(this.dynamicMacroManager);
    }

    private setupStateSync(): void {
        // Sync workflow state changes to module state
        this.dynamicMacroManager.workflows$.pipe(
            takeUntil(this.destroyed$)
        ).subscribe(workflows => {
            this.workflowsSubject.next(workflows);
            
            const workflowConfigs: Record<string, MacroWorkflowConfig> = {};
            const workflowInstances: Record<string, 'running' | 'stopped' | 'error'> = {};

            for (const [id, instance] of workflows) {
                workflowConfigs[id] = instance.config;
                workflowInstances[id] = instance.state.status === 'running' ? 'running' : 
                                       instance.state.status === 'error' ? 'error' : 'stopped';
            }

            this.setState({
                ...this.state,
                workflows: workflowConfigs,
                workflowInstances
            });
        });

        // Sync errors
        this.dynamicMacroManager.errors$.pipe(
            takeUntil(this.destroyed$)
        ).subscribe(error => {
            this.errorsSubject.next(error);
            this.coreDeps.showError(`Workflow Error: ${error.message}`);
        });
    }

    // ========================================
    // Legacy API (Backward Compatibility)
    // ========================================

    /**
     * Legacy createMacro API - routes through new system but maintains exact same interface
     */
    public createMacro = async <T extends keyof MacroTypeConfigs>(
        moduleAPI: ModuleAPI,
        name: string,
        macroType: T,
        config: MacroTypeConfigs[T]['input']
    ): Promise<MacroTypeConfigs[T]['output']> => {
        return this.legacyAdapter.createMacro(moduleAPI, name, macroType, config);
    };

    /**
     * Legacy batch creation API
     */
    public createMacros = async <
        MacroConfigs extends {
            [K in string]: {
                type: keyof MacroTypeConfigs;
            } & (
                {[T in keyof MacroTypeConfigs]: {type: T; config: MacroTypeConfigs[T]['input']}}[keyof MacroTypeConfigs]
            )
        }
    >(moduleAPI: ModuleAPI, macros: MacroConfigs): Promise<{
        [K in keyof MacroConfigs]: MacroTypeConfigs[MacroConfigs[K]['type']]['output'];
    }> => {
        return this.legacyAdapter.createMacros(moduleAPI, macros);
    };

    /**
     * Legacy macro type registration
     */
    public registerMacroType = <MacroTypeOptions extends object, MacroInputConf extends object, MacroReturnValue extends object>(
        macroName: string,
        options: MacroTypeOptions,
        cb: MacroCallback<MacroInputConf, MacroReturnValue>,
    ) => {
        this.registeredMacroTypes.push([macroName, options, cb]);
    };

    /**
     * Legacy local mode setting
     */
    public setLocalMode = (mode: boolean) => {
        this.localMode = mode;
    };

    // ========================================
    // New Dynamic Workflow API
    // ========================================

    /**
     * Creates a new workflow from configuration
     */
    public async createWorkflow(config: MacroWorkflowConfig): Promise<string> {
        const workflowId = await this.dynamicMacroManager.createWorkflow(config);
        return workflowId;
    }

    /**
     * Updates an existing workflow
     */
    public async updateWorkflow(id: string, config: MacroWorkflowConfig): Promise<void> {
        await this.dynamicMacroManager.updateWorkflow(id, config);
    }

    /**
     * Deletes a workflow
     */
    public async deleteWorkflow(id: string): Promise<void> {
        await this.dynamicMacroManager.deleteWorkflow(id);
    }

    /**
     * Creates a workflow from a template
     */
    public async createWorkflowFromTemplate(
        templateId: string,
        parameters: any,
        name?: string
    ): Promise<string> {
        return this.dynamicMacroManager.createWorkflowFromTemplate(templateId, parameters, name);
    }

    /**
     * Validates a workflow configuration
     */
    public async validateWorkflow(config: MacroWorkflowConfig): Promise<ValidationResult> {
        return this.workflowValidator.validateWorkflow(config);
    }

    /**
     * Gets all active workflows
     */
    public getWorkflows(): ReadonlyMap<string, MacroWorkflowInstance> {
        return this.workflowsSubject.value;
    }

    /**
     * Gets workflow by ID
     */
    public getWorkflow(id: string): MacroWorkflowInstance | undefined {
        return this.workflowsSubject.value.get(id);
    }

    /**
     * Observable stream of all workflows
     */
    public get workflows$(): Observable<ReadonlyMap<string, MacroWorkflowInstance>> {
        return this.workflowsSubject.asObservable();
    }

    /**
     * Observable stream of workflow errors
     */
    public get workflowErrors$(): Observable<WorkflowError> {
        return this.errorsSubject.asObservable();
    }

    // ========================================
    // Template and Preset Management
    // ========================================

    /**
     * Registers a workflow template
     */
    public registerTemplate(template: WorkflowTemplate): void {
        this.dynamicMacroManager.registerWorkflowTemplate(template);
        
        const templates = {...this.state.templates, [template.id]: template};
        this.setState({...this.state, templates});
    }

    /**
     * Gets all available templates
     */
    public getTemplates(): Record<string, WorkflowTemplate> {
        return this.state.templates;
    }

    /**
     * Gets template by ID
     */
    public getTemplate(id: string): WorkflowTemplate | undefined {
        return this.state.templates[id];
    }

    // ========================================
    // Migration Utilities
    // ========================================

    /**
     * Migrates legacy macro configurations to workflows
     */
    public async migrateLegacyMacros(): Promise<void> {
        this.setState({...this.state, migrationStatus: 'in_progress'});

        try {
            // Get all legacy macro configurations
            const legacyConfigs = this.state.configs;
            
            for (const [moduleId, moduleMacros] of Object.entries(legacyConfigs)) {
                for (const [macroName, macroConfig] of Object.entries(moduleMacros)) {
                    await this.migrationService.migrateLegacyMacroToWorkflow(
                        moduleId,
                        macroName,
                        macroConfig.type,
                        macroConfig
                    );
                }
            }

            this.setState({...this.state, migrationStatus: 'completed'});
        } catch (error) {
            this.setState({...this.state, migrationStatus: 'failed'});
            throw error;
        }
    }

    // ========================================
    // UI Components and Routes
    // ========================================

    routes = {
        '': {
            component: () => {
                const mod = EnhancedMacroModule.use();
                return <EnhancedMacroPage module={mod} />;
            },
        },
        'workflows': {
            component: () => {
                const mod = EnhancedMacroModule.use();
                return <WorkflowManagementPage module={mod} />;
            },
        },
        'templates': {
            component: () => {
                const mod = EnhancedMacroModule.use();
                return <TemplateManagementPage module={mod} />;
            },
        },
        'legacy': {
            component: () => {
                const mod = EnhancedMacroModule.use();
                return <LegacyMacroPage module={mod} />;
            },
        }
    };

    // ========================================
    // Private Utility Methods
    // ========================================

    private createMacroTypeDefinitions(): Map<keyof MacroTypeConfigs, MacroTypeDefinition> {
        const definitions = new Map<keyof MacroTypeConfigs, MacroTypeDefinition>();

        // Create definitions from legacy registered types
        for (const [macroName, options, callback] of this.registeredMacroTypes) {
            const definition: MacroTypeDefinition = {
                id: macroName as keyof MacroTypeConfigs,
                displayName: this.formatDisplayName(macroName),
                description: `Legacy macro type: ${macroName}`,
                category: this.inferCategory(macroName),
                configSchema: {
                    type: 'object',
                    properties: {},
                    additionalProperties: true
                },
                inputs: this.inferPorts(macroName, 'input'),
                outputs: this.inferPorts(macroName, 'output'),
                metadata: {
                    version: '1.0.0',
                    tags: ['legacy'],
                    author: 'jamtools'
                }
            };

            definitions.set(macroName as keyof MacroTypeConfigs, definition);
        }

        return definitions;
    }

    private formatDisplayName(macroName: string): string {
        return macroName.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    private inferCategory(macroName: string): any {
        if (macroName.includes('input')) return 'input';
        if (macroName.includes('output')) return 'output';
        return 'utility';
    }

    private inferPorts(macroName: string, type: 'input' | 'output'): any[] {
        // Simplified port inference - in real implementation, this would be more sophisticated
        if (type === 'input' && macroName.includes('output')) {
            return [{
                id: 'default',
                name: 'Data Input',
                type: 'input',
                dataType: 'generic',
                required: true
            }];
        }
        if (type === 'output' && macroName.includes('input')) {
            return [{
                id: 'default',
                name: 'Data Output',
                type: 'output',
                dataType: 'generic',
                required: false
            }];
        }
        return [];
    }

    private createMacroAPI(): MacroAPI {
        return {
            moduleAPI: {} as ModuleAPI, // Would be properly initialized
            midiIO: {} as any, // Would get actual IO module
            statesAPI: {} as any, // Would get actual states API
            createAction: {} as any,
            isMidiMaestro: () => this.coreDeps.isMaestro() || this.localMode,
            onDestroy: () => {},
            createMacro: this.createMacro
        };
    }

    private createPersistenceProvider() {
        return {
            saveWorkflows: async (workflows: MacroWorkflowConfig[]) => {
                // Save to persistent storage
                const workflowData = workflows.reduce((acc, workflow) => {
                    acc[workflow.id] = workflow;
                    return acc;
                }, {} as Record<string, MacroWorkflowConfig>);

                // Use Springboard's persistent state
                // await this.coreDeps.storage.set('macro_workflows', workflowData);
            },
            loadWorkflows: async (): Promise<MacroWorkflowConfig[]> => {
                // Load from persistent storage
                // const workflowData = await this.coreDeps.storage.get('macro_workflows', {});
                // return Object.values(workflowData);
                return [];
            }
        };
    }

    private async loadPersistedWorkflows(): Promise<void> {
        try {
            await this.dynamicMacroManager.loadWorkflowsFromStorage();
        } catch (error) {
            console.warn('Failed to load persisted workflows:', error);
        }
    }

    private createCommonTemplates(): void {
        const templates = this.migrationService.createCommonWorkflowTemplates();
        for (const template of templates) {
            this.registerTemplate(template);
        }
    }

    // ========================================
    // Module Infrastructure
    // ========================================

    Provider: React.ElementType = BaseModule.Provider(this, enhancedMacroContext);
    static use = BaseModule.useModule(enhancedMacroContext);
    private setState = BaseModule.setState(this);

    /**
     * Cleanup resources on module destruction
     */
    destroy = async () => {
        this.destroyed$.next();
        this.destroyed$.complete();

        await this.dynamicMacroManager?.destroy();
        this.connectionManager?.destroy();
        
        this.workflowsSubject.complete();
        this.errorsSubject.complete();
    };
}

// ========================================
// UI Components (Simplified)
// ========================================

const EnhancedMacroPage: React.FC<{module: EnhancedMacroHookValue}> = ({module}) => {
    return (
        <div>
            <h1>Enhanced Macro System</h1>
            <div>
                <h2>Legacy Macros</h2>
                <p>Active legacy macros: {Object.keys(module.state?.producedMacros || {}).length}</p>
            </div>
            <div>
                <h2>Dynamic Workflows</h2>
                <p>Active workflows: {Object.keys(module.state?.workflows || {}).length}</p>
            </div>
            <div>
                <h2>Migration Status</h2>
                <p>Status: {module.state?.migrationStatus}</p>
            </div>
        </div>
    );
};

const WorkflowManagementPage: React.FC<{module: EnhancedMacroHookValue}> = ({module}) => {
    return (
        <div>
            <h1>Workflow Management</h1>
            {/* Workflow builder UI would go here */}
        </div>
    );
};

const TemplateManagementPage: React.FC<{module: EnhancedMacroHookValue}> = ({module}) => {
    return (
        <div>
            <h1>Template Management</h1>
            {/* Template management UI would go here */}
        </div>
    );
};

const LegacyMacroPage: React.FC<{module: EnhancedMacroHookValue}> = ({module}) => {
    return (
        <div>
            <h1>Legacy Macro Management</h1>
            {/* Legacy macro UI would go here */}
        </div>
    );
};

// ========================================
// Module Registration
// ========================================

springboard.registerClassModule((coreDeps: CoreDependencies, modDependencies: ModuleDependencies) => {
    return new EnhancedMacroModule(coreDeps, modDependencies);
});

declare module 'springboard/module_registry/module_registry' {
    interface AllModules {
        macro: EnhancedMacroModule;
    }
}