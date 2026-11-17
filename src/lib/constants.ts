export type GrahaId = 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn' | 'rahu' | 'ketu'

export interface Rashi {
  num: number; name: string; en: string; sym: string; element: string; style: string
  lord: GrahaId; color: string; keywords: string[]; vibe: string
}
export const RASHIS: Rashi[] = [
  { num: 1, name: 'Mesh', en: 'Aries', sym: '♈', element: 'Fire', style: 'Movable', lord: 'mars', color: '#f87171', keywords: ['Initiative', 'Courage', 'Speed'], vibe: 'Direct initiation, pioneering courage, fast action, independent drive.' },
  { num: 2, name: 'Brish', en: 'Taurus', sym: '♉', element: 'Earth', style: 'Fixed', lord: 'venus', color: '#fb923c', keywords: ['Stability', 'Value', 'Patience'], vibe: 'Steady accumulation, patience, sensory appreciation, durable value.' },
  { num: 3, name: 'Mithun', en: 'Gemini', sym: '♊', element: 'Air', style: 'Dual', lord: 'mercury', color: '#facc15', keywords: ['Curiosity', 'Speech', 'Adaptability'], vibe: 'Intellectual curiosity, communication, adaptability, skill synthesis.' },
  { num: 4, name: 'Karkat', en: 'Cancer', sym: '♋', element: 'Water', style: 'Movable', lord: 'moon', color: '#4ade80', keywords: ['Nurturing', 'Intuition', 'Roots'], vibe: 'Emotional intuition, protective care, deep memory, domestic roots.' },
  { num: 5, name: 'Singha', en: 'Leo', sym: '♌', element: 'Fire', style: 'Fixed', lord: 'sun', color: '#34d399', keywords: ['Authority', 'Creativity', 'Dignity'], vibe: 'Sovereign confidence, creative visibility, generosity, leadership.' },
  { num: 6, name: 'Kanya', en: 'Virgo', sym: '♍', element: 'Earth', style: 'Dual', lord: 'mercury', color: '#2dd4bf', keywords: ['Precision', 'Service', 'Analysis'], vibe: 'Analytical precision, practical refinement, helpful service.' },
  { num: 7, name: 'Tula', en: 'Libra', sym: '♎', element: 'Air', style: 'Movable', lord: 'venus', color: '#38bdf8', keywords: ['Harmony', 'Diplomacy', 'Balance'], vibe: 'Relational harmony, diplomacy, aesthetic balance, fairness.' },
  { num: 8, name: 'Brishchik', en: 'Scorpio', sym: '♏', element: 'Water', style: 'Fixed', lord: 'mars', color: '#60a5fa', keywords: ['Depth', 'Transformation', 'Resilience'], vibe: 'Deep psychological insight, transformation, intensity, resilience.' },
  { num: 9, name: 'Dhanu', en: 'Sagittarius', sym: '♐', element: 'Fire', style: 'Dual', lord: 'jupiter', color: '#818cf8', keywords: ['Wisdom', 'Purpose', 'Truth'], vibe: 'Philosophical exploration, higher truth, optimism, teaching.' },
  { num: 10, name: 'Makar', en: 'Capricorn', sym: '♑', element: 'Earth', style: 'Movable', lord: 'saturn', color: '#a78bfa', keywords: ['Discipline', 'Structure', 'Mastery'], vibe: 'Structured ambition, long-term discipline, duty, mastery.' },
  { num: 11, name: 'Kumbha', en: 'Aquarius', sym: '♒', element: 'Air', style: 'Fixed', lord: 'saturn', color: '#e879f9', keywords: ['Innovation', 'Networks', 'Systems'], vibe: 'Systems thinking, innovation, collective networks, humanitarian vision.' },
  { num: 12, name: 'Meen', en: 'Pisces', sym: '♓', element: 'Water', style: 'Dual', lord: 'jupiter', color: '#f472b6', keywords: ['Compassion', 'Imagination', 'Liberation'], vibe: 'Transcendent imagination, empathy, spiritual synthesis, surrender.' },
]

export const NAKSHATRAS: { name: string; lord: GrahaId; padas: string[] }[] = [
  { name: 'Ashwini', lord: 'ketu', padas: ['Chu', 'Che', 'Cho', 'La'] },
  { name: 'Bharani', lord: 'venus', padas: ['Li', 'Lu', 'Le', 'Lo'] },
  { name: 'Krittika', lord: 'sun', padas: ['A', 'I', 'U', 'E'] },
  { name: 'Rohini', lord: 'moon', padas: ['O', 'Va/Ba', 'Vi/Bi', 'Vu/Bu'] },
  { name: 'Mrigashira', lord: 'mars', padas: ['Ve/Be', 'Vo/Bo', 'Ka', 'Ki'] },
  { name: 'Ardra', lord: 'rahu', padas: ['Ku', 'Gha', 'Nga', 'Chha'] },
  { name: 'Punarvasu', lord: 'jupiter', padas: ['Ke', 'Ko', 'Ha', 'Hi'] },
  { name: 'Pushya', lord: 'saturn', padas: ['Hu', 'He', 'Ho', 'Da'] },
  { name: 'Ashlesha', lord: 'mercury', padas: ['Di', 'Du', 'De', 'Do'] },
  { name: 'Magha', lord: 'ketu', padas: ['Ma', 'Mi', 'Mu', 'Me'] },
  { name: 'Purva Phalguni', lord: 'venus', padas: ['Mo', 'Ta', 'Ti', 'Tu'] },
  { name: 'Uttara Phalguni', lord: 'sun', padas: ['Te', 'To', 'Pa', 'Pi'] },
  { name: 'Hasta', lord: 'moon', padas: ['Pu', 'Sha', 'Na', 'Tha'] },
  { name: 'Chitra', lord: 'mars', padas: ['Pe', 'Po', 'Ra', 'Ri'] },
  { name: 'Swati', lord: 'rahu', padas: ['Ru', 'Re', 'Ro', 'Ta'] },
  { name: 'Vishakha', lord: 'jupiter', padas: ['Ti', 'Tu', 'Te', 'To'] },
  { name: 'Anuradha', lord: 'saturn', padas: ['Na', 'Ni', 'Nu', 'Ne'] },
  { name: 'Jyeshtha', lord: 'mercury', padas: ['No', 'Ya', 'Yi', 'Yu'] },
  { name: 'Mula', lord: 'ketu', padas: ['Ye', 'Yo', 'Bha', 'Bhi'] },
  { name: 'Purva Ashadha', lord: 'venus', padas: ['Bhu', 'Dha', 'Pha', 'Dha'] },
  { name: 'Uttara Ashadha', lord: 'sun', padas: ['Bhe', 'Bho', 'Ja', 'Ji'] },
  { name: 'Shravana', lord: 'moon', padas: ['Ju/Khi', 'Je/Khu', 'Jo/Khe', 'Gha/Kho'] },
  { name: 'Dhanishta', lord: 'mars', padas: ['Ga', 'Gi', 'Gu', 'Ge'] },
  { name: 'Shatabhisha', lord: 'rahu', padas: ['Go', 'Sa', 'Si', 'Su'] },
  { name: 'Purva Bhadrapada', lord: 'jupiter', padas: ['Se', 'So', 'Da', 'Di'] },
  { name: 'Uttara Bhadrapada', lord: 'saturn', padas: ['Du', 'Tha', 'Jha', 'Da/Nya'] },
  { name: 'Revati', lord: 'mercury', padas: ['De', 'Do', 'Cha', 'Chi'] },
]

export interface Graha {
  id: GrahaId; name: string; nepali: string; short: string; sym: string; color: string; orbitR: number
  exalted: number; debilitated: number; own: number[]; friends: GrahaId[]; enemies: GrahaId[]
  special: number[]; combustOrb: number; meaning: string
}
export const GRAHAS: Record<GrahaId, Graha> = {
  sun: { id: 'sun', name: 'Sun', nepali: 'Surya', short: 'Su', sym: '☉', color: '#fbbf24', orbitR: 0.46, exalted: 0, debilitated: 6, own: [4], friends: ['moon', 'mars', 'jupiter'], enemies: ['venus', 'saturn'], special: [], combustOrb: 0, meaning: 'Core identity, vitality, authority, father, life purpose.' },
  moon: { id: 'moon', name: 'Moon', nepali: 'Chandra', short: 'Mo', sym: '☽', color: '#7dd3fc', orbitR: 0.23, exalted: 1, debilitated: 7, own: [3], friends: ['sun', 'mercury'], enemies: [], special: [], combustOrb: 12, meaning: 'Emotional mind, intuition, mother, comfort, memory.' },
  mars: { id: 'mars', name: 'Mars', nepali: 'Mangala', short: 'Ma', sym: '♂', color: '#f87171', orbitR: 0.55, exalted: 9, debilitated: 3, own: [0, 7], friends: ['sun', 'moon', 'jupiter'], enemies: ['mercury'], special: [4, 8], combustOrb: 17, meaning: 'Courage, physical energy, drive, focus, decisive execution.' },
  mercury: { id: 'mercury', name: 'Mercury', nepali: 'Budha', short: 'Me', sym: '☿', color: '#34d399', orbitR: 0.31, exalted: 5, debilitated: 11, own: [2, 5], friends: ['sun', 'venus'], enemies: ['moon'], special: [], combustOrb: 14, meaning: 'Intellect, speech, commerce, learning, adaptability.' },
  jupiter: { id: 'jupiter', name: 'Jupiter', nepali: 'Guru', short: 'Ju', sym: '♃', color: '#f59e0b', orbitR: 0.65, exalted: 3, debilitated: 9, own: [8, 11], friends: ['sun', 'moon', 'mars'], enemies: ['mercury', 'venus'], special: [5, 9], combustOrb: 11, meaning: 'Wisdom, expansion, dharma, mentors, higher learning.' },
  venus: { id: 'venus', name: 'Venus', nepali: 'Shukra', short: 'Ve', sym: '♀', color: '#f472b6', orbitR: 0.38, exalted: 11, debilitated: 5, own: [1, 6], friends: ['mercury', 'saturn'], enemies: ['sun', 'moon'], special: [], combustOrb: 10, meaning: 'Love, artistry, harmony, relationships, refinement.' },
  saturn: { id: 'saturn', name: 'Saturn', nepali: 'Shani', short: 'Sa', sym: '♄', color: '#818cf8', orbitR: 0.74, exalted: 6, debilitated: 0, own: [9, 10], friends: ['mercury', 'venus'], enemies: ['sun', 'moon', 'mars'], special: [3, 10], combustOrb: 15, meaning: 'Discipline, endurance, karma, structure, long-term mastery.' },
  rahu: { id: 'rahu', name: 'Rahu', nepali: 'N. Node', short: 'Ra', sym: '☊', color: '#c084fc', orbitR: 0.83, exalted: 1, debilitated: 7, own: [10], friends: ['venus', 'saturn'], enemies: ['sun', 'moon'], special: [5, 9], combustOrb: 0, meaning: 'Ambition, foreign breakthroughs, amplification, future hunger.' },
  ketu: { id: 'ketu', name: 'Ketu', nepali: 'S. Node', short: 'Ke', sym: '☋', color: '#94a3b8', orbitR: 0.83, exalted: 7, debilitated: 1, own: [7], friends: ['mars', 'jupiter'], enemies: ['sun', 'moon'], special: [5, 9], combustOrb: 0, meaning: 'Detachment, past-life mastery, sharp intuition, liberation.' },
}
export const GRAHA_ORDER: GrahaId[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu']

export interface House { num: number; sanskrit: string; english: string; type: string; horizon: string; karaka: string; domains: string[]; desc: string }
export const HOUSES: House[] = [
  { num: 1, sanskrit: 'Tanu Bhava', english: 'Self, Vitality & Life Path', type: 'Kendra', horizon: 'Eastern horizon (rising point)', karaka: 'Sun', domains: ['Body & vitality', 'Personality', 'Core identity', 'New beginnings'], desc: 'Self, body, vitality, temperament, appearance, and how you initiate life.' },
  { num: 2, sanskrit: 'Dhana Bhava', english: 'Wealth, Speech & Family', type: 'Panapara', horizon: 'Just below east horizon', karaka: 'Jupiter', domains: ['Savings', 'Speech', 'Early family', 'Values'], desc: 'Accumulated wealth, family lineage, speech, food, and core values.' },
  { num: 3, sanskrit: 'Sahaja Bhava', english: 'Courage, Skills & Siblings', type: 'Apoklima / Upachaya', horizon: 'Lower-east sky', karaka: 'Mars', domains: ['Courage', 'Writing & media', 'Skills', 'Younger siblings'], desc: 'Courage, self-effort, communication skills, short journeys, siblings.' },
  { num: 4, sanskrit: 'Sukha Bhava', english: 'Home, Mother & Inner Peace', type: 'Kendra', horizon: 'Nadir / IC (under feet)', karaka: 'Moon', domains: ['Inner peace', 'Mother & roots', 'Home & land', 'Early education'], desc: 'Mother, home, emotional peace, property, vehicles, inner foundations.' },
  { num: 5, sanskrit: 'Putra Bhava', english: 'Creativity, Intellect & Joy', type: 'Trikona', horizon: 'Lower-west sky', karaka: 'Jupiter', domains: ['Creativity', 'Intelligence', 'Children', 'Romance'], desc: 'Creativity, intelligence, romance, children, speculation, past merit.' },
  { num: 6, sanskrit: 'Ripu Bhava', english: 'Work Ethic, Health & Service', type: 'Dusthana / Upachaya', horizon: 'Just below west horizon', karaka: 'Mars', domains: ['Routines & service', 'Health', 'Problem-solving', 'Rivals'], desc: 'Daily routines, service, health recovery, analysis, and rivals.' },
  { num: 7, sanskrit: 'Kalatra Bhava', english: 'Marriage & Partnerships', type: 'Kendra', horizon: 'Western horizon (setting point)', karaka: 'Venus', domains: ['Marriage', 'Partnerships', 'Contracts', 'Public mirror'], desc: 'Marriage, committed partnerships, contracts, public dealings.' },
  { num: 8, sanskrit: 'Randhra Bhava', english: 'Transformation & Hidden Depth', type: 'Dusthana', horizon: 'Just above west horizon', karaka: 'Saturn', domains: ['Transformation', 'Research', 'Shared finances', 'Longevity'], desc: 'Deep transformation, longevity, research, mysteries, shared resources.' },
  { num: 9, sanskrit: 'Dharma Bhava', english: 'Wisdom, Purpose & Fortune', type: 'Trikona', horizon: 'Upper-west sky', karaka: 'Jupiter', domains: ['Higher wisdom', 'Teachers & father', 'Fortune', 'Long journeys'], desc: 'Dharma, philosophy, mentors, father, fortune, pilgrimages.' },
  { num: 10, sanskrit: 'Karma Bhava', english: 'Career, Status & Legacy', type: 'Kendra / Upachaya', horizon: 'Zenith / MC (overhead)', karaka: 'Mercury', domains: ['Career', 'Reputation', 'Authority', 'Worldly impact'], desc: 'Career, public reputation, authority, actions, worldly peak.' },
  { num: 11, sanskrit: 'Labha Bhava', english: 'Gains, Networks & Aspirations', type: 'Upachaya', horizon: 'Upper-east sky', karaka: 'Jupiter', domains: ['Income & gains', 'Fulfilled desires', 'Friends', 'Elder siblings'], desc: 'Financial gains, ambitions, elder siblings, networks, communities.' },
  { num: 12, sanskrit: 'Vyaya Bhava', english: 'Liberation, Rest & Foreign Lands', type: 'Dusthana', horizon: 'Just above east horizon', karaka: 'Saturn', domains: ['Spirituality', 'Foreign lands', 'Sleep', 'Letting go'], desc: 'Solitude, sleep, subconscious, expenses, foreign lands, liberation.' },
]

export const DIAMOND_CELLS = [
  { num: 1, poly: '250,16 367,133 250,250 133,133', cx: 250, cy: 133, rx: 250, ry: 224 },
  { num: 2, poly: '16,16 250,16 133,133', cx: 133, cy: 62, rx: 133, ry: 112 },
  { num: 3, poly: '16,16 133,133 16,250', cx: 62, cy: 133, rx: 112, ry: 133 },
  { num: 4, poly: '133,133 250,250 133,367 16,250', cx: 133, cy: 250, rx: 222, ry: 250 },
  { num: 5, poly: '16,250 133,367 16,484', cx: 62, cy: 367, rx: 112, ry: 367 },
  { num: 6, poly: '16,484 133,367 250,484', cx: 133, cy: 438, rx: 133, ry: 388 },
  { num: 7, poly: '250,250 367,367 250,484 133,367', cx: 250, cy: 367, rx: 250, ry: 278 },
  { num: 8, poly: '250,484 367,367 484,484', cx: 367, cy: 438, rx: 367, ry: 388 },
  { num: 9, poly: '484,484 367,367 484,250', cx: 438, cy: 367, rx: 388, ry: 367 },
  { num: 10, poly: '367,133 484,250 367,367 250,250', cx: 367, cy: 250, rx: 278, ry: 250 },
  { num: 11, poly: '484,16 484,250 367,133', cx: 438, cy: 133, rx: 388, ry: 133 },
  { num: 12, poly: '250,16 484,16 367,133', cx: 367, cy: 62, rx: 367, ry: 112 },
]

export const SOUTH_RASHI_POS: Record<number, [number, number]> = {
  12: [0, 0], 1: [1, 0], 2: [2, 0], 3: [3, 0], 11: [0, 1], 4: [3, 1], 10: [0, 2], 5: [3, 2], 9: [0, 3], 8: [1, 3], 7: [2, 3], 6: [3, 3],
}

export interface City { key: string; label: string; lat: number; lon: number; tzName: string }
/** offline fallback list for the place search; the UTC offset is NOT stored here, it is worked out from `tzName` and the birth date */
export const CITIES: City[] = [
  { key: 'ktm', label: 'Kathmandu, Bagmati, Nepal', lat: 27.7172, lon: 85.324, tzName: 'Asia/Kathmandu' },
  { key: 'bkt', label: 'Bhaktapur / Thimi, Bagmati, Nepal', lat: 27.6792, lon: 85.3885, tzName: 'Asia/Kathmandu' },
  { key: 'ltp', label: 'Lalitpur, Bagmati, Nepal', lat: 27.6588, lon: 85.3247, tzName: 'Asia/Kathmandu' },
  { key: 'pkr', label: 'Pokhara, Gandaki, Nepal', lat: 28.2096, lon: 83.9856, tzName: 'Asia/Kathmandu' },
  { key: 'brt', label: 'Biratnagar, Koshi, Nepal', lat: 26.4525, lon: 87.2718, tzName: 'Asia/Kathmandu' },
  { key: 'drn', label: 'Dharan, Koshi, Nepal', lat: 26.8065, lon: 87.2846, tzName: 'Asia/Kathmandu' },
  { key: 'btw', label: 'Butwal, Lumbini, Nepal', lat: 27.7006, lon: 83.4484, tzName: 'Asia/Kathmandu' },
  { key: 'jnk', label: 'Janakpur, Madhesh, Nepal', lat: 26.7288, lon: 85.926, tzName: 'Asia/Kathmandu' },
  { key: 'npg', label: 'Nepalgunj, Lumbini, Nepal', lat: 28.05, lon: 81.6167, tzName: 'Asia/Kathmandu' },
  { key: 'del', label: 'New Delhi, Delhi, India', lat: 28.6139, lon: 77.209, tzName: 'Asia/Kolkata' },
  { key: 'lon', label: 'London, England, United Kingdom', lat: 51.5074, lon: -0.1278, tzName: 'Europe/London' },
  { key: 'nyc', label: 'New York, New York, United States', lat: 40.7128, lon: -74.006, tzName: 'America/New_York' },
  { key: 'tyo', label: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503, tzName: 'Asia/Tokyo' },
  { key: 'syd', label: 'Sydney, New South Wales, Australia', lat: -33.8688, lon: 151.2093, tzName: 'Australia/Sydney' },
]
