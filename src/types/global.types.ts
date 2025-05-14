import path from 'node:path';
import * as fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import * as keytar from 'keytar';

export type SpawnDi = typeof spawn;
export type PathDI = typeof path;
export type FileSystemDI = typeof fs;
export type KeytarDi = typeof keytar;