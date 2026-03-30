import { NewsArticle } from '../types/geopolitics';
import { nanoid } from 'nanoid';

interface NewsTemplate {
  category: NewsArticle['category'];
  templates: {
    PATRIOTIC: string[];
    NEUTRAL: string[];
    HOSTILE: string[];
  };
}

export class NewsGeneratorSystem {
  private templates: NewsTemplate[] = [
    {
      category: 'MILITARY',
      templates: {
        PATRIOTIC: [
          'Our forces successfully intercepted $TARGET',
          'Strategic bombing campaign against $TARGET yields results',
          'Air superiority maintained over $TARGET region',
        ],
        NEUTRAL: [
          'Military engagement reported in $TARGET region',
          'Aircraft encounter over $TARGET',
          'Air operations ongoing in $TARGET area',
        ],
        HOSTILE: [
          'Aggressive military expansion by $TARGET forces',
          '$TARGET escalates military posture',
          'Unauthorized incursion by $TARGET aircraft',
        ],
      },
    },
    {
      category: 'DIPLOMATIC',
      templates: {
        PATRIOTIC: [
          'Alliance strengthened through talks with $TARGET',
          'International support affirms our position over $TARGET',
          'Diplomatic victory: $TARGET recognizes our sovereignty',
        ],
        NEUTRAL: [
          'Diplomatic discussions between our forces and $TARGET',
          'International conference addresses $TARGET situation',
          'Negotiations ongoing with $TARGET',
        ],
        HOSTILE: [
          '$TARGET rejects peace talks',
          'Hostile rhetoric from $TARGET increases tensions',
          '$TARGET isolates itself from international community',
        ],
      },
    },
    {
      category: 'ECONOMIC',
      templates: {
        PATRIOTIC: [
          'Economic growth fueled by defense contracts',
          'Trade advantages secured from $TARGET',
          'Infrastructure spending boosts regional economy',
        ],
        NEUTRAL: [
          'Economic impact assessment for $TARGET region',
          'Trade discussions between regions',
          'Defense spending increases',
        ],
        HOSTILE: [
          'Economic sanctions imposed on $TARGET',
          '$TARGET economic decline threatens stability',
          'Resource competition with $TARGET intensifies',
        ],
      },
    },
    {
      category: 'INCIDENT',
      templates: {
        PATRIOTIC: [
          'Our defensive systems thwart $TARGET attack',
          'Enemy sabotage attempt prevented',
          'Heroic action averts $TARGET provocation',
        ],
        NEUTRAL: [
          'Incident reported in $TARGET zone',
          'Cross-border incident under investigation',
          '$TARGET incident under review',
        ],
        HOSTILE: [
          'We respond to unprovoked attack by $TARGET',
          'Our response to $TARGET aggression',
          'Retaliation against $TARGET violations',
        ],
      },
    },
    {
      category: 'VICTORY',
      templates: {
        PATRIOTIC: [
          'Triumph: Complete victory over $TARGET',
          'Enemy $TARGET forces routed',
          'Strategic victory advances our position',
        ],
        NEUTRAL: [
          'Battle outcome: decisive result',
          'Engagement with $TARGET resolved',
          'Military operation concludes',
        ],
        HOSTILE: [
          'Devastating loss: $TARGET forces overwhelmed',
          '$TARGET military collapse imminent',
          'Victory turns tide of conflict',
        ],
      },
    },
    {
      category: 'SETBACK',
      templates: {
        PATRIOTIC: [
          'Tactical withdrawal preserves forces',
          'Strategic repositioning in response to $TARGET',
          'Our forces regroup to counterattack',
        ],
        NEUTRAL: [
          'Military setback reported',
          '$TARGET engagement results in retreat',
          'Forces regrouping',
        ],
        HOSTILE: [
          'Crushing defeat inflicted on $TARGET',
          '$TARGET forces flee battlefield',
          '$TARGET military in disarray',
        ],
      },
    },
  ];

  generateArticle(
    factionId: string,
    factionName: string,
    category: NewsArticle['category'],
    targetName: string,
    bias: NewsArticle['bias'],
    sourceEvent: string
  ): NewsArticle {
    const template = this.templates.find((t) => t.category === category);
    if (!template) {
      throw new Error(`Unknown news category: ${category}`);
    }

    const templateList = template.templates[bias];
    const headline = templateList[Math.floor(Math.random() * templateList.length)].replace(
      '$TARGET',
      targetName
    );

    const importance = this.calculateImportance(category, bias);

    return {
      id: nanoid(),
      timestamp: Date.now(),
      factionId,
      category,
      headline,
      body: `Recent developments in the conflict involving ${factionName} and ${targetName}.`,
      bias,
      sourceEvent,
      importance,
    };
  }

  private calculateImportance(
    category: NewsArticle['category'],
    bias: NewsArticle['bias']
  ): number {
    const baseImportance: Record<NewsArticle['category'], number> = {
      MILITARY: 8,
      DIPLOMATIC: 6,
      ECONOMIC: 5,
      INCIDENT: 7,
      VICTORY: 10,
      SETBACK: 9,
    };

    let importance = baseImportance[category];

    if (category === 'VICTORY' || category === 'SETBACK') {
      importance = 10;
    }

    if (bias === 'PATRIOTIC') importance += 1;
    if (bias === 'HOSTILE') importance -= 1;

    return Math.max(1, Math.min(10, importance));
  }

  determineBias(
    reportingFactionId: string,
    eventFactionId: string,
    relationshipQuality: number
  ): NewsArticle['bias'] {
    if (reportingFactionId === eventFactionId) return 'PATRIOTIC';
    if (relationshipQuality > 20) return 'NEUTRAL';
    if (relationshipQuality > -20) return 'NEUTRAL';
    return 'HOSTILE';
  }

  generateArticleVariants(
    factionId: string,
    factionName: string,
    category: NewsArticle['category'],
    targetName: string,
    sourceEvent: string
  ): NewsArticle[] {
    return [
      this.generateArticle(factionId, factionName, category, targetName, 'PATRIOTIC', sourceEvent),
      this.generateArticle(factionId, factionName, category, targetName, 'NEUTRAL', sourceEvent),
      this.generateArticle(factionId, factionName, category, targetName, 'HOSTILE', sourceEvent),
    ];
  }
}

export const newsGeneratorSystem = new NewsGeneratorSystem();
