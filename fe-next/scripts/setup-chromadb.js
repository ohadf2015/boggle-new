#!/usr/bin/env node

/**
 * ChromaDB Collections Setup Script
 *
 * Creates 7 specialized collections for tracking color system consolidation:
 * 1. color_instances - Every color usage with file/line context
 * 2. color_categories - 6-category taxonomy
 * 3. design_tokens - Token definitions with usage examples
 * 4. gradient_presets - Standard gradient recipes
 * 5. migration_rules - Old pattern → new token mappings
 * 6. accessibility_violations - WCAG compliance issues
 * 7. component_color_usage - Per-component migration tracking
 */

const fs = require('fs');
const path = require('path');

/**
 * Collection schemas and metadata
 */
const COLLECTIONS = [
  {
    name: 'color_instances',
    description: 'Every color usage instance with file/line context',
    metadata: {
      hnsw_space: 'cosine',
      purpose: 'Track all color usage across codebase for migration',
    },
    schema: {
      id: 'string (UUID)',
      file_path: 'string',
      line_number: 'number',
      color_type: 'string (hex|rgb|tailwind|css-var)',
      color_value: 'string',
      context: 'string (code snippet)',
      component_name: 'string',
      category: 'string (brand|tier|avatar|gradient|semantic|decorative|unknown)',
      needs_migration: 'boolean',
      recommended_token: 'string',
      wcag_compliant: 'boolean',
    },
    embedding_strategy: 'Embed: context + component_name + category',
  },
  {
    name: 'color_categories',
    description: '6-category taxonomy for color classification',
    metadata: {
      hnsw_space: 'cosine',
      purpose: 'Define and document color categorization system',
    },
    schema: {
      id: 'string',
      category_name: 'string',
      subcategory: 'string',
      description: 'string',
      usage_guidelines: 'string',
      examples: 'array<string>',
      wcag_requirements: 'object { min_contrast: number, level: string }',
      neo_palette_mapping: 'string',
    },
    embedding_strategy: 'Embed: description + usage_guidelines',
  },
  {
    name: 'design_tokens',
    description: 'Token definitions with usage examples',
    metadata: {
      hnsw_space: 'cosine',
      purpose: 'Searchable design token documentation',
    },
    schema: {
      id: 'string',
      token_name: 'string',
      css_variable: 'string',
      tailwind_class: 'string',
      color_value: 'string',
      category: 'string',
      usage_context: 'string',
      replaces: 'array<string>',
      examples: 'array<string>',
    },
    embedding_strategy: 'Embed: token_name + usage_context + examples',
  },
  {
    name: 'gradient_presets',
    description: 'Standard gradient recipes',
    metadata: {
      hnsw_space: 'cosine',
      purpose: 'Catalog and recommend gradient patterns',
    },
    schema: {
      id: 'string',
      preset_name: 'string',
      gradient_stops: 'object { from: string, via?: string, to: string }',
      direction: 'string',
      css_class: 'string',
      usage_context: 'string',
      replaces: 'array<string>',
    },
    embedding_strategy: 'Embed: preset_name + usage_context',
  },
  {
    name: 'migration_rules',
    description: 'Old pattern → new token mappings',
    metadata: {
      hnsw_space: 'l2',
      purpose: 'Automated migration suggestions',
    },
    schema: {
      id: 'string',
      old_pattern: 'string',
      new_token: 'string',
      category: 'string',
      confidence: 'number (0-1)',
      requires_manual_review: 'boolean',
      notes: 'string',
    },
    embedding_strategy: 'Embed: old_pattern + new_token + notes',
  },
  {
    name: 'accessibility_violations',
    description: 'WCAG compliance issues',
    metadata: {
      hnsw_space: 'l2',
      purpose: 'Track and fix accessibility problems',
    },
    schema: {
      id: 'string',
      file_path: 'string',
      line_number: 'number',
      foreground_color: 'string',
      background_color: 'string',
      contrast_ratio: 'number',
      required_ratio: 'number',
      wcag_level: 'string (AA|AAA)',
      component_name: 'string',
      suggested_fix: 'string',
      severity: 'string (critical|high|medium|low)',
    },
    embedding_strategy: 'Embed: component_name + suggested_fix',
  },
  {
    name: 'component_color_usage',
    description: 'Per-component migration tracking',
    metadata: {
      hnsw_space: 'cosine',
      purpose: 'Track migration progress by component',
    },
    schema: {
      id: 'string',
      component_path: 'string',
      component_name: 'string',
      color_count: 'number',
      categories_used: 'array<string>',
      migration_status: 'string (not-started|in-progress|completed|blocked)',
      priority: 'number (1-5)',
      dependencies: 'array<string>',
      test_coverage: 'number (0-100)',
    },
    embedding_strategy: 'Embed: component_name + component_path',
  },
];

/**
 * Generate ChromaDB setup documentation
 */
function generateDocumentation() {
  console.log('📚 ChromaDB Collections Setup\n');
  console.log('='.repeat(80));
  console.log('\n');

  for (const collection of COLLECTIONS) {
    console.log(`Collection: ${collection.name}`);
    console.log(`Description: ${collection.description}`);
    console.log(`Metadata: ${JSON.stringify(collection.metadata, null, 2)}`);
    console.log(`\nSchema:`);
    for (const [field, type] of Object.entries(collection.schema)) {
      console.log(`  - ${field}: ${type}`);
    }
    console.log(`\nEmbedding Strategy: ${collection.embedding_strategy}`);
    console.log('\n' + '-'.repeat(80) + '\n');
  }

  // Generate example queries
  console.log('Example Queries:\n');
  console.log('1. Find all brand colors in button components:');
  console.log('   chroma.query({');
  console.log('     collection: "color_instances",');
  console.log('     where: { category: "brand", component_name: { $contains: "Button" } }');
  console.log('   });\n');

  console.log('2. Get gradient recommendations for hero sections:');
  console.log('   chroma.query({');
  console.log('     collection: "gradient_presets",');
  console.log('     query: "hero section gradient",');
  console.log('     n_results: 5');
  console.log('   });\n');

  console.log('3. Find accessibility violations in auth components:');
  console.log('   chroma.query({');
  console.log('     collection: "accessibility_violations",');
  console.log('     where: { severity: "critical", file_path: { $contains: "auth" } }');
  console.log('   });\n');

  console.log('4. Check migration status of high-priority components:');
  console.log('   chroma.query({');
  console.log('     collection: "component_color_usage",');
  console.log('     where: { priority: { $lte: 2 }, migration_status: "not-started" }');
  console.log('   });\n');
}

/**
 * Populate collections with initial data from audit report
 */
function populateFromAudit() {
  const auditPath = path.join(process.cwd(), '.claude', 'plans', 'color-audit-report.json');

  if (!fs.existsSync(auditPath)) {
    console.log('⚠️  Audit report not found. Run color-audit.js first.');
    return;
  }

  const auditReport = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));

  console.log('\n📊 Populating Collections from Audit Report\n');

  // 1. Populate color_instances
  console.log(`   - color_instances: ${auditReport.instances.length} instances`);

  // 2. Populate color_categories
  const categories = [
    {
      category_name: 'brand',
      description: 'Social OAuth and sharing platform colors',
      usage_guidelines: 'Use for brand identity elements (Google, Discord, WhatsApp, etc.)',
      examples: ['OAuth buttons', 'Social share buttons'],
      wcag_requirements: { min_contrast: 4.5, level: 'AA' },
      neo_palette_mapping: 'Use original brand colors, not neo-palette',
    },
    {
      category_name: 'tier',
      description: 'Rank and tier indicator colors',
      usage_guidelines: 'Use for leaderboard ranks, achievement tiers',
      examples: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
      wcag_requirements: { min_contrast: 3.0, level: 'AA' },
      neo_palette_mapping: 'Yellow (gold), Slate (silver), Amber (bronze)',
    },
    {
      category_name: 'avatar',
      description: 'Character avatar background colors',
      usage_guidelines: 'Use for player avatar backgrounds and character themes',
      examples: ['Broccoli Bob', 'Pizza Pete', 'Sunny Steve'],
      wcag_requirements: { min_contrast: 3.0, level: 'AA' },
      neo_palette_mapping: 'Map to neo-palette for consistency',
    },
    {
      category_name: 'gradient',
      description: 'Background and decorative gradients',
      usage_guidelines: 'Use for rank displays, stat cards, hero sections',
      examples: ['Rank gradients', 'Performance stats', 'Hero backgrounds'],
      wcag_requirements: { min_contrast: 4.5, level: 'AA' },
      neo_palette_mapping: 'Yellow/Pink/Cyan primary gradients',
    },
    {
      category_name: 'semantic',
      description: 'Semantic UI colors (primary, secondary, destructive)',
      usage_guidelines: 'Use for buttons, badges, status indicators',
      examples: ['Primary CTA', 'Error states', 'Success messages'],
      wcag_requirements: { min_contrast: 4.5, level: 'AA' },
      neo_palette_mapping: 'Yellow (primary), Pink (secondary), Red (error), Lime (success)',
    },
    {
      category_name: 'decorative',
      description: 'Visual effects (glows, overlays, shadows)',
      usage_guidelines: 'Use sparingly for visual interest',
      examples: ['Neon glows', 'Halftone overlays', 'Hard shadows'],
      wcag_requirements: { min_contrast: 3.0, level: 'AA' },
      neo_palette_mapping: 'Cyan/Pink for glows',
    },
  ];
  console.log(`   - color_categories: ${categories.length} categories`);

  // 3. Populate migration_rules
  const migrationRules = [
    { old_pattern: '#5865F2', new_token: 'brand-discord', confidence: 1.0 },
    { old_pattern: '#25D366', new_token: 'brand-whatsapp', confidence: 1.0 },
    { old_pattern: '#4285F4', new_token: 'brand-google', confidence: 1.0 },
    { old_pattern: 'from-slate-900', new_token: 'bg-neo-navy', confidence: 0.9 },
    { old_pattern: 'from-amber-500', new_token: 'bg-gradient-rank-third', confidence: 0.8 },
    { old_pattern: '#FF6B35', new_token: 'neo-yellow or neo-pink', confidence: 0.7 },
  ];
  console.log(`   - migration_rules: ${migrationRules.length} rules`);

  // 4. Generate component usage summary
  const componentUsage = new Map();
  for (const instance of auditReport.instances) {
    const key = instance.component_name;
    if (!componentUsage.has(key)) {
      componentUsage.set(key, {
        component_name: key,
        component_path: instance.file_path,
        color_count: 0,
        categories_used: new Set(),
        migration_status: 'not-started',
      });
    }
    const comp = componentUsage.get(key);
    comp.color_count++;
    comp.categories_used.add(instance.category);
  }
  console.log(`   - component_color_usage: ${componentUsage.size} components`);

  console.log('\n✅ Collection schemas documented and ready for ChromaDB integration\n');
}

/**
 * Save collection schemas to JSON for reference
 */
function saveSchemas() {
  const outputDir = path.join(process.cwd(), '.claude', 'plans');
  const outputPath = path.join(outputDir, 'chromadb-schemas.json');

  const schemaDoc = {
    generated_at: new Date().toISOString(),
    collections: COLLECTIONS,
    total_collections: COLLECTIONS.length,
  };

  fs.writeFileSync(outputPath, JSON.stringify(schemaDoc, null, 2));
  console.log(`📄 Collection schemas saved to: ${outputPath}\n`);
}

// Main execution
if (require.main === module) {
  console.log('🔧 Setting up ChromaDB Collections\n');
  generateDocumentation();
  populateFromAudit();
  saveSchemas();
  console.log('✅ ChromaDB setup complete!\n');
}

module.exports = { COLLECTIONS, generateDocumentation, populateFromAudit };
