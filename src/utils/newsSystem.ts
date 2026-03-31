import { Aircraft, Base, Side, AircraftStatus, Building } from "../types/entities";

export interface NewsEvent {
  id: string;
  timestamp: number;
  type: 'political' | 'military' | 'economic' | 'diplomatic' | 'threat';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  factionId?: string;
}

const factionNames: Record<string, string> = {
  'HOSTILE_1': 'Red Star Empire',
  'HOSTILE_2': 'Iron Guard Coalition',
  'HOSTILE_3': 'Crimson Legion',
  'HOSTILE_4': 'Shadow Syndicate',
  'HOSTILE_5': 'Steel Warlords',
  'HOSTILE_6': 'Frost Dominion',
  'ALLY_1': 'Blue Alliance',
  'ALLY_2': 'Golden Shield Pact',
  'NEUTRAL_1': 'Gray Wolves',
  'NEUTRAL_2': 'Silver Phoenix',
  'NEUTRAL_3': 'Bronze Federation',
};

export const getFactionName = (factionId?: string): string => {
  if (!factionId) return 'Unknown';
  return factionNames[factionId] || factionId;
};

const politicalEvents = [
  { title: "U.N. Security Council Emergency Session", description: "Military escalation in the region discussed. Peacekeepers on standby." },
  { title: "Diplomatic Talks Collapse", description: "Negotiations between major powers have stalled. Tensions rise." },
  { title: "New Alliance Formed", description: "Two regional powers announce strategic partnership." },
  { title: "Economic Sanctions Announced", description: "Trade embargo declared against hostile faction. Markets react." },
  { title: "Propaganda Campaign Intensifies", description: "State media broadcasts escalate jingoistic messaging." },
  { title: "Military Parade in Capital", description: "Show of force display by enemy forces. Message to the world." },
  { title: "Defector Seeks Asylum", description: "Senior military officer defects to neutral territory with intelligence." },
  { title: "Treaty Signed", description: "Ceasefire agreement reached. Will it hold?" },
  { title: "Cyberattack Detected", description: "Critical infrastructure hit. Who was behind it?" },
  { title: "Refugee Crisis Worsens", description: "Border regions overwhelmed. Humanitarian crisis developing." },
];

const militaryEvents = [
  { title: "Enemy Air Patrols Increased", description: "Increased aerial activity detected near the border." },
  { title: "SAM Battery Activated", description: "Long-range air defense systems going online." },
  { title: "Naval Task Force Deployed", description: "Carrier group entering the operational area." },
  { title: "Drone Swarm Spotted", description: "Unmanned aerial vehicles detected in reconnaissance patterns." },
  { title: "Supply Convoy Moving", description: "Logistics columns spotted moving toward front lines." },
  { title: "Electronic Warfare Detected", description: "Heavy jamming operations detected in the sector." },
  { title: "Artillery Positions Detected", description: "Ground-based batteries being deployed." },
  { title: "Special Forces Insertion", description: "Enemy commandos detected behind friendly lines." },
];

const threatAssessments = [
  { title: "CRITICAL: Imminent Strike", description: "Intelligence confirms attack is imminent. All units on high alert." },
  { title: "WARNING: Buildup Detected", description: "Massive troop and equipment buildup at enemy forward bases." },
  { title: "ALERT: Missile Threat", description: "Ballistic missile activity detected. Take cover protocols ready." },
  { title: "CAUTION: Scout Aircraft", description: "Enemy drones probing our defensive positions." },
  { title: "INFO: Training Exercise", description: "Enemy conducting large-scale drills. Real operation possible." },
];

const factionConflictEvents = [
  { title: "FACTION CLASH REPORTED", description: "Inter-faction fighting reported in contested airspace." },
  { title: "RIVALRY ESCALATES", description: "Two hostile factions engaging each other. Opportunity?" },
  { title: "TERRITORY DISPUTE", description: "Competing factions battling for strategic points." },
  { title: "FRACTURED ALLIANCE", description: "Former allies now fighting amongst themselves." },
  { title: "POWER VACUUM", description: "Faction weakened by internal conflict. Others circling." },
  { title: "BORDER SKIRMISH", description: "Patrols found engaging at coordinates. Area unstable." },
  { title: "AERIAL BATTLE", description: "Multiple aircraft from opposing factions engaged in combat." },
];

export const generateNewsEvent = (
  aircrafts: Aircraft[],
  hostileBases: Base[],
  friendlyBase: Base,
  buildings: Building[]
): NewsEvent | null => {
  const now = Date.now();
  const hostileAircraft = aircrafts.filter(a => a.side === Side.HOSTILE && a.status !== AircraftStatus.DESTROYED);
  const friendlyAircraft = aircrafts.filter(a => a.side === Side.FRIENDLY && a.status !== AircraftStatus.DESTROYED);
  
  const hostileThreat = hostileAircraft.length;
  const friendlyStrength = friendlyAircraft.length;
  
  const factionAircraft = aircrafts.filter(a => a.factionId && a.status !== AircraftStatus.DESTROYED);
  const fightingFactions = new Set<string>();
  factionAircraft.forEach(ac => {
    factionAircraft.forEach(target => {
      if (ac.factionId && target.factionId && ac.factionId !== target.factionId) {
        const dist = Math.sqrt(
          Math.pow(ac.position.lat - target.position.lat, 2) + 
          Math.pow(ac.position.lng - target.position.lng, 2)
        );
        if (dist < 2) {
          fightingFactions.add(ac.factionId);
          fightingFactions.add(target.factionId);
        }
      }
    });
  });
  
  let eventPool: { title: string; description: string }[] = [];
  
  if (hostileThreat > friendlyStrength * 2) {
    eventPool = [...threatAssessments.filter((_, i) => i % 2 === 0)];
  } else if (hostileThreat > 5) {
    eventPool = [...militaryEvents];
  } else {
    eventPool = [...politicalEvents];
  }
  
  if (fightingFactions.size >= 2) {
    eventPool = [...factionConflictEvents];
  }
  
  if (hostileBases.some(b => b.radarRange > 280)) {
    eventPool.push({ title: "WARNING: Advanced Radar Detected", description: "Long-range tracking systems spotted at enemy base." });
  }
  
  if (buildings.some(b => b.type === 'SAM_BATTERY')) {
    eventPool.push({ title: "Intel: SAM Sites Active", description: "Surface-to-air missile batteries operational in sector." });
  }
  
  if (friendlyAircraft.length > hostileThreat * 2) {
    eventPool.push({ title: "Air Superiority Achieved", description: "Friendly forces maintain dominance in the region." });
  }
  
  const selected = eventPool[Math.floor(Math.random() * eventPool.length)];
  if (!selected) return null;
  
  const severity: NewsEvent['severity'] = 
    hostileThreat > friendlyStrength * 2 ? 'critical' :
    hostileThreat > friendlyStrength ? 'high' :
    hostileThreat > 3 ? 'medium' : 'low';
  
  const isFactionConflict = eventPool === factionConflictEvents;
  const isMilitary = eventPool === militaryEvents || isFactionConflict;
  
  return {
    id: `news-${now}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: now,
    type: severity === 'critical' || severity === 'high' ? 'threat' : 
          isMilitary ? 'military' : 'political',
    title: selected.title,
    description: selected.description,
    severity,
    factionId: isFactionConflict ? Array.from(fightingFactions)[0] : undefined
  };
};

export const getNewsHeadlines = (
  aircrafts: Aircraft[],
  hostileBases: Base[],
  friendlyBase: Base,
  existingNews: NewsEvent[]
): NewsEvent[] => {
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  
  const recentNews = existingNews.filter(n => n.timestamp > oneHourAgo);
  if (recentNews.length >= 5) return existingNews;
  
  if (Math.random() > 0.3) return existingNews;
  
  const newEvent = generateNewsEvent(aircrafts, hostileBases, friendlyBase, friendlyBase.buildings);
  if (!newEvent) return existingNews;
  
  return [newEvent, ...existingNews].slice(0, 20);
};
