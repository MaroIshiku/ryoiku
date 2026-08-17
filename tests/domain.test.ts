import { describe, expect, it } from 'vitest';
import { formatDate, normalizeName, parseCanonicalCsv, spreadsheetSafe, spreadsheetUnescape, writeCsv } from '../src/server/domain.js';

describe('domain rules', () => {
  it('formats dates without inventing precision', () => {
    expect(formatDate(null,'unknown')).toBe('Unknown date');
    expect(formatDate('1999-01-01','year')).toBe('1999');
    expect(formatDate('2026-05-01','month')).toContain('2026');
  });
  it('normalizes city names deterministically', () => expect(normalizeName('  São   Paulo ')).toBe('são paulo'));
  it('mitigates spreadsheet formulas without corrupting a round trip', () => {
    expect(spreadsheetSafe('=cmd()')).toBe("'=cmd()");
    expect(spreadsheetUnescape("'=cmd()")).toBe('=cmd()');
  });
  it('writes and parses quoted canonical CSV', () => {
    const csv=writeCsv([{record_type:'visit',country_code:'DE',notes:'hello, world'}],['record_type','country_code','notes']);
    const [row]=parseCanonicalCsv(csv);
    expect(row?.country_code).toBe('DE');expect(row?.notes).toBe('hello, world');
  });
});
