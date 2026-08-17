import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { z } from 'zod';

export const datePrecision = z.enum(['unknown', 'year', 'month', 'day']);
const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional();
export const cityInput = z.object({
  countryCode: z.string().length(2).transform((v) => v.toUpperCase()), name: z.string().trim().min(1).max(180),
  admin1: z.string().trim().max(180).nullable().optional(), admin2: z.string().trim().max(180).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(), longitude: z.number().min(-180).max(180).nullable().optional()
}).refine((v) => (v.latitude == null) === (v.longitude == null), { message: 'Latitude and longitude must be provided together.' });
export const visitInput = z.object({
  countryCode: z.string().length(2).transform((v) => v.toUpperCase()), cityId: z.string().uuid().nullable().optional(),
  tripId: z.string().uuid().nullable().optional(), startDate: optionalDate, endDate: optionalDate,
  datePrecision: datePrecision.default('unknown'), notes: z.string().max(10_000).nullable().optional(), confirmDuplicate: z.boolean().optional()
}).refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { message: 'End date must be on or after start date.' });
export const tripInput = z.object({ name: z.string().trim().min(1).max(180), startDate: optionalDate, endDate: optionalDate,
  datePrecision: datePrecision.default('unknown'), notes: z.string().max(10_000).nullable().optional() })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { message: 'End date must be on or after start date.' });

export const csvHeaders = ['record_type','visit_id','country_code','country_name','city_name','admin1','admin2','latitude','longitude','visited_from','visited_to','date_precision','trip_name','notes'] as const;
export type CsvRow = Record<(typeof csvHeaders)[number], string>;

export function normalizeName(value: string) { return value.trim().normalize('NFKC').toLocaleLowerCase('en-US').replace(/\s+/g, ' '); }
export function spreadsheetSafe(value: unknown) {
  const text = value == null ? '' : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}
export function spreadsheetUnescape(value: string) { return /^'[=+\-@]/.test(value) ? value.slice(1) : value; }
export function formatDate(value: string | null, precision: z.infer<typeof datePrecision>) {
  if (!value || precision === 'unknown') return 'Unknown date';
  if (precision === 'year') return value.slice(0, 4);
  if (precision === 'month') return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}
export function parseCanonicalCsv(input: string): CsvRow[] {
  if (Buffer.byteLength(input, 'utf8') > 2 * 1024 * 1024) throw new Error('CSV exceeds the 2 MiB limit.');
  const firstLine = input.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
  const records = parse(input, { columns: true, bom: true, delimiter, skip_empty_lines: true, trim: true, relax_column_count: false }) as Record<string,string>[];
  const actual = records.length ? Object.keys(records[0]!) : firstLine.split(delimiter);
  for (const required of ['record_type','country_code']) if (!actual.includes(required)) throw new Error(`Missing required column: ${required}`);
  return records.map((row) => Object.fromEntries(csvHeaders.map((header) => [header, spreadsheetUnescape(row[header] ?? '')])) as CsvRow);
}
export function writeCsv(rows: Record<string, unknown>[], columns: readonly string[], safe = true) {
  return stringify(rows.map((row) => Object.fromEntries(columns.map((key) => [key, safe && ['country_name','city_name','admin1','admin2','trip_name','notes'].includes(key) ? spreadsheetSafe(row[key]) : row[key] ?? '']))),
    { header: true, columns, bom: true, record_delimiter: 'windows' });
}
