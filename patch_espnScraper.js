import fs from 'fs';

let content = fs.readFileSync('src/services/espnScraper.ts', 'utf8');

const replacement = `                     homeTeam: {
                       id: String(homeCompetitor.id),
                       name: homeName,
                       image: (league as any === "CRICKET" ? MLC_LOGOS[String(homeCompetitor.id)] : undefined) || homeCompetitor?.athlete?.flag?.href || homeCompetitor?.team?.logo || "/icons/icon-256x256.png",
                       score: homeScore
                     },
                     awayTeam: {
                       id: String(awayCompetitor.id),
                       name: awayName,
                       image: (league as any === "CRICKET" ? MLC_LOGOS[String(awayCompetitor.id)] : undefined) || awayCompetitor?.athlete?.flag?.href || awayCompetitor?.team?.logo || "/icons/icon-256x256.png",
                       score: awayScore
                     },`;

content = content.replace(
`                     homeTeam: {
                       id: String(homeCompetitor.id),
                       name: homeName,
                       image: (league === "CRICKET" ? MLC_LOGOS[String(homeCompetitor.id)] : undefined) || homeCompetitor?.athlete?.flag?.href || homeCompetitor?.team?.logo || "/icons/icon-256x256.png",
                       score: homeScore
                     },
                     awayTeam: {
                       id: String(awayCompetitor.id),
                       name: awayName,
                       image: (league === "CRICKET" ? MLC_LOGOS[String(awayCompetitor.id)] : undefined) || awayCompetitor?.athlete?.flag?.href || awayCompetitor?.team?.logo || "/icons/icon-256x256.png",
                       score: awayScore
                     },`,
replacement
);

fs.writeFileSync('src/services/espnScraper.ts', content, 'utf8');
