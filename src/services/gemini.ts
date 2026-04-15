import { CircadianProfile, Recommendation } from '../types';

// Fallback recommendations
function getFallbackRecommendations(profile: CircadianProfile): Recommendation[] {
  const recs: Recommendation[] = [];

  if (profile.lateNightScreenCorrelation > 0.3) {
    recs.push({
      title: 'Reduce Late-Night Screen Use',
      description: `Your data shows a strong correlation between screen use after 22:00 and delayed sleep onset. Try stopping screens 90 minutes before your usual bedtime.`,
      icon: 'Smartphone',
      articleUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4262447/'
    });
  }

  if (profile.sleepDebt > 3) {
    recs.push({
      title: 'Address Your Sleep Debt',
      description: `You've accumulated ${profile.sleepDebt.toFixed(1)} hours of sleep debt over the past week. Prioritise an earlier, consistent bedtime to recover gradually.`,
      icon: 'Moon',
      articleUrl: 'https://pubmed.ncbi.nlm.nih.gov/12683469/'
    });
  }

  if (profile.rhythmStability === 'Irregular') {
    recs.push({
      title: 'Stabilise Your Sleep Schedule',
      description: 'Your sleep timing varies significantly day-to-day. A fixed wake time — even on weekends — is the single most effective way to reduce social jetlag.',
      icon: 'Sun',
      articleUrl: 'https://pubmed.ncbi.nlm.nih.gov/16842544/'
    });
  } else if (profile.rhythmStability === 'Moderately stable') {
    recs.push({
      title: 'Improve Rhythm Consistency',
      description: 'Your sleep timing shows moderate variability. Try to keep your bedtime within a 30-minute window each night to strengthen your circadian signal.',
      icon: 'Zap'
    });
  }

  if (profile.chronotype === 'Evening Type (Late)') {
    recs.push({
      title: 'Morning Light Exposure',
      description: 'As an evening chronotype, getting bright outdoor light (≥1000 lux) within 30 minutes of waking can help advance your circadian phase over time.',
      icon: 'Sun',
      articleUrl: 'https://pubmed.ncbi.nlm.nih.gov/12784438/'
    });
  }

  if (profile.averageSleepDuration < 6.5) {
    recs.push({
      title: 'Increase Sleep Duration',
      description: `Your average sleep of ${profile.averageSleepDuration.toFixed(1)}h is below recommended levels. Chronic short sleep impairs cognitive function and immune response.`,
      icon: 'Moon'
    });
  }

  recs.push({
    title: 'Time Your First Meal',
    description: 'Eating your first meal within 1–2 hours of waking acts as a zeitgeber, reinforcing your peripheral clocks and improving metabolic alignment.',
    icon: 'Coffee',
    articleUrl: 'https://pubmed.ncbi.nlm.nih.gov/28578930/'
  });

  return recs.slice(0, 5);
}

export async function getAIRecommendations(profile: CircadianProfile): Promise<Recommendation[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.info('[Circadia] No VITE_GEMINI_API_KEY found — using built-in recommendations.');
    return getFallbackRecommendations(profile);
  }

  const prompt = `You are a chronobiologist. Based on the following circadian profile, provide exactly 5 personalized, evidence-based lifestyle recommendations. Respond ONLY with a valid JSON array, no preamble, no markdown fences.

Profile:
- Chronotype: ${profile.chronotype}
- Sleep Regularity Score: ${profile.sleepRegularityScore.toFixed(1)}/100
- Rhythm Stability: ${profile.rhythmStability}
- Average Sleep Duration: ${profile.averageSleepDuration.toFixed(1)} hours
- Weekly Sleep Debt: ${profile.sleepDebt.toFixed(1)} hours
- Late-Night Screen Correlation with sleep delay: ${profile.lateNightScreenCorrelation.toFixed(3)}
- Biological Day Start: ${profile.biologicalDayStart}
- Peak Activity Window: ${profile.peakActivityWindow}

Return a JSON array of exactly 5 objects, each with:
- "title": string (short title)
- "description": string (1-2 sentences, specific and actionable)
- "icon": one of "Moon", "Sun", "Zap", "Smartphone", "Coffee"
- "articleUrl": string (optional, a real pubmed or reputable URL)`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
        })
      }
    );

    if (!response.ok) {
      console.warn('[Circadia] Gemini API error:', response.status, '— using fallback.');
      return getFallbackRecommendations(profile);
    }

    const result = await response.json();
    const text: string = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    const clean = text.replace(/```json|```/gi, '').trim();
    const parsed = JSON.parse(clean);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Recommendation[];
    }
    return getFallbackRecommendations(profile);
  } catch (err) {
    console.warn('[Circadia] Gemini request failed — using fallback.', err);
    return getFallbackRecommendations(profile);
  }
}