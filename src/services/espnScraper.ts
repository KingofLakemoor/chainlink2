export type League = "NFL" | "NBA" | "NHL" | "MLB" | "MLS" | "EPL" | "MBB" | "WBB" | "NWSL" | "COLLEGE-FOOTBALL" | "WNBA" | "PGA" | string;


export const MATCHUP_FINAL_STATUSES = [
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

export const MATCHUP_IN_PROGRESS_STATUSES = [
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

export const MATCHUP_DELAYED_STATUSES = [
  "STATUS_DELAYED",
  "STATUS_RAIN_DELAY",
  "STATUS_DELAY",
];

export const MATCHUP_POSTPONED_STATUSES = [
  "STATUS_POSTPONED",
  "STATUS_CANCELED",
  "STATUS_SUSPENDED",
  "STATUS_ABANDONDED",
];

export const MATCHUP_SCHEDULED_STATUSES = ["STATUS_SCHEDULED"];

export const MATCHUP_UNKNOWN_STATUSES = ["STATUS_UNKNOWN"];

export interface LeagueResponse {
  scoreMatchupsCreated: number;
  existingMatchups: number;
  matchupsUpdated: number;
  gamesOnSchedule: number;
  error: string;
  data: any[];
}

export function getScheduleEndpoints(league: League, scoreboardOnly: boolean = false) {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const theDayAfterTomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);

  const formatDate = (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "");
  const dates = [yesterday, today, tomorrow, theDayAfterTomorrow].map(formatDate);

  // College basketball and PGA always use scoreboard
  if (league === "MBB") {
    return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=50&dates=${date}&limit=500`);
  }
  if (league === "WBB") {
    return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/scoreboard?groups=50&dates=${date}&limit=500`);
  }
  if (league === "PGA") {
    return ['https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard'];
  }

  // If scoreboardOnly is true, use scoreboard endpoints to save bandwidth
  if (scoreboardOnly) {
    switch (league) {
      case "NFL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${date}`);
      case "NBA": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}`);
      case "NHL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${date}`);
      case "MLB": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${date}`);
      case "MLS": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard?dates=${date}`);
      case "EPL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${date}`);
      case "COLLEGE-FOOTBALL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates=${date}`);
      case "WNBA": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard?dates=${date}`);
      default: return [];
    }
  }

  const year = new Date().getFullYear();
  switch (league) {
    case "NFL": return [`https://cdn.espn.com/core/nfl/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "NBA": return [`https://cdn.espn.com/core/nba/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "NHL": return [`https://cdn.espn.com/core/nhl/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "MLB": return [`https://cdn.espn.com/core/mlb/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "MLS": return [`https://cdn.espn.com/core/soccer/schedule/_/league/usa.1??dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "EPL": return [`https://cdn.espn.com/core/soccer/schedule/_/league/eng.1??dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "COLLEGE-FOOTBALL": return [`https://cdn.espn.com/core/college-football/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "WNBA": return [`https://cdn.espn.com/core/wnba/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    default: return [];
  }
}

export async function fetchScheduleData(endpoint: string, league: League, isScoreboardOnly: boolean = false) {
  const response = await fetch(endpoint);
  const data = await response.json();
  const scheduleData: Record<string, any> = {};

  // For scoreboards or leagues already using scoreboard
  if (league === "MBB" || league === "WBB" || league === "PGA" || isScoreboardOnly) {
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
    const games = rawSchedule[day].games || [];
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

export async function scrapeLeagueSchedules(league: League, scoreboardOnly: boolean = false): Promise<LeagueResponse> {
  const response: LeagueResponse = {
    scoreMatchupsCreated: 0,
    existingMatchups: 0,
    matchupsUpdated: 0,
    gamesOnSchedule: 0,
    error: "",
    data: []
  };

  const endpoints = getScheduleEndpoints(league, scoreboardOnly);
  if (!endpoints || endpoints.length === 0) {
    response.error = `No endpoints for ${league}`;
    return response;
  }

  const processedGameIds = new Set<string>();
  const parsedMatchups: any[] = [];

  for (const endpoint of endpoints) {
    try {
      const scheduleData = await fetchScheduleData(endpoint, league, scoreboardOnly);

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
            let statusDesc = competition.status?.type?.shortDetail || "Upcoming";
            if (status === "STATUS_SCHEDULED") {
              statusDesc = "Upcoming";
            }
            const defaultGameTime = new Date(game.date).getTime();

            for (let i = 0; i < numMatchups; i++) {
              const a = competitors[i * 2];
              const b = competitors[i * 2 + 1];

              const golferA = a.athlete || a.team;
              const golferB = b.athlete || b.team;

              const idA = String(a.id);
              const idB = String(b.id);
              const sortedIds = [idA, idB].sort();
              const matchupGameId = `${gameId}_${sortedIds[0]}_${sortedIds[1]}`;

              if (processedGameIds.has(matchupGameId)) continue;
              processedGameIds.add(matchupGameId);

              const currentPeriod = competition.status?.period || 1;
              const getScore = (c: any, p: number) => {
                 const ls = c.linescores?.find((ls: any) => ls.period === p);
                 return ls?.value ? ls.value : 0;
              };

              const getHolesPlayed = (c: any, p: number) => {
                 const ls = c.linescores?.find((ls: any) => ls.period === p);
                 return ls?.linescores?.length || 0;
              };

              const getTeeTime = (c: any, p: number) => {
                 const ls = c.linescores?.find((ls: any) => ls.period === p);
                 if (ls?.statistics?.categories?.[0]?.stats) {
                     for (const stat of ls.statistics.categories[0].stats) {
                         if (stat.displayValue && typeof stat.displayValue === 'string') {
                             const match = stat.displayValue.match(/[A-Z][a-z]{2} [A-Z][a-z]{2} \d{1,2}/);
                             if (match) {
                                 let dateStr = stat.displayValue;
                                 if (!/\d{4}/.test(dateStr)) {
                                     const year = new Date(defaultGameTime).getFullYear();
                                     dateStr = dateStr.replace(match[0], `${match[0]} ${year}`);
                                 }
                                 const parsed = new Date(dateStr).getTime();
                                 if (!isNaN(parsed)) return parsed;
                             }
                         }
                     }
                 }
                 return null;
              };

              const teeTimeA = getTeeTime(a, currentPeriod);
              const teeTimeB = getTeeTime(b, currentPeriod);

              let gameTime = defaultGameTime;
              if (teeTimeA && teeTimeB) {
                  gameTime = Math.min(teeTimeA, teeTimeB);
              } else if (teeTimeA) {
                  gameTime = teeTimeA;
              } else if (teeTimeB) {
                  gameTime = teeTimeB;
              }

              const scoreA = getScore(a, currentPeriod);
              const scoreB = getScore(b, currentPeriod);

              let rawStatus = competition.status?.type?.name || "STATUS_SCHEDULED";
              let finalStatusDesc = competition.status?.type?.shortDetail || "Upcoming";
              let finalStatus = "STATUS_SCHEDULED";

              if (MATCHUP_FINAL_STATUSES.includes(rawStatus) || finalStatusDesc.toLowerCase().includes('final')) {
                finalStatus = "STATUS_FINAL";
              } else if (MATCHUP_POSTPONED_STATUSES.includes(rawStatus)) {
                finalStatus = "STATUS_POSTPONED";
              } else if (MATCHUP_DELAYED_STATUSES.includes(rawStatus)) {
                finalStatus = "STATUS_DELAYED";
              } else {
                const holesA = getHolesPlayed(a, currentPeriod);
                const holesB = getHolesPlayed(b, currentPeriod);
                const pairingHolesPlayed = Math.min(holesA, holesB);

                if (holesA === 18 && holesB === 18) {
                    finalStatus = "STATUS_FINAL";
                    finalStatusDesc = "THRU F";
                } else if (holesA > 0 || holesB > 0) {
                    finalStatus = "STATUS_IN_PROGRESS";
                    finalStatusDesc = `THRU ${pairingHolesPlayed}`;
                } else if (MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus) || (rawStatus === "STATUS_SCHEDULED" && (scoreA > 0 || scoreB > 0))) {
                    finalStatus = "STATUS_IN_PROGRESS";
                } else {
                    finalStatus = "STATUS_SCHEDULED";
                    finalStatusDesc = "Upcoming";
                }
              }

              parsedMatchups.push({
                 startTime: gameTime,
                 active: true,
                 featured: false,
                 title: `Round ${currentPeriod} Total Score: ${golferA.displayName || golferA.name || 'Golfer A'} vs ${golferB.displayName || golferB.name || 'Golfer B'} (Lower Wins)`,
                 league,
                 type: "SCORE",
                 status: finalStatus,
                 statusDesc: finalStatusDesc,
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

          const homeScore = parseFloat(home.score || "0");
          const awayScore = parseFloat(away.score || "0");

          let rawStatus = competition.status?.type?.name || "STATUS_SCHEDULED";
          let finalStatusDesc = competition.status?.type?.shortDetail || "Upcoming";
          let finalStatus = "STATUS_SCHEDULED";

          if (MATCHUP_FINAL_STATUSES.includes(rawStatus) || finalStatusDesc.toLowerCase().includes('final')) {
              finalStatus = "STATUS_FINAL";
          } else if (MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus) || (rawStatus === "STATUS_SCHEDULED" && (homeScore > 0 || awayScore > 0))) {
              finalStatus = "STATUS_IN_PROGRESS";
          } else if (MATCHUP_POSTPONED_STATUSES.includes(rawStatus)) {
              finalStatus = "STATUS_POSTPONED";
          } else if (MATCHUP_DELAYED_STATUSES.includes(rawStatus)) {
              finalStatus = "STATUS_DELAYED";
          } else {
              finalStatus = "STATUS_SCHEDULED";
              finalStatusDesc = "Upcoming";
          }

          parsedMatchups.push({
             startTime: gameTime,
             active,
             featured: false,
             title: `Who will win? ${away.team.name} @ ${home.team.name}`,
             league,
             type: "SCORE",
             status: finalStatus,
             statusDesc: finalStatusDesc,
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
