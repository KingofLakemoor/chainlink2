export interface ScriptLessPayload {
  eventId: string;
  league: string; // E.g., 'SCRIPTLESS', 'SURVIVOR', 'HOT_ONES'
  name: string; // The specific episode or event name
  startTime: string; // ISO-8601 Timestamp
  status: 'STATUS_SCHEDULED' | 'STATUS_IN_PROGRESS' | 'STATUS_FINAL' | 'STATUS_POSTPONED' | 'STATUS_CANCELED';

  homeTeam: ScriptLessCompetitor;
  awayTeam: ScriptLessCompetitor;

  metric: string; // e.g., 'Total Swears', 'Minutes Survived'
  odds?: {
    spread?: number;
    mlHome?: number;
    mlAway?: number;
  };
}

export interface ScriptLessCompetitor {
  id: string; // A unique identifier for the competitor
  name: string; // The competitor's name
  logo?: string; // URL to their headshot or avatar
  score: number; // The current live total of the metric being tracked
}
