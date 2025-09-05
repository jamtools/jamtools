import React from 'react';

import '../io/io_module';

import type {Module} from 'springboard/module_registry/module_registry';

import {CoreDependencies, ModuleDependencies} from 'springboard/types/module_types';
import {MacroConfigItem, MacroTypeConfigs} from './macro_module_types';
import {BaseModule, ModuleHookValue} from 'springboard/modules/base_module/base_module';
import {MacroPage} from './macro_page';
import springboard from 'springboard';
import {CapturedRegisterMacroTypeCall, MacroAPI, MacroCallback} from '@jamtools/core/modules/macro_module/registered_macro_types';
import {ModuleAPI} from 'springboard/engine/module_api';

import './macro_handlers';
import {macroTypeRegistry} from './registered_macro_types';

// Import dynamic system components
import {DynamicMacroManager} from './dynamic_macro_manager';
import {LegacyMacroAdapter} from './legacy_compatibility';
import {
  DynamicMacroAPI,
  MacroWorkflowConfig,
  WorkflowTemplateType,
  WorkflowTemplateConfigs,
  ValidationResult,
  FlowTestResult,
  MacroTypeDefinition
} from './dynamic_macro_types';

type ModuleId = string;

export type MacroConfigState = {
  configs: Record<ModuleId, Record<string, {type: keyof MacroTypeConfigs}>>;
  producedMacros: Record<ModuleId, Record<string, any>>;
  // Dynamic workflow state
  workflows: Record<string, MacroWorkflowConfig>;
  dynamicEnabled: boolean;
};

type MacroHookValue = ModuleHookValue<EnhancedMacroModule>;

const macroContext = React.createContext<MacroHookValue>({} as MacroHookValue);

springboard.registerClassModule((coreDeps: CoreDependencies, modDependencies: ModuleDependencies) => {
  return new EnhancedMacroModule(coreDeps, modDependencies);
});

declare module 'springboard/module_registry/module_registry' {
  interface AllModules {
    macro: EnhancedMacroModule;
  }
}

/**
 * Enhanced Macro Module that provides both legacy compatibility and dynamic workflow capabilities.
 * 
 * Features:
 * - 100% backward compatibility with existing createMacro() API
 * - Dynamic workflow system for advanced users
 * - Hot reloading and runtime reconfiguration
 * - Template system for common patterns
 * - Comprehensive validation and testing
 */
export class EnhancedMacroModule implements Module<MacroConfigState>, DynamicMacroAPI {
  moduleId = 'macro';

  registeredMacroTypes: CapturedRegisterMacroTypeCall[] = [];
  
  // Dynamic system components
  private dynamicManager: DynamicMacroManager | null = null;
  private legacyAdapter: LegacyMacroAdapter | null = null;
  private dynamicEnabled = false;

  private localMode = false;

  /**
   * This is used to determine if MIDI devices should be used client-side.
   */
  public setLocalMode = (mode: boolean) => {
    this.localMode = mode;
  };

  constructor(private coreDeps: CoreDependencies, private moduleDeps: ModuleDependencies) { }

  routes = {
    '': {
      component: () => {
        const mod = EnhancedMacroModule.use();
        return <MacroPage state={mod.state || this.state} />;
      },
    },
  };

  state: MacroConfigState = {
    configs: {},
    producedMacros: {},
    workflows: {},
    dynamicEnabled: false,
  };

  // =============================================================================
  // LEGACY API (BACKWARD COMPATIBLE)
  // =============================================================================

  public createMacro = async <MacroType extends keyof MacroTypeConfigs, T extends MacroConfigItem<MacroType>>(
    moduleAPI: ModuleAPI,
    name: string,
    macroType: MacroType,
    config: T
  ): Promise<MacroTypeConfigs[MacroType]['output']> => {
    // If dynamic system is enabled, use the legacy adapter
    if (this.dynamicEnabled && this.legacyAdapter) {
      return this.legacyAdapter.createMacro(moduleAPI, name, macroType, config);
    }

    // Otherwise, use original implementation
    return this.createMacroLegacy(moduleAPI, name, macroType, config);
  };

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
    // If dynamic system is enabled, use the legacy adapter
    if (this.dynamicEnabled && this.legacyAdapter) {
      return this.legacyAdapter.createMacros(moduleAPI, macros);
    }

    // Otherwise, use original implementation
    return this.createMacrosLegacy(moduleAPI, macros);
  };

  // =============================================================================
  // DYNAMIC WORKFLOW API
  // =============================================================================

  async createWorkflow(config: MacroWorkflowConfig): Promise<string> {
    this.ensureDynamicSystemEnabled();
    const workflowId = await this.dynamicManager!.createWorkflow(config);
    
    // Update state
    this.state.workflows = { ...this.state.workflows, [workflowId]: config };
    this.setState({ workflows: this.state.workflows });
    
    return workflowId;
  }

  async updateWorkflow(id: string, config: MacroWorkflowConfig): Promise<void> {
    this.ensureDynamicSystemEnabled();
    await this.dynamicManager!.updateWorkflow(id, config);
    
    // Update state
    this.state.workflows = { ...this.state.workflows, [id]: config };
    this.setState({ workflows: this.state.workflows });
  }

  async deleteWorkflow(id: string): Promise<void> {
    this.ensureDynamicSystemEnabled();
    await this.dynamicManager!.deleteWorkflow(id);
    
    // Update state
    const { [id]: deleted, ...remainingWorkflows } = this.state.workflows;
    this.state.workflows = remainingWorkflows;
    this.setState({ workflows: this.state.workflows });
  }

  getWorkflow(id: string): MacroWorkflowConfig | null {
    return this.state.workflows[id] || null;
  }

  listWorkflows(): MacroWorkflowConfig[] {
    return Object.values(this.state.workflows);
  }

  // Template system
  async createWorkflowFromTemplate<T extends WorkflowTemplateType>(
    templateId: T,
    config: WorkflowTemplateConfigs[T]
  ): Promise<string> {
    this.ensureDynamicSystemEnabled();
    const workflowId = await this.dynamicManager!.createWorkflowFromTemplate(templateId, config);
    
    // Refresh workflow state
    const workflowConfig = this.dynamicManager!.getWorkflow(workflowId);
    if (workflowConfig) {
      this.state.workflows = { ...this.state.workflows, [workflowId]: workflowConfig };
      this.setState({ workflows: this.state.workflows });
    }
    
    return workflowId;
  }

  getAvailableTemplates() {
    this.ensureDynamicSystemEnabled();
    return this.dynamicManager!.getAvailableTemplates();
  }

  // Runtime control
  async enableWorkflow(id: string): Promise<void> {
    this.ensureDynamicSystemEnabled();
    await this.dynamicManager!.enableWorkflow(id);
    
    // Update state
    if (this.state.workflows[id]) {
      this.state.workflows[id].enabled = true;
      this.setState({ workflows: this.state.workflows });
    }
  }

  async disableWorkflow(id: string): Promise<void> {
    this.ensureDynamicSystemEnabled();
    await this.dynamicManager!.disableWorkflow(id);
    
    // Update state
    if (this.state.workflows[id]) {
      this.state.workflows[id].enabled = false;
      this.setState({ workflows: this.state.workflows });
    }
  }

  async reloadWorkflow(id: string): Promise<void> {
    this.ensureDynamicSystemEnabled();
    await this.dynamicManager!.reloadWorkflow(id);
  }

  async reloadAllWorkflows(): Promise<void> {
    this.ensureDynamicSystemEnabled();
    await this.dynamicManager!.reloadAllWorkflows();
  }

  // Validation
  async validateWorkflow(config: MacroWorkflowConfig): Promise<ValidationResult> {
    this.ensureDynamicSystemEnabled();
    return this.dynamicManager!.validateWorkflow(config);
  }

  async testWorkflow(config: MacroWorkflowConfig): Promise<FlowTestResult> {
    this.ensureDynamicSystemEnabled();
    return this.dynamicManager!.testWorkflow(config);
  }

  // Legacy compatibility
  async migrateLegacyMacro(legacyInfo: any) {
    this.ensureDynamicSystemEnabled();
    return this.legacyAdapter!.migrateLegacyMacro(legacyInfo);
  }

  async migrateAllLegacyMacros() {
    this.ensureDynamicSystemEnabled();
    return this.legacyAdapter!.migrateAllLegacyMacros();
  }

  // Type definitions
  getMacroTypeDefinition(typeId: keyof MacroTypeConfigs): MacroTypeDefinition | undefined {
    this.ensureDynamicSystemEnabled();
    return this.dynamicManager!.getMacroTypeDefinition(typeId);
  }

  getAllMacroTypeDefinitions(): MacroTypeDefinition[] {
    this.ensureDynamicSystemEnabled();
    return this.dynamicManager!.getAllMacroTypeDefinitions();
  }

  registerMacroTypeDefinition(definition: MacroTypeDefinition): void {
    this.ensureDynamicSystemEnabled();
    this.dynamicManager!.registerMacroTypeDefinition(definition);
  }

  // =============================================================================
  // ENHANCED FEATURES
  // =============================================================================

  /**
   * Enable the dynamic workflow system. Can be called at runtime.
   */
  public enableDynamicSystem = async (): Promise<void> => {
    if (this.dynamicEnabled) {
      return;
    }

    try {
      // Create macro API for dynamic system
      const macroAPI: MacroAPI = {
        midiIO: this.createMockModuleAPI().getModule('io'),
        createAction: this.createMockModuleAPI().createAction,
        statesAPI: {
          createSharedState: (key: string, defaultValue: any) => {
            const func = this.localMode ? 
              this.createMockModuleAPI().statesAPI.createUserAgentState : 
              this.createMockModuleAPI().statesAPI.createSharedState;
            return func(key, defaultValue);
          },
          createPersistentState: (key: string, defaultValue: any) => {
            const func = this.localMode ? 
              this.createMockModuleAPI().statesAPI.createUserAgentState : 
              this.createMockModuleAPI().statesAPI.createPersistentState;
            return func(key, defaultValue);
          },
        },
        createMacro: this.createMacro,
        isMidiMaestro: () => this.coreDeps.isMaestro() || this.localMode,
        moduleAPI: this.createMockModuleAPI(),
        onDestroy: (cb: () => void) => {
          this.createMockModuleAPI().onDestroy(cb);
        },
      };

      // Initialize dynamic system
      this.dynamicManager = new DynamicMacroManager(macroAPI, 'enhanced_macro_workflows');
      this.legacyAdapter = new LegacyMacroAdapter(this.dynamicManager, macroAPI);
      
      await this.dynamicManager.initialize();

      // Register existing macro types with the dynamic system
      await this.registerLegacyMacroTypesWithDynamicSystem();

      this.dynamicEnabled = true;
      this.setState({ dynamicEnabled: true });

      console.log('Dynamic macro system enabled successfully');

    } catch (error) {
      console.error('Failed to enable dynamic macro system:', error);
      throw error;
    }
  };

  /**
   * Get system status and statistics
   */
  public getSystemStatus = () => {
    return {
      dynamicEnabled: this.dynamicEnabled,
      legacyMacrosCount: Object.keys(this.state.configs).reduce(
        (total, moduleId) => total + Object.keys(this.state.configs[moduleId]).length,
        0
      ),
      workflowsCount: Object.keys(this.state.workflows).length,
      activeWorkflowsCount: Object.values(this.state.workflows).filter(w => w.enabled).length,
      registeredMacroTypesCount: this.registeredMacroTypes.length,
      legacyCompatibilityReport: this.legacyAdapter?.getCompatibilityReport() || null,
      legacyStats: this.legacyAdapter?.getLegacyMacroStats() || null
    };
  };

  /**
   * Get comprehensive usage analytics
   */
  public getAnalytics = () => {
    if (!this.dynamicEnabled) {
      return { error: 'Dynamic system not enabled' };
    }

    return {
      workflows: this.listWorkflows().map(w => ({
        id: w.id,
        name: w.name,
        enabled: w.enabled,
        nodeCount: w.macros.length,
        connectionCount: w.connections.length,
        created: w.created,
        modified: w.modified
      })),
      templates: this.getAvailableTemplates().map(t => ({
        id: t.id,
        name: t.name,
        category: t.category
      })),
      macroTypes: this.getAllMacroTypeDefinitions().map(def => ({
        id: def.id,
        category: def.category,
        displayName: def.displayName
      }))
    };
  };

  // =============================================================================
  // LEGACY IMPLEMENTATION (PRESERVED FOR COMPATIBILITY)
  // =============================================================================

  private async createMacroLegacy<MacroType extends keyof MacroTypeConfigs, T extends MacroConfigItem<MacroType>>(
    moduleAPI: ModuleAPI,
    name: string,
    macroType: MacroType,
    config: T
  ): Promise<MacroTypeConfigs[MacroType]['output']> {
    const moduleId = moduleAPI.moduleId;

    const tempConfig = {[name]: {...config, type: macroType}};
    this.state.configs = {...this.state.configs, [moduleId]: {...this.state.configs[moduleId], ...tempConfig}};

    const result = await this.createMacroFromConfigItem(moduleAPI, macroType, config, name);

    this.state.producedMacros = {...this.state.producedMacros, [moduleId]: {...this.state.producedMacros[moduleId], [name]: result}};

    if (!result) {
      const errorMessage = `Error: unknown macro type '${macroType}'`;
      this.coreDeps.showError(errorMessage);
    }

    return result!;
  }

  private async createMacrosLegacy<
    MacroConfigs extends {
      [K in string]: {
        type: keyof MacroTypeConfigs;
      } & (
        {[T in keyof MacroTypeConfigs]: {type: T; config: MacroTypeConfigs[T]['input']}}[keyof MacroTypeConfigs]
      )
    }
  >(moduleAPI: ModuleAPI, macros: MacroConfigs): Promise<{
    [K in keyof MacroConfigs]: MacroTypeConfigs[MacroConfigs[K]['type']]['output'];
  }> {
    const keys = Object.keys(macros);
    const promises = keys.map(async key => {
      const {type, config} = macros[key];
      return {
        macro: await this.createMacroLegacy(moduleAPI, key, type, config),
        key,
      };
    });

    const result = {} as {[K in keyof MacroConfigs]: MacroTypeConfigs[MacroConfigs[K]['type']]['output']};

    const createdMacros = await Promise.all(promises);
    for (const key of keys) {
      (result[key] as any) = createdMacros.find(m => m.key === key)!.macro;
    }

    return result;
  }

  // =============================================================================
  // ORIGINAL MODULE IMPLEMENTATION
  // =============================================================================

  public registerMacroType = <MacroTypeOptions extends object, MacroInputConf extends object, MacroReturnValue extends object>(
    macroName: string,
    options: MacroTypeOptions,
    cb: MacroCallback<MacroInputConf, MacroReturnValue>,
  ) => {
    this.registeredMacroTypes.push([macroName, options, cb]);
  };

  initialize = async () => {
    const registeredMacroCallbacks = (macroTypeRegistry.registerMacroType as unknown as {calls: CapturedRegisterMacroTypeCall[]}).calls || [];
    macroTypeRegistry.registerMacroType = this.registerMacroType;

    for (const macroType of registeredMacroCallbacks) {
      this.registerMacroType(...macroType);
    }

    const allConfigs = {...this.state.configs};
    const allProducedMacros = {...this.state.producedMacros};
    this.setState({configs: allConfigs, producedMacros: allProducedMacros});

    // Auto-enable dynamic system in development/advanced mode
    if (this.shouldAutoEnableDynamicSystem()) {
      try {
        await this.enableDynamicSystem();
      } catch (error) {
        console.warn('Failed to auto-enable dynamic system:', error);
        // Continue with legacy system only
      }
    }
  };

  private createMacroFromConfigItem = async <MacroType extends keyof MacroTypeConfigs>(
    moduleAPI: ModuleAPI,
    macroType: MacroType,
    conf: MacroConfigItem<typeof macroType>,
    fieldName: string
  ): Promise<MacroTypeConfigs[MacroType]['output'] | undefined> => {
    const registeredMacroType = this.registeredMacroTypes.find(mt => mt[0] === macroType);
    if (!registeredMacroType) {
      return undefined;
    }

    const macroAPI: MacroAPI = {
      midiIO: moduleAPI.getModule('io'),
      createAction: (...args) => {
        const action = moduleAPI.createAction(...args);
        return (args: any) => action(args, this.localMode ? {mode: 'local'} : undefined);
      },
      statesAPI: {
        createSharedState: (key: string, defaultValue: any) => {
          const func = this.localMode ? moduleAPI.statesAPI.createUserAgentState : moduleAPI.statesAPI.createSharedState;
          return func(key, defaultValue);
        },
        createPersistentState: (key: string, defaultValue: any) => {
          const func = this.localMode ? moduleAPI.statesAPI.createUserAgentState : moduleAPI.statesAPI.createPersistentState;
          return func(key, defaultValue);
        },
      },
      createMacro: this.createMacro,
      isMidiMaestro: () => this.coreDeps.isMaestro() || this.localMode,
      moduleAPI,
      onDestroy: (cb: () => void) => {
        moduleAPI.onDestroy(cb);
      },
    };

    const result = await registeredMacroType[2](macroAPI, conf, fieldName);
    return result;
  };

  Provider: React.ElementType = BaseModule.Provider(this, macroContext);
  static use = BaseModule.useModule(macroContext);
  private setState = BaseModule.setState(this);

  // =============================================================================
  // PRIVATE UTILITIES
  // =============================================================================

  private ensureDynamicSystemEnabled(): void {
    if (!this.dynamicEnabled) {
      throw new Error('Dynamic macro system is not enabled. Call enableDynamicSystem() first.');
    }
  }

  private shouldAutoEnableDynamicSystem(): boolean {
    // Auto-enable in development or when certain conditions are met
    return process.env.NODE_ENV === 'development' || 
           this.coreDeps.isMaestro() ||
           false; // Can be configured based on user preferences
  }

  private createMockModuleAPI(): ModuleAPI {
    // Create a mock ModuleAPI for the dynamic system
    // In a real implementation, this would be properly integrated
    return {
      moduleId: 'enhanced_macro',
      getModule: (moduleId: string) => {
        // Return mock modules
        return {} as any;
      },
      createAction: (...args) => {
        return () => {};
      },
      statesAPI: {
        createSharedState: (key: string, defaultValue: any) => {
          return { getState: () => defaultValue, setState: () => {} } as any;
        },
        createPersistentState: (key: string, defaultValue: any) => {
          return { getState: () => defaultValue, setState: () => {} } as any;
        },
        createUserAgentState: (key: string, defaultValue: any) => {
          return { getState: () => defaultValue, setState: () => {} } as any;
        },
      },
      onDestroy: (cb: () => void) => {
        // Register cleanup callback
      }
    } as any;
  }

  private async registerLegacyMacroTypesWithDynamicSystem(): Promise<void> {
    if (!this.dynamicManager) return;

    // Convert registered macro types to dynamic macro type definitions
    for (const [macroName, options, callback] of this.registeredMacroTypes) {
      const definition: MacroTypeDefinition = {
        id: macroName as keyof MacroTypeConfigs,
        displayName: macroName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Legacy macro type: ${macroName}`,
        category: macroName.includes('input') ? 'input' : 
                  macroName.includes('output') ? 'output' : 'utility',
        configSchema: {
          type: 'object',
          properties: {},
          additionalProperties: true
        }
      };

      this.dynamicManager.registerMacroTypeDefinition(definition);
    }
  }

  // =============================================================================
  // LIFECYCLE
  // =============================================================================

  async destroy(): Promise<void> {
    if (this.dynamicManager) {
      await this.dynamicManager.destroy();
    }
  }
}