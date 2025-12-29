import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ConfigLoader } from '../../src/config/config-loader.js';

vi.mock('fs');

describe('ConfigLoader', () => {
  const mockConfigPath = '/path/to/config.yaml';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should load and validate a valid config', () => {
    const validYaml = `
sync:
  direction: bidirectional
  poll_interval: "*/15 * * * *"

mappings:
  - jpd: Summary
    github: title

statuses:
  Ready:
    github_state: open
    github_column: "To Do"
    `;

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(validYaml);

    const config = ConfigLoader.load(mockConfigPath);

    expect(config.sync.direction).toBe('bidirectional');
    expect(config.mappings[0].jpd).toBe('Summary');
    expect(config.statuses['Ready'].github_column).toBe('To Do');
  });

  it('should throw error if config file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    expect(() => ConfigLoader.load(mockConfigPath)).toThrow(/Config file not found/);
  });

  it('should throw error if validation fails', () => {
    const invalidYaml = `
sync:
  direction: invalid-direction
mappings: []
statuses: {}
    `;

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(invalidYaml);

    expect(() => ConfigLoader.load(mockConfigPath)).toThrow(/Config validation failed/);
  });
});

