import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exportBackup, parseBackup, applyBackup, downloadBackup } from './backup.js';

const FRIENDS = [{ id: 'f1', name: 'Sam', createdAt: 1 }];
const TXNS = [{ id: 't1', friendId: 'f1', categoryId: 'moved', delta: 20, date: '2026-09-26' }];

describe('friendcredit backup', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('friendcredit:friends', JSON.stringify(FRIENDS));
    window.localStorage.setItem('friendcredit:transactions', JSON.stringify(TXNS));
  });

  it('exports both ledgers with an app marker', () => {
    const backup = exportBackup();
    expect(backup.app).toBe('friendcredit');
    expect(backup.version).toBe(1);
    expect(typeof backup.exportedAt).toBe('string');
    expect(backup.data['friendcredit:friends']).toEqual(FRIENDS);
    expect(backup.data['friendcredit:transactions']).toEqual(TXNS);
  });

  it('exports empty arrays for unset keys', () => {
    window.localStorage.clear();
    const backup = exportBackup();
    expect(backup.data['friendcredit:friends']).toEqual([]);
    expect(backup.data['friendcredit:transactions']).toEqual([]);
  });

  it('exports empty arrays instead of throwing on corrupt storage', () => {
    window.localStorage.setItem('friendcredit:friends', '{not json');
    const backup = exportBackup();
    expect(backup.data['friendcredit:friends']).toEqual([]);
    expect(backup.data['friendcredit:transactions']).toEqual(TXNS);
  });

  it('rejects foreign or malformed files', () => {
    expect(() => parseBackup('not json at all')).toThrow('Not a FriendCredit backup file');
    expect(() => parseBackup('{"app":"get-inspired","data":{}}')).toThrow(
      'Not a FriendCredit backup file'
    );
    expect(() => parseBackup('{"app":"friendcredit"}')).toThrow('Not a FriendCredit backup file');
  });

  it('restores both ledgers from a valid backup', () => {
    const backup = JSON.stringify(exportBackup());
    window.localStorage.clear();
    expect(applyBackup(parseBackup(backup))).toBe(2);
    expect(JSON.parse(window.localStorage.getItem('friendcredit:friends'))).toEqual(FRIENDS);
    expect(JSON.parse(window.localStorage.getItem('friendcredit:transactions'))).toEqual(TXNS);
  });

  it('only restores sections that are arrays', () => {
    const data = parseBackup(
      '{"app":"friendcredit","data":{"friendcredit:friends":[],"friendcredit:transactions":"nonsense"}}'
    );
    expect(applyBackup(data)).toBe(1);
  });

  it('refuses a backup with no restorable arrays', () => {
    expect(applyBackup(parseBackup('{"app":"friendcredit","data":{}}'))).toBe(0);
  });

  it('downloadBackup triggers a JSON file download', () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadBackup();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});
