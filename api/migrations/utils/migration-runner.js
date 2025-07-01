const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');

class MigrationRunner {
  constructor(connectionString, dbName) {
    this.connectionString = connectionString;
    this.dbName = dbName;
    this.client = null;
    this.db = null;
  }

  async connect() {
    this.client = new MongoClient(this.connectionString);
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    
    // Ensure migrations collection exists
    await this.ensureMigrationsCollection();
  }

  async ensureMigrationsCollection() {
    const collections = await this.db.listCollections({ name: 'migrations' }).toArray();
    if (collections.length === 0) {
      await this.db.createCollection('migrations');
      await this.db.collection('migrations').createIndex({ name: 1 }, { unique: true });
    }
  }

  async getAppliedMigrations() {
    const migrations = await this.db.collection('migrations').find({}).toArray();
    return migrations.map(m => m.name);
  }

  async markMigrationApplied(name) {
    await this.db.collection('migrations').insertOne({
      name,
      appliedAt: new Date(),
      version: process.env.npm_package_version || 'unknown'
    });
  }

  async markMigrationRolledBack(name) {
    await this.db.collection('migrations').deleteOne({ name });
  }

  async runMigration(migrationPath) {
    const migrationName = path.basename(migrationPath, '.js');
    const appliedMigrations = await this.getAppliedMigrations();
    
    if (appliedMigrations.includes(migrationName)) {
      console.log(`⏭️  Skipping ${migrationName} (already applied)`);
      return;
    }

    console.log(`🚀 Running migration: ${migrationName}`);
    
    try {
      const migration = require(migrationPath);
      await migration.up(this.db);
      await this.markMigrationApplied(migrationName);
      console.log(`✅ Migration ${migrationName} completed successfully`);
    } catch (error) {
      console.error(`❌ Migration ${migrationName} failed:`, error);
      throw error;
    }
  }

  async rollbackMigration(migrationPath) {
    const migrationName = path.basename(migrationPath, '.js');
    const appliedMigrations = await this.getAppliedMigrations();
    
    if (!appliedMigrations.includes(migrationName)) {
      console.log(`⏭️  Skipping rollback of ${migrationName} (not applied)`);
      return;
    }

    console.log(`🔄 Rolling back migration: ${migrationName}`);
    
    try {
      const migration = require(migrationPath);
      await migration.down(this.db);
      await this.markMigrationRolledBack(migrationName);
      console.log(`✅ Rollback of ${migrationName} completed successfully`);
    } catch (error) {
      console.error(`❌ Rollback of ${migrationName} failed:`, error);
      throw error;
    }
  }

  async runAllMigrations(migrationsDir) {
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(f => f.endsWith('.js'))
      .sort(); // Run in order

    for (const file of migrationFiles) {
      await this.runMigration(path.join(migrationsDir, file));
    }
  }

  async rollbackAllMigrations(migrationsDir) {
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(f => f.endsWith('.js'))
      .sort()
      .reverse(); // Rollback in reverse order

    for (const file of migrationFiles) {
      await this.rollbackMigration(path.join(migrationsDir, file));
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
    }
  }
}

module.exports = MigrationRunner;