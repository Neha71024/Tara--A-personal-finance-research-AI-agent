import { AsyncLocalStorage } from 'async_hooks';
import fs from 'fs';
import path from 'path';

export interface ToolLogEntry {
  toolId: string;
  inputs: any;
  tablesRead: string[];
}

export interface RequestLogContext {
  requestId: string;
  question: string;
  toolsCalled: ToolLogEntry[];
}

export const requestStorage = new AsyncLocalStorage<RequestLogContext>();

export function logRequest(logEntry: {
  request_id: string;
  original_question: string;
  tools_called: string[];
  sanitized_tool_inputs: Array<{ tool: string; inputs: any }>;
  database_tables_read: string[];
  latency_ms: number;
  status: string;
  error_message?: string;
}) {
  try {
    const logFilePath = path.resolve(process.cwd(), 'tara.log');
    fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + '\n', 'utf8');
  } catch (err: any) {
    console.error('Failed to write to tara.log:', err.message);
  }
}
