import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createAdminClient } from '@supabase/server/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    table: 'profiles',
    output: 'db_export.json',
    stdout: false,
    pretty: true,
    limit: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--stdout') {
      options.stdout = true;
    } else if (arg === '--compact') {
      options.pretty = false;
    } else if (arg.startsWith('--table=')) {
      options.table = arg.split('=')[1];
    } else if (arg === '-t' || arg === '--table') {
      options.table = args[++i];
    } else if (arg.startsWith('--out=')) {
      options.output = arg.split('=')[1];
    } else if (arg === '-o' || arg === '--out' || arg === '--output') {
      options.output = args[++i];
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg === '-l' || arg === '--limit') {
      options.limit = parseInt(args[++i], 10);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node backend/extract-db.js [options]

Options:
  -t, --table <name>     Table to extract data from (default: "profiles")
  -o, --out <filename>   Output JSON file path (default: "db_export.json")
      --stdout           Print raw JSON to stdout (suppresses status logs)
      --compact          Output compact JSON without indentation
  -l, --limit <number>   Limit the number of records retrieved
  -h, --help             Show this help message

Examples:
  npm run extract
  node backend/extract-db.js --table=profiles --out=profiles.json
  node backend/extract-db.js --stdout
`);
      process.exit(0);
    }
  }

  return options;
}

async function extractDatabaseData() {
  const options = parseArgs();
  const log = options.stdout ? () => {} : console.log;
  const errorLog = console.error;

  try {
    log(`Connecting to Supabase...`);
    const supabase = createAdminClient();

    log(`Fetching records from table: "${options.table}"...`);
    let query = supabase
      .from(options.table)
      .select('*')
      .order('created_at', { ascending: false });

    if (options.limit && !isNaN(options.limit)) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to query table "${options.table}": ${error.message} (Code: ${error.code || 'N/A'})`);
    }

    const jsonString = options.pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    if (options.stdout) {
      process.stdout.write(jsonString + '\n');
      return;
    }

    // Determine target file path
    const outputPath = path.isAbsolute(options.output)
      ? options.output
      : path.resolve(process.cwd(), options.output);

    await fs.writeFile(outputPath, jsonString, 'utf-8');

    log(`\n========================================`);
    log(`✓ Successfully extracted data as JSON!`);
    log(`========================================`);
    log(`• Table:        ${options.table}`);
    log(`• Total Rows:   ${data.length}`);
    log(`• Saved To:     ${outputPath}`);
    log(`• File Size:    ${(Buffer.byteLength(jsonString) / 1024).toFixed(2)} KB`);
    log(`========================================\n`);

    if (data.length > 0) {
      log(`Sample record preview:`);
      log(JSON.stringify(data[0], null, 2));
    } else {
      log(`Note: The table "${options.table}" is currently empty.`);
    }

  } catch (err) {
    errorLog(`\n✖ Error extracting data:`, err.message);
    process.exit(1);
  }
}

extractDatabaseData();
