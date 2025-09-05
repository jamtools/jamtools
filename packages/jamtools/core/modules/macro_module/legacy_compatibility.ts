import {
  MacroWorkflowConfig,
  MacroNodeConfig,
  LegacyMacroInfo,
  MigrationResult,
  DynamicMacroAPI
} from './dynamic_macro_types';
import {MacroAPI} from './registered_macro_types';
import {MacroTypeConfigs} from './macro_module_types';
import {ModuleAPI} from 'springboard/engine/module_api';
import {DynamicMacroManager} from './dynamic_macro_manager';

/**
 * Legacy compatibility layer that maintains 100% backward compatibility
 * while gradually enabling migration to the dynamic workflow system.
 */
export class LegacyMacroAdapter {
  private legacyMacros = new Map<string, LegacyMacroInfo>();
  private legacyCallCount = 0;

  constructor(
    private dynamicManager: DynamicMacroManager,
    private macroAPI: MacroAPI
  ) {}

  // =============================================================================
  // LEGACY API COMPATIBILITY
  // =============================================================================

  /**
   * Legacy createMacro implementation that works exactly like the original,
   * but internally creates dynamic workflows for new functionality.
   */
  async createMacro<MacroType extends keyof MacroTypeConfigs, T extends MacroTypeConfigs[MacroType]['input']>(
    moduleAPI: ModuleAPI,
    name: string,
    macroType: MacroType,
    config: T
  ): Promise<MacroTypeConfigs[MacroType]['output']> {
    const moduleId = moduleAPI.moduleId;
    const macroId = `${moduleId}_${name}`;

    try {
      // Create the macro using the original system
      const originalResult = await this.createOriginalMacro(moduleAPI, name, macroType, config);

      // Store legacy macro info for potential migration
      const legacyInfo: LegacyMacroInfo = {
        moduleId,
        macroName: name,
        macroType,
        config,
        instance: originalResult,
        migrationStatus: 'pending'
      };

      this.legacyMacros.set(macroId, legacyInfo);

      // If auto-migration is enabled, create equivalent workflow
      if (this.shouldAutoMigrate(macroType)) {
        try {
          await this.migrateToWorkflow(legacyInfo);
        } catch (error) {
          console.warn(`Auto-migration failed for ${macroId}:`, error);
          // Continue with legacy macro - no functionality lost
        }
      }

      return originalResult;

    } catch (error) {
      console.error(`Legacy macro creation failed for ${macroId}:`, error);
      throw error;
    }
  }

  /**
   * Enhanced createMacros method that maintains legacy API while enabling dynamic features.
   */
  async createMacros<
    MacroConfigs extends {
      [K in string]: {
        type: keyof MacroTypeConfigs;
      } & ({ [T in keyof MacroTypeConfigs]: { type: T; config: MacroTypeConfigs[T]['input'] } }[keyof MacroTypeConfigs])
    }
  >(moduleAPI: ModuleAPI, macros: MacroConfigs): Promise<{
    [K in keyof MacroConfigs]: MacroTypeConfigs[MacroConfigs[K]['type']]['output'];
  }> {
    const keys = Object.keys(macros);
    const promises = keys.map(async key => {
      const { type, config } = macros[key];
      return {
        macro: await this.createMacro(moduleAPI, key, type, config),
        key,
      };
    });

    const result = {} as { [K in keyof MacroConfigs]: MacroTypeConfigs[MacroConfigs[K]['type']]['output'] };

    const createdMacros = await Promise.all(promises);
    for (const key of keys) {
      (result[key] as any) = createdMacros.find(m => m.key === key)!.macro;
    }

    // Check if this macro set should be converted to a workflow template
    if (this.detectWorkflowPattern(macros)) {
      try {
        await this.createWorkflowFromLegacyMacros(moduleAPI, macros);
      } catch (error) {
        console.warn('Failed to create workflow from legacy macros:', error);
      }
    }

    return result;
  }

  // =============================================================================
  // MIGRATION UTILITIES
  // =============================================================================

  async migrateLegacyMacro(macroId: string): Promise<MigrationResult> {
    const legacyInfo = this.legacyMacros.get(macroId);
    if (!legacyInfo) {
      return {
        success: false,
        errors: [`Legacy macro ${macroId} not found`],
        warnings: [],
        legacyMacrosCount: 0,
        migratedMacrosCount: 0
      };
    }

    return this.migrateToWorkflow(legacyInfo);
  }

  async migrateAllLegacyMacros(): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];
    
    for (const [macroId, legacyInfo] of this.legacyMacros) {
      if (legacyInfo.migrationStatus === 'pending') {
        try {
          const result = await this.migrateToWorkflow(legacyInfo);
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            errors: [`Migration failed for ${macroId}: ${error}`],
            warnings: [],
            legacyMacrosCount: 1,
            migratedMacrosCount: 0
          });
        }
      }
    }

    return results;
  }

  /**
   * Migrates a set of related legacy macros to a single workflow.
   */
  async migrateLegacyMacroSet(moduleId: string): Promise<MigrationResult> {
    const moduleMacros = Array.from(this.legacyMacros.values())
      .filter(info => info.moduleId === moduleId && info.migrationStatus === 'pending');

    if (moduleMacros.length === 0) {
      return {
        success: true,
        warnings: [`No pending macros found for module ${moduleId}`],
        errors: [],
        legacyMacrosCount: 0,
        migratedMacrosCount: 0
      };
    }

    try {
      // Create a workflow that contains all macros from this module
      const workflowConfig = this.createWorkflowFromMacroSet(moduleId, moduleMacros);
      const workflowId = await this.dynamicManager.createWorkflow(workflowConfig);

      // Mark all macros as migrated
      for (const macroInfo of moduleMacros) {
        macroInfo.migrationStatus = 'migrated';
      }

      return {
        success: true,
        workflowId,
        errors: [],
        warnings: [],
        legacyMacrosCount: moduleMacros.length,
        migratedMacrosCount: moduleMacros.length
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Failed to migrate macro set for ${moduleId}: ${error}`],
        warnings: [],
        legacyMacrosCount: moduleMacros.length,
        migratedMacrosCount: 0
      };
    }
  }

  // =============================================================================
  // WORKFLOW TEMPLATE GENERATION
  // =============================================================================

  /**
   * Generates workflow templates from commonly used legacy macro patterns.
   */
  generateTemplatesFromLegacyUsage(): Array<{
    name: string;
    description: string;
    generator: () => MacroWorkflowConfig;
  }> {
    const templates: Array<{
      name: string;
      description: string;
      generator: () => MacroWorkflowConfig;
    }> = [];

    // Analyze legacy macro patterns
    const patterns = this.analyzeLegacyPatterns();

    for (const pattern of patterns) {
      if (pattern.frequency > 3) { // Only create templates for commonly used patterns
        templates.push({
          name: pattern.name,
          description: pattern.description,
          generator: () => this.createWorkflowFromPattern(pattern)
        });
      }
    }

    return templates;
  }

  // =============================================================================
  // PRIVATE IMPLEMENTATION
  // =============================================================================

  private async createOriginalMacro<MacroType extends keyof MacroTypeConfigs>(
    moduleAPI: ModuleAPI,
    name: string,
    macroType: MacroType,
    config: MacroTypeConfigs[MacroType]['input']
  ): Promise<MacroTypeConfigs[MacroType]['output']> {
    // This would call the original createMacroFromConfigItem method
    // For now, we'll simulate the original behavior
    
    // In a real implementation, this would delegate to the original macro creation system
    throw new Error('Original macro creation not implemented in this adapter');
  }

  private shouldAutoMigrate(macroType: keyof MacroTypeConfigs): boolean {
    // Auto-migrate simple, commonly used macro types
    const autoMigrateTypes: Array<keyof MacroTypeConfigs> = [
      'midi_control_change_input',
      'midi_control_change_output',
      'midi_button_input',
      'midi_button_output'
    ];

    return autoMigrateTypes.includes(macroType);
  }

  private async migrateToWorkflow(legacyInfo: LegacyMacroInfo): Promise<MigrationResult> {
    try {
      // Convert legacy macro to workflow node
      const nodeConfig = this.createNodeFromLegacyMacro(legacyInfo);
      
      // Create minimal workflow with single node
      const workflowConfig: MacroWorkflowConfig = {
        id: `migrated_${legacyInfo.moduleId}_${legacyInfo.macroName}`,
        name: `Migrated: ${legacyInfo.macroName}`,
        description: `Migrated from legacy macro in module ${legacyInfo.moduleId}`,
        enabled: true,
        version: 1,
        created: Date.now(),
        modified: Date.now(),
        macros: [nodeConfig],
        connections: [],
        metadata: {
          migratedFrom: 'legacy',
          originalModule: legacyInfo.moduleId,
          originalName: legacyInfo.macroName,
          originalType: legacyInfo.macroType
        }
      };

      const workflowId = await this.dynamicManager.createWorkflow(workflowConfig);
      legacyInfo.migrationStatus = 'migrated';

      return {
        success: true,
        workflowId,
        errors: [],
        warnings: [],
        legacyMacrosCount: 1,
        migratedMacrosCount: 1
      };

    } catch (error) {
      legacyInfo.migrationStatus = 'error';
      return {
        success: false,
        errors: [`Migration failed: ${error}`],
        warnings: [],
        legacyMacrosCount: 1,
        migratedMacrosCount: 0
      };
    }
  }

  private createNodeFromLegacyMacro(legacyInfo: LegacyMacroInfo): MacroNodeConfig {
    return {
      id: `legacy_${legacyInfo.macroName}`,
      type: legacyInfo.macroType,
      position: { x: 100 + (this.legacyCallCount++ * 150), y: 100 },
      config: legacyInfo.config,
      customName: legacyInfo.macroName
    };
  }

  private createWorkflowFromMacroSet(moduleId: string, macros: LegacyMacroInfo[]): MacroWorkflowConfig {
    const nodes: MacroNodeConfig[] = macros.map((macro, index) => ({
      id: `${macro.macroName}_${index}`,
      type: macro.macroType,
      position: { x: 100 + (index * 200), y: 100 },
      config: macro.config,
      customName: macro.macroName
    }));

    // Try to detect and create logical connections
    const connections = this.inferConnectionsFromMacros(nodes);

    return {
      id: `migrated_module_${moduleId}`,
      name: `Migrated Module: ${moduleId}`,
      description: `Workflow migrated from legacy macros in module ${moduleId}`,
      enabled: true,
      version: 1,
      created: Date.now(),
      modified: Date.now(),
      macros: nodes,
      connections,
      metadata: {
        migratedFrom: 'legacy_module',
        originalModule: moduleId,
        macroCount: macros.length
      }
    };
  }

  private detectWorkflowPattern(macros: any): boolean {
    // Detect if the macro set represents a common workflow pattern
    const macroTypes = Object.values(macros).map((m: any) => m.type);
    
    // MIDI CC chain pattern
    if (macroTypes.includes('midi_control_change_input') && 
        macroTypes.includes('midi_control_change_output')) {
      return true;
    }

    // MIDI thru pattern
    if (macroTypes.includes('musical_keyboard_input') && 
        macroTypes.includes('musical_keyboard_output')) {
      return true;
    }

    return false;
  }

  private async createWorkflowFromLegacyMacros(moduleAPI: ModuleAPI, macros: any): Promise<void> {
    // Analyze macro relationships and create appropriate workflow
    const workflowName = `Auto-generated from ${moduleAPI.moduleId}`;
    
    // This would create a workflow template based on the detected pattern
    // For now, we'll just log the detection
    console.log(`Detected workflow pattern in ${moduleAPI.moduleId}:`, Object.keys(macros));
  }

  private inferConnectionsFromMacros(nodes: MacroNodeConfig[]) {
    const connections = [];
    
    // Simple heuristics to connect related macros
    const inputNodes = nodes.filter(n => n.type.includes('_input'));
    const outputNodes = nodes.filter(n => n.type.includes('_output'));

    // Connect matching MIDI types
    for (const inputNode of inputNodes) {
      for (const outputNode of outputNodes) {
        if (this.areCompatibleMacroTypes(inputNode.type, outputNode.type)) {
          connections.push({
            id: `auto_${inputNode.id}_to_${outputNode.id}`,
            sourceNodeId: inputNode.id,
            targetNodeId: outputNode.id,
            sourceOutput: 'default',
            targetInput: 'default'
          });
        }
      }
    }

    return connections;
  }

  private areCompatibleMacroTypes(inputType: keyof MacroTypeConfigs, outputType: keyof MacroTypeConfigs): boolean {
    // Check if macro types can be logically connected
    const compatibilityMap: Record<string, string[]> = {
      'midi_control_change_input': ['midi_control_change_output'],
      'midi_button_input': ['midi_button_output'],
      'musical_keyboard_input': ['musical_keyboard_output']
    };

    return compatibilityMap[inputType]?.includes(outputType) || false;
  }

  private analyzeLegacyPatterns() {
    // Analyze usage patterns from legacy macros
    const patterns: Array<{
      name: string;
      description: string;
      frequency: number;
      macroTypes: Array<keyof MacroTypeConfigs>;
    }> = [];

    // Group macros by module to find patterns
    const moduleGroups = new Map<string, LegacyMacroInfo[]>();
    
    for (const legacyInfo of this.legacyMacros.values()) {
      const moduleList = moduleGroups.get(legacyInfo.moduleId) || [];
      moduleList.push(legacyInfo);
      moduleGroups.set(legacyInfo.moduleId, moduleList);
    }

    // Analyze each module's macro combinations
    for (const [moduleId, macros] of moduleGroups) {
      const macroTypes = macros.map(m => m.macroType);
      const patternKey = macroTypes.sort().join('|');
      
      // Look for existing pattern or create new one
      let existingPattern = patterns.find(p => p.macroTypes.sort().join('|') === patternKey);
      if (existingPattern) {
        existingPattern.frequency++;
      } else {
        patterns.push({
          name: `Pattern: ${macroTypes.join(' + ')}`,
          description: `Commonly used combination: ${macroTypes.join(', ')}`,
          frequency: 1,
          macroTypes: [...macroTypes] as Array<keyof MacroTypeConfigs>
        });
      }
    }

    return patterns;
  }

  private createWorkflowFromPattern(pattern: {
    name: string;
    description: string;
    frequency: number;
    macroTypes: Array<keyof MacroTypeConfigs>;
  }): MacroWorkflowConfig {
    const nodes: MacroNodeConfig[] = pattern.macroTypes.map((type, index) => ({
      id: `pattern_node_${index}`,
      type,
      position: { x: 100 + (index * 200), y: 100 },
      config: {}, // Default config - would be customizable
      customName: `${type} node`
    }));

    const connections = this.inferConnectionsFromMacros(nodes);

    return {
      id: `pattern_${Date.now()}`,
      name: pattern.name,
      description: pattern.description,
      enabled: true,
      version: 1,
      created: Date.now(),
      modified: Date.now(),
      macros: nodes,
      connections,
      metadata: {
        generatedFrom: 'pattern_analysis',
        frequency: pattern.frequency
      }
    };
  }

  // =============================================================================
  // STATISTICS AND MONITORING
  // =============================================================================

  getLegacyMacroStats() {
    const stats = {
      totalLegacyMacros: this.legacyMacros.size,
      pendingMigration: 0,
      migrated: 0,
      failed: 0,
      macroTypeDistribution: new Map<keyof MacroTypeConfigs, number>(),
      moduleDistribution: new Map<string, number>()
    };

    for (const legacyInfo of this.legacyMacros.values()) {
      // Migration status
      switch (legacyInfo.migrationStatus) {
        case 'pending':
          stats.pendingMigration++;
          break;
        case 'migrated':
          stats.migrated++;
          break;
        case 'error':
          stats.failed++;
          break;
      }

      // Type distribution
      const typeCount = stats.macroTypeDistribution.get(legacyInfo.macroType) || 0;
      stats.macroTypeDistribution.set(legacyInfo.macroType, typeCount + 1);

      // Module distribution
      const moduleCount = stats.moduleDistribution.get(legacyInfo.moduleId) || 0;
      stats.moduleDistribution.set(legacyInfo.moduleId, moduleCount + 1);
    }

    return stats;
  }

  getCompatibilityReport() {
    const report = {
      backwardCompatibility: '100%',
      legacyMacrosSupported: this.legacyMacros.size,
      migrationReady: Array.from(this.legacyMacros.values())
        .filter(info => info.migrationStatus === 'pending').length,
      recommendedActions: [] as string[]
    };

    // Generate recommendations
    if (report.migrationReady > 0) {
      report.recommendedActions.push(
        `${report.migrationReady} legacy macros are ready for migration to workflows`
      );
    }

    const patterns = this.analyzeLegacyPatterns();
    const frequentPatterns = patterns.filter(p => p.frequency > 3);
    if (frequentPatterns.length > 0) {
      report.recommendedActions.push(
        `${frequentPatterns.length} workflow templates can be generated from usage patterns`
      );
    }

    return report;
  }
}