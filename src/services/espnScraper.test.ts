import test from 'node:test';
import assert from 'node:assert';
import {
  MATCHUP_FINAL_STATUSES,
  MATCHUP_IN_PROGRESS_STATUSES,
  MATCHUP_DELAYED_STATUSES,
  MATCHUP_POSTPONED_STATUSES,
  MATCHUP_SCHEDULED_STATUSES,
  MATCHUP_UNKNOWN_STATUSES,
  getScheduleEndpoints,
} from './espnScraper.ts';

test('MATCHUP_FINAL_STATUSES contains expected values', () => {
  const expected = [
    "STATUS_FINAL",
    "STATUS_FULL_TIME",
    "STATUS_FULL_PEN",
    "STATUS_FINAL_AET",
    "STATUS_FINAL_ET",
    "STATUS_FINAL_OT",
    "STATUS_FORFEIT",
    "STATUS_FINAL_OVERTIME",
    "STATUS_FINAL_SHOOTOUT",
    "STATUS_FINAL_PENALTIES",
  ];
  assert.deepStrictEqual(MATCHUP_FINAL_STATUSES, expected);
});

test('MATCHUP_IN_PROGRESS_STATUSES contains expected values', () => {
  const expected = [
    "STATUS_IN_PROGRESS",
    "STATUS_FIRST_HALF",
    "STATUS_SECOND_HALF",
    "STATUS_HALFTIME",
    "STATUS_END_PERIOD",
    "STATUS_END_QUARTER",
    "STATUS_END_REGULATION",
    "STATUS_END_GAME",
    "STATUS_SHOOTOUT",
    "STATUS_END_OF_EXTRATIME",
    "STATUS_IN_PROGRESS_PEN",
    "STATUS_IN_PROGRESS_ET",
    "STATUS_OVERTIME",
    "STATUS_IN_PROGRESS_PEN_ET",
  ];
  assert.deepStrictEqual(MATCHUP_IN_PROGRESS_STATUSES, expected);
});

test('MATCHUP_DELAYED_STATUSES contains expected values', () => {
  const expected = [
    "STATUS_DELAYED",
    "STATUS_RAIN_DELAY",
    "STATUS_DELAY",
  ];
  assert.deepStrictEqual(MATCHUP_DELAYED_STATUSES, expected);
});

test('MATCHUP_POSTPONED_STATUSES contains expected values', () => {
  const expected = [
    "STATUS_POSTPONED",
    "STATUS_CANCELED",
    "STATUS_SUSPENDED",
    "STATUS_ABANDONDED",
  ];
  assert.deepStrictEqual(MATCHUP_POSTPONED_STATUSES, expected);
});

test('MATCHUP_SCHEDULED_STATUSES contains expected values', () => {
  const expected = ["STATUS_SCHEDULED"];
  assert.deepStrictEqual(MATCHUP_SCHEDULED_STATUSES, expected);
});

test('MATCHUP_UNKNOWN_STATUSES contains expected values', () => {
  const expected = ["STATUS_UNKNOWN"];
  assert.deepStrictEqual(MATCHUP_UNKNOWN_STATUSES, expected);
});

test('getScheduleEndpoints throws error for unsupported league', () => {
  assert.throws(() => {
    getScheduleEndpoints('INVALID-LEAGUE' as any);
  }, /Unsupported league: INVALID-LEAGUE/);
});

test('getScheduleEndpoints returns correct endpoints for NFL', () => {
  const endpoints = getScheduleEndpoints('NFL');
  assert.strictEqual(endpoints.length, 1);
  assert.ok(endpoints[0].includes('cdn.espn.com/core/nfl/schedule'));
});

test('getScheduleEndpoints returns correct endpoints for NFL scoreboardOnly', () => {
  const endpoints = getScheduleEndpoints('NFL', true);
  assert.strictEqual(endpoints.length, 4);
  assert.ok(endpoints[0].includes('site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'));
});

test('getScheduleEndpoints returns correct endpoints for MBB (always scoreboard)', () => {
  const endpoints = getScheduleEndpoints('MBB');
  assert.strictEqual(endpoints.length, 4);
  assert.ok(endpoints[0].includes('mens-college-basketball/scoreboard'));
});

test('getScheduleEndpoints returns correct endpoints for PGA', () => {
  const endpoints = getScheduleEndpoints('PGA');
  assert.strictEqual(endpoints.length, 1);
  assert.ok(endpoints[0].includes('golf/leaderboard?league=pga'));
});
