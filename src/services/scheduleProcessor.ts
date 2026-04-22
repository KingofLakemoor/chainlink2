import { FieldValue } from 'firebase-admin/firestore';

export type League = "NFL" | "NBA" | "NHL" | "MLB" | "MLS" | "EPL" | "MBB" | "WBB" | "NWSL" | "COLLEGE-FOOTBALL" | "WNBA" | "PGA" | string;

export interface LeagueResponse {
  scoreMatchupsCreated: number;
  existingMatchups: number;
  matchupsUpdated: number;
  gamesOnSchedule: number;
  error: string;
  data: any[];
}

export function getScheduleEndpoints(league: League) {
  // ... (keep dates setup)
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const theDayAfterTomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);

  const formatDate = (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "");
  const dates = [yesterday, today, tomorrow, theDayAfterTomorrow].map(formatDate);

  if (league === "MBB") {
    return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=50&dates=${date}&limit=500`);
  }
  if (league === "WBB") {
    return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/scoreboard?groups=50&dates=${date}&limit=500`);
  }
  if (league === "PGA") {
    return ['https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard'];
  }

  const year = new Date().getFullYear();
  switch (league) {
    case "NFL": return [`http://cdn.espn.com/core/nfl/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "NBA": return [`http://cdn.espn.com/core/nba/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "NHL": return [`http://cdn.espn.com/core/nhl/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "MLB": return [`http://cdn.espn.com/core/mlb/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "MLS": return [`http://cdn.espn.com/core/soccer/schedule/_/league/usa.1??dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "EPL": return [`http://cdn.espn.com/core/soccer/schedule/_/league/eng.1??dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "COLLEGE-FOOTBALL": return [`http://cdn.espn.com/core/college-football/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "WNBA": return [`http://cdn.espn.com/core/wnba/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    default: return [];
  }
}

export async function fetchScheduleData(endpoint: string, league: League) {
  const response = await fetch(endpoint);
  const data = await response.json();
  const scheduleData: Record<string, any> = {};

  if (league === "MBB" || league === "WBB" || league === "PGA") {
    const seenGameIds = new Set<string>();
    const uniqueEvents = [];

    for (const event of (data.events || [])) {
      if (!seenGameIds.has(event.id)) {
        seenGameIds.add(event.id);
        uniqueEvents.push(event);
      }
    }

    for (const event of uniqueEvents) {
      const date = event.date?.split("T")[0].replace(/-/g, "");
      if (!date) continue;
      if (!scheduleData[date]) scheduleData[date] = { games: [] };
      scheduleData[date].games.push(event);
    }
    return scheduleData;
  }

  const rawSchedule = data?.content?.schedule || {};
  const seenGameIds = new Set<string>();

  for (const day in rawSchedule) {
    const games = rawSchedule[day].games;
    if (!games) continue;

    const uniqueGames = games.filter((game: any) => {
      if (seenGameIds.has(game.id)) return false;
      seenGameIds.add(game.id);
      return true;
    });

    if (uniqueGames.length > 0) {
      scheduleData[day] = { ...rawSchedule[day], games: uniqueGames };
    }
  }

  return scheduleData;
}

import { adminDb } from '../lib/firebase-admin.js';
import { gradeMatchups } from './grader.js';

export async function syncLeagueSchedules(league: League): Promise<LeagueResponse> {
  const response = await scrapeLeagueSchedules(league);

  if (response.data && response.data.length > 0 && adminDb) {
    console.log(`[Sync] Fetched ${response.data.length} matchups for ${league}. Writing to Firestore...`);

    try {
      const leagueSettingsSnap = await adminDb.collection('leagueSettings').doc(league).get();
      let defaultActive = true;
      if (leagueSettingsSnap.exists) {
        const settings = leagueSettingsSnap.data();
        if (settings && typeof settings.active === 'boolean') {
          defaultActive = settings.active;
        }
      }

      const matchupsRef = adminDb.collection('matchups');
      const existingSnap = await matchupsRef.where('league', '==', league).get();

      const existingMap = new Map<string, any>();
      existingSnap.docs.forEach(d => {
        existingMap.set(d.data().gameId, d);
      });

      let batch = adminDb.batch();
      let opCount = 0;
      let newCount = 0;
      let updateCount = 0;
      const matchupsToGrade: any[] = [];

      for (const scrapedMatchup of response.data) {
        const gameId = scrapedMatchup.gameId;
        const existingDoc = existingMap.get(gameId);

        if (existingDoc) {
          const existingData = existingDoc.data();
          if (existingData.status !== scrapedMatchup.status ||
              existingData.startTime !== scrapedMatchup.startTime ||
              existingData.homeTeam?.score !== scrapedMatchup.homeTeam?.score ||
              existingData.awayTeam?.score !== scrapedMatchup.awayTeam?.score)
          {
            batch.update(existingDoc.ref, {
              status: scrapedMatchup.status,
              startTime: scrapedMatchup.startTime,
              'homeTeam.score': scrapedMatchup.homeTeam?.score || 0,
              'awayTeam.score': scrapedMatchup.awayTeam?.score || 0,
              'metadata.overUnder': scrapedMatchup.metadata?.overUnder,
              'metadata.spread': scrapedMatchup.metadata?.spread,
              'metadata.network': scrapedMatchup.metadata?.network,
              updatedAt: Date.now()
            });
            opCount++;
            updateCount++;

            if (scrapedMatchup.status === 'STATUS_FINAL') {
              matchupsToGrade.push(scrapedMatchup);
            }
          }
        } else {
          const newDocRef = matchupsRef.doc();
          batch.set(newDocRef, {
            ...scrapedMatchup,
            active: scrapedMatchup.active && defaultActive,
            updatedAt: Date.now(),
            createdAt: Date.now()
          });
          opCount++;
          newCount++;

          existingMap.set(gameId, { data: () => scrapedMatchup, ref: newDocRef } as any);
        }

        if (opCount === 500) {
          await batch.commit();
          batch = adminDb.batch();
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      if (matchupsToGrade.length > 0) {
        await gradeMatchups(matchupsToGrade);
      }

      response.scoreMatchupsCreated = newCount;
      response.matchupsUpdated = updateCount;
      console.log(`[Sync] ${league} complete: inserted ${newCount}, updated ${updateCount}.`);
    } catch (e: any) {
      console.error(`[Sync] Error writing to Firestore for ${league}:`, e);
      response.error = e.message;
    }
  } else if (!adminDb) {
    console.warn(`[Sync] Skipping Firestore write for ${league} because adminDb is not initialized.`);
  }

  return response;
}

export async function scrapeLeagueSchedules(league: League): Promise<LeagueResponse> {
  const response: LeagueResponse = {
    scoreMatchupsCreated: 0,
    existingMatchups: 0,
    matchupsUpdated: 0,
    gamesOnSchedule: 0,
    error: "",
    data: []
  };

  const endpoints = getScheduleEndpoints(league);
  if (!endpoints || endpoints.length === 0) {
    response.error = `No endpoints for ${league}`;
    return response;
  }

  const processedGameIds = new Set<string>();
  const parsedMatchups: any[] = [];

  for (const endpoint of endpoints) {
    try {
      const scheduleData = await fetchScheduleData(endpoint, league);

      for (const day in scheduleData) {
        const games = scheduleData[day].games;
        if (!games) continue;

        for (const game of games) {
          const gameId = String(game.id);
          const competition = game.competitions?.[0];
          if (!competition) continue;

          if (league === "PGA") {
            const competitors = competition.competitors?.filter((c: any) => c.athlete || c.team) || [];
            if (competitors.length < 2) continue;

            const numMatchups = Math.min(10, Math.floor(competitors.length / 2));
            const status = competition.status?.type?.name || "STATUS_SCHEDULED";
            const gameTime = new Date(game.date).getTime();

            for (let i = 0; i < numMatchups; i++) {
              const a = competitors[i * 2];
              const b = competitors[i * 2 + 1];

              const golferA = a.athlete || a.team;
              const golferB = b.athlete || b.team;

              const matchupGameId = `${gameId}_${a.id}_${b.id}`;

              if (processedGameIds.has(matchupGameId)) continue;
              processedGameIds.add(matchupGameId);

              const currentPeriod = competition.status?.period || 1;
              const getScore = (c: any, p: number) => {
                 const ls = c.linescores?.find((ls: any) => ls.period === p);
                 return ls?.value ? ls.value : 0;
              };
              const scoreA = getScore(a, currentPeriod);
              const scoreB = getScore(b, currentPeriod);

              parsedMatchups.push({
                 startTime: gameTime,
                 active: true,
                 featured: false,
                 title: `Round ${currentPeriod} Total Score: ${golferA.displayName || golferA.name || 'Golfer A'} vs ${golferB.displayName || golferB.name || 'Golfer B'} (Lower Wins)`,
                 league,
                 type: "SCORE",
                 status,
                 gameId: matchupGameId,
                 homeTeam: {
                   id: String(b.id),
                   name: golferB.displayName || golferB.name || "Golfer B",
                   image: golferB.flag?.href || "/icons/icon-256x256.png",
                   score: scoreB
                 },
                 awayTeam: {
                   id: String(a.id),
                   name: golferA.displayName || golferA.name || "Golfer A",
                   image: golferA.flag?.href || "/icons/icon-256x256.png",
                   score: scoreA
                 },
                 cost: 10,
                 metadata: {
                   network: competition.geoBroadcasts?.[0]?.media?.shortName || "N/A",
                   tournament: game.name,
                   period: currentPeriod,
                   golf: true,
                   lowerScoreWins: true
                 }
              });
            }
            continue;
          }

          if (processedGameIds.has(gameId)) continue;
          processedGameIds.add(gameId);


          const competitors = competition.competitors || [];
          const home = competitors.find((c: any) => c.homeAway === "home");
          const away = competitors.find((c: any) => c.homeAway === "away");
          if (!home || !away) continue;

          const status = competition.status?.type?.name || "STATUS_SCHEDULED";
          const gameTime = new Date(game.date).getTime();

          const overUnder = competition.odds?.[0]?.overUnder || null;
          const spread = competition.odds?.[0]?.spread || null;
          const network = competition.geoBroadcasts?.[0]?.media?.shortName || "N/A";

          let active = true;
          const mlHome = competition.odds?.[0]?.moneyline?.home?.close?.odds || competition.odds?.[0]?.moneyline?.home?.open?.odds;
          const mlAway = competition.odds?.[0]?.moneyline?.away?.close?.odds || competition.odds?.[0]?.moneyline?.away?.open?.odds;

          if (mlHome) {
            const mlHomeNum = parseInt(mlHome, 10);
            if (!isNaN(mlHomeNum) && mlHomeNum <= -300) {
              active = false;
            }
          }

          if (mlAway) {
            const mlAwayNum = parseInt(mlAway, 10);
            if (!isNaN(mlAwayNum) && mlAwayNum <= -300) {
              active = false;
            }
          }

          parsedMatchups.push({
             startTime: gameTime,
             active,
             featured: false,
             title: `Who will win? ${away.team.name} @ ${home.team.name}`,
             league,
             type: "SCORE",
             status,
             gameId: gameId,
             homeTeam: {
               id: String(home.id),
               name: home.team.name || "Home Team",
               image: home.team.logo || "/icons/icon-256x256.png",
               score: parseFloat(home.score || "0")
             },
             awayTeam: {
               id: String(away.id),
               name: away.team.name || "Away Team",
               image: away.team.logo || "/icons/icon-256x256.png",
               score: parseFloat(away.score || "0")
             },
             cost: 10,
             metadata: {
               network,
               overUnder,
               spread
             }
          });
        }
      }
    } catch (err: any) {
      console.error(`Endpoint failed: ${endpoint}`, err);
    }
  }

  response.data = parsedMatchups;
  response.gamesOnSchedule = parsedMatchups.length;
  return response;
}
