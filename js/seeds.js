// Focus Bloom — thoughtful starter garden for first run.

function isoDaysAgo(days, hour = 8) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function history(daysAgo, deltas) {
  return deltas.map((delta, index) => ({
    at: isoDaysAgo(daysAgo - index, 9 + index),
    delta,
  }));
}

export function seedGarden() {
  return [
    {
      title: "Morning walk loop",
      note: "A short lap before checking messages keeps the day soft around the edges.",
      kind: "habit",
      category: "health",
      target: 0,
      vitality: 84,
      createdAt: isoDaysAgo(16, 7),
      updatedAt: isoDaysAgo(0, 7),
      history: history(6, [1, 1, 1, 1, 1]),
    },
    {
      title: "Deep work hour",
      note: "Protect one hour for the thing that matters most.",
      kind: "habit",
      category: "work",
      target: 0,
      vitality: 58,
      createdAt: isoDaysAgo(11, 8),
      updatedAt: isoDaysAgo(1, 10),
      history: history(5, [1, 1, 1]),
    },
    {
      title: "Read twelve chapters",
      note: "A steady reading project with a visible finish line.",
      kind: "task",
      category: "learning",
      target: 12,
      progress: 5,
      createdAt: isoDaysAgo(9, 18),
      updatedAt: isoDaysAgo(1, 19),
      history: history(4, [2, 1, 2]),
    },
    {
      title: "Sketchbook week",
      note: "Seven daily pages of playful, low-stakes drawing.",
      kind: "task",
      category: "creative",
      target: 7,
      progress: 7,
      createdAt: isoDaysAgo(8, 17),
      updatedAt: isoDaysAgo(0, 18),
      history: history(6, [1, 1, 2, 1, 2]),
    },
    {
      title: "Plan family picnic",
      note: "Book the spot, collect food ideas, and send the warm invitation.",
      kind: "milestone",
      category: "relationships",
      target: 10,
      progress: 8,
      createdAt: isoDaysAgo(13, 12),
      updatedAt: isoDaysAgo(2, 14),
      history: history(7, [2, 1, 2, 1, 2]),
    },
    {
      title: "Evening reset",
      note: "A ten-minute tidy and a calm list for tomorrow.",
      kind: "habit",
      category: "mindfulness",
      target: 0,
      vitality: 32,
      createdAt: isoDaysAgo(15, 21),
      updatedAt: isoDaysAgo(3, 21),
      history: history(8, [1, 1]),
    },
    {
      title: "Launch tiny portfolio refresh",
      note: "A single-page update with better project snapshots and a kinder about section.",
      kind: "milestone",
      category: "work",
      target: 6,
      progress: 1,
      createdAt: isoDaysAgo(4, 11),
      updatedAt: isoDaysAgo(0, 11),
      history: history(1, [1]),
    },
  ];
}
