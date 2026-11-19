// Plain-language guide to the 12 houses. Content only: edit the text here, the Learn page (src/pages/LearnPage.tsx) renders it.
// Order inside each house is top priority first: core (main meaning) -> secondary (strong, not the main meaning) -> minor (small items, body links).

export interface HouseGuide {
  n: number
  names: string          // Sanskrit name(s), e.g. "Tanu"
  groups: string[]       // Kendra, Trikona, Dusthana ...
  karaka: string         // natural significators
  body: string
  aspected: string       // which planets look at this house
  core: string[]
  secondary: string[]
  minor: string[]
  books: string          // "some books say ..." (sources disagree), may be empty
}

export const HOUSE_GUIDE: HouseGuide[] = [
  {
    "n": 1,
    "names": "Tanu",
    "groups": [
      "Kendra",
      "Trikona",
      "Dharma"
    ],
    "karaka": "Sun (Moon for mind and body)",
    "body": "Head",
    "aspected": "any planet from the 7th, Mars from the 6th and 10th, Jupiter from the 5th and 9th, Saturn from the 4th and 11th",
    "core": [
      "You, your identity, your existence",
      "Physical body and body structure",
      "Health, strength, vitality, energy",
      "Personality and nature",
      "Appearance and complexion",
      "Self-image and confidence",
      "General life direction and how you approach life"
    ],
    "secondary": [
      "Behaviour and attitude",
      "Natural abilities",
      "Intelligence",
      "Happiness and sadness, general well-being",
      "Childhood and early life",
      "Fame and recognition",
      "Life span (the strength of the 1st lord is checked)",
      "Your overall experience of life",
      "Starting point of the whole chart"
    ],
    "minor": [
      "Head, brain, skin"
    ],
    "books": ""
  },
  {
    "n": 2,
    "names": "Dhana",
    "groups": [
      "Maraka",
      "Artha",
      "Panapara"
    ],
    "karaka": "Jupiter (Mercury for speech, Venus for family and food in some books)",
    "body": "Face",
    "aspected": "any planet from the 8th, Mars from the 7th and 11th, Jupiter from the 6th and 10th, Saturn from the 5th and 12th",
    "core": [
      "Personal wealth, savings, bank balance",
      "Collected money and stored resources",
      "Family and family background",
      "Speech and way of speaking",
      "Food and eating habits"
    ],
    "secondary": [
      "Financial security",
      "Family values and traditions",
      "Early family environment",
      "Voice and speaking ability",
      "Jewellery, gold, precious stones, valuables",
      "A Maraka house (used in life-span study)"
    ],
    "minor": [
      "Mouth, teeth, tongue, face, right eye"
    ],
    "books": "early learning"
  },
  {
    "n": 3,
    "names": "Sahaja",
    "groups": [
      "Upachaya",
      "Kama",
      "Trishadaya",
      "Apoklima"
    ],
    "karaka": "Mars (Mercury for communication in some books)",
    "body": "Arms and throat",
    "aspected": "any planet from the 9th, Mars from the 8th and 12th, Jupiter from the 7th and 11th, Saturn from the 1st and 6th",
    "core": [
      "Younger brothers and sisters, and your bond with them",
      "Courage",
      "Confidence to take action and initiative",
      "Personal effort and hard work",
      "Communication, writing, speaking, sharing information",
      "Short trips"
    ],
    "secondary": [
      "Determination and willpower",
      "Self-made success",
      "Skills, hobbies, practical abilities",
      "Social media, journalism, publishing, marketing, sales, advertising",
      "Small business activities",
      "Neighbours and close contacts",
      "A life-span house (the 8th from the 8th)",
      "Stamina and sports"
    ],
    "minor": [
      "Hands, arms, shoulders, ears (right ear)"
    ],
    "books": "throat and voice, servants and helpers"
  },
  {
    "n": 4,
    "names": "Sukha / Bandhu",
    "groups": [
      "Kendra",
      "Moksha"
    ],
    "karaka": "Moon (mother). Mercury (education), Venus (vehicles, comforts), Mars (land and property)",
    "body": "Chest (heart is also listed)",
    "aspected": "any planet from the 10th, Mars from the 1st and 9th, Jupiter from the 8th and 12th, Saturn from the 2nd and 7th",
    "core": [
      "Mother and your bond with her",
      "Home, house, residence",
      "Inner peace and mental comfort",
      "Happiness",
      "Land, property, real estate",
      "Vehicles"
    ],
    "secondary": [
      "Emotional security, feeling safe",
      "Domestic and private life",
      "Relatives and kin (Bandhu)",
      "Childhood and family environment",
      "Basic and school education",
      "Comforts, luxuries, furniture, household items",
      "Homeland, place of birth, national roots",
      "Agriculture, farmland, gardens, buildings, fixed property"
    ],
    "minor": [
      "Chest and heart"
    ],
    "books": "wells and underground water, honor from rulers or the state, livestock"
  },
  {
    "n": 5,
    "names": "Putra",
    "groups": [
      "Trikona",
      "Dharma",
      "Panapara"
    ],
    "karaka": "Jupiter (Sun for power, Venus for romance in some books)",
    "body": "Stomach and upper digestion",
    "aspected": "any planet from the 11th, Mars from the 2nd and 10th, Jupiter from the 1st and 9th, Saturn from the 3rd and 8th",
    "core": [
      "Children and the first child",
      "Intelligence",
      "Education and knowledge",
      "Memory",
      "Creativity",
      "Romance and love affairs",
      "Past-life good deeds (Purva Punya)"
    ],
    "secondary": [
      "Pregnancy and childbirth (read with other factors)",
      "Wisdom, judgment, decision-making",
      "Mantras, spiritual practice, devotion, religious learning",
      "Creative arts: music, acting, writing, literature",
      "Talents and academic achievements",
      "Students and disciples",
      "Authority and power",
      "Advice you give and take",
      "Speculation, stock speculation, gambling, games, entertainment",
      "Your child’s spouse (the 11th house, which is the 7th from the 5th)"
    ],
    "minor": [
      "Stomach and upper digestive system"
    ],
    "books": "positions of trust, ministers and advisers, ancestral or past-life curses"
  },
  {
    "n": 6,
    "names": "Ari / Ripu",
    "groups": [
      "Dusthana",
      "Upachaya",
      "Artha",
      "Trishadaya",
      "Apoklima"
    ],
    "karaka": "Mars and Saturn (Mercury for maternal uncle in some books)",
    "body": "Intestines and waist (hips and lower abdomen are also listed)",
    "aspected": "any planet from the 12th, Mars from the 3rd and 11th, Jupiter from the 2nd and 10th, Saturn from the 4th and 9th",
    "core": [
      "Enemies, competitors, competition",
      "Diseases and health problems",
      "Debts and loans",
      "Disputes, arguments, legal conflicts, litigation",
      "Daily work and service"
    ],
    "secondary": [
      "Rivalries",
      "Obstacles and difficult situations",
      "Ability to beat enemies and overcome problems",
      "Recovery from illness",
      "Daily routine, discipline, responsibilities",
      "Employees, workers, servants, colleagues",
      "Accidents, injuries, wounds, physical pain, surgery",
      "Thieves and poison",
      "Hygiene and diet-related health",
      "Maternal uncle"
    ],
    "minor": [
      "Intestines, waist, hips, lower abdomen"
    ],
    "books": "agriculture, pets and small animals, stepmother, worry and mental stress"
  },
  {
    "n": 7,
    "names": "Yuvati / Kalatra",
    "groups": [
      "Kendra",
      "Maraka",
      "Kama"
    ],
    "karaka": "Venus (Jupiter for a woman’s husband; Mercury for business in some books)",
    "body": "Lower belly and reproductive area",
    "aspected": "any planet from the 1st, Mars from the 4th and 12th, Jupiter from the 3rd and 11th, Saturn from the 5th and 10th",
    "core": [
      "Marriage",
      "Husband or wife, life partner",
      "Married life",
      "Relationships",
      "Business partnerships and partners",
      "Contracts and agreements",
      "Public dealings"
    ],
    "secondary": [
      "The spouse’s nature",
      "Romantic relationships that lead to partnership",
      "Physical intimacy, sexual relationships, attraction",
      "Relationship happiness and conflicts, cooperation",
      "Joint business",
      "Clients and customers",
      "Negotiations",
      "Trade, buying and selling",
      "Open opponents",
      "People you deal with directly",
      "A Maraka house"
    ],
    "minor": [
      "Lower abdomen and reproductive areas"
    ],
    "books": "foreign travel"
  },
  {
    "n": 8,
    "names": "Randhra / Ayu",
    "groups": [
      "Dusthana",
      "Moksha",
      "Panapara"
    ],
    "karaka": "Saturn (Mars for sudden events in some books)",
    "body": "Private parts",
    "aspected": "any planet from the 2nd, Mars from the 1st and 5th, Jupiter from the 4th and 12th, Saturn from the 6th and 11th",
    "core": [
      "Longevity and life span",
      "Death-related matters and manner of death",
      "Sudden changes and unexpected events",
      "Inheritance",
      "Hidden wealth",
      "Secrets and hidden information",
      "Research and occult knowledge"
    ],
    "secondary": [
      "Major life changes and transformation",
      "Sudden gains, sudden losses, sudden falls",
      "Wills, legacies, family inheritance, ancestral property",
      "Unearned money",
      "Insurance, joint assets, spouse’s money, other people’s resources",
      "Gifts or money from a spouse",
      "Mysteries, astrology, tantra, hidden mantra practice, deep spiritual research",
      "Psychology (modern view)",
      "Private matters and secret relationships",
      "Chronic health problems",
      "Fear, trauma, insults, defeat",
      "Spouse’s life span for a woman (Mangalya sthana)"
    ],
    "minor": [
      "Genital and reproductive organs"
    ],
    "books": "in-law matters, sins and debts carried over"
  },
  {
    "n": 9,
    "names": "Dharma / Bhagya",
    "groups": [
      "Trikona",
      "Dharma",
      "Apoklima"
    ],
    "karaka": "Sun (father), Jupiter (guru and fortune)",
    "body": "Thighs (hips are also listed)",
    "aspected": "any planet from the 3rd, Mars from the 2nd and 6th, Jupiter from the 1st and 5th, Saturn from the 7th and 12th",
    "core": [
      "Fortune and luck",
      "Father and your bond with him",
      "Guru and spiritual teacher",
      "Religion",
      "Dharma (right conduct and duty)",
      "Higher education",
      "Long-distance journeys"
    ],
    "secondary": [
      "Philosophy and spirituality",
      "Faith, God, blessings, religious beliefs",
      "Good deeds",
      "Scriptures, Vedic studies, traditional knowledge",
      "Pilgrimages, holy places, temples, religious institutions",
      "Universities, professors, mentors, higher learning",
      "Wisdom, ethics, morality",
      "Law and justice",
      "Charity and donations",
      "Foreign travel and fortune away from birthplace",
      "Merit stored from past lives",
      "Intuition, the higher mind, grace",
      "Grandchildren (the 5th from the 5th)"
    ],
    "minor": [
      "Hips and thighs"
    ],
    "books": "penance (Tapas), spouse of a younger sibling (the 7th from the 3rd)"
  },
  {
    "n": 10,
    "names": "Karma",
    "groups": [
      "Kendra",
      "Upachaya",
      "Artha"
    ],
    "karaka": "Sun, Mercury, Jupiter, Saturn",
    "body": "Knees",
    "aspected": "any planet from the 4th, Mars from the 3rd and 7th, Jupiter from the 2nd and 6th, Saturn from the 1st and 8th",
    "core": [
      "Career and profession",
      "Job, business, work",
      "Professional success",
      "Reputation and public image",
      "Authority",
      "Status in society"
    ],
    "secondary": [
      "Government, administration, politics, public service",
      "Leadership, management",
      "Responsibility and duties",
      "Professional achievements, promotion, awards",
      "Fame and recognition",
      "Social position and power",
      "Bosses and authority figures",
      "Work decisions and major actions in life",
      "The deeds you perform",
      "Livelihood (Ajiva)",
      "The top point of the chart"
    ],
    "minor": [
      "Knees"
    ],
    "books": "father (9th is used by most schools), honor from rulers, command and rule"
  },
  {
    "n": 11,
    "names": "Labha",
    "groups": [
      "Upachaya",
      "Kama",
      "Trishadaya",
      "Panapara"
    ],
    "karaka": "Jupiter (Mercury for friends and gains in some books)",
    "body": "Calves and ankles",
    "aspected": "any planet from the 5th, Mars from the 4th and 8th, Jupiter from the 3rd and 7th, Saturn from the 2nd and 9th",
    "core": [
      "Income",
      "Financial gains, profits, financial growth",
      "Fulfilment of wishes and desires",
      "Elder brothers and sisters",
      "Friends",
      "Social networks"
    ],
    "secondary": [
      "Professional income, business profits, gains from career",
      "Multiple sources of income",
      "Rewards, bonuses, benefits, investment gains",
      "Recovery of money, including money you lent",
      "Ambitions, hopes, long-term goals",
      "Success in goals and achievements",
      "Influential friends and support from others",
      "Networking and social circles",
      "Communities, groups, large organisations",
      "Recognition through networks",
      "Your child’s spouse"
    ],
    "minor": [
      "Calves, ankles, left ear"
    ],
    "books": ""
  },
  {
    "n": 12,
    "names": "Vyaya",
    "groups": [
      "Dusthana",
      "Moksha",
      "Apoklima"
    ],
    "karaka": "Saturn (Ketu for liberation, Venus for bed pleasures)",
    "body": "Feet and left eye",
    "aspected": "any planet from the 6th, Mars from the 5th and 9th, Jupiter from the 4th and 8th, Saturn from the 3rd and 10th",
    "core": [
      "Expenses",
      "Financial losses and money going out",
      "Sleep",
      "Bed comforts and bed pleasures",
      "Foreign lands and living abroad",
      "Isolation",
      "Liberation (Moksha) and spiritual freedom"
    ],
    "secondary": [
      "Spending on luxury, spirituality, travel, good causes",
      "Foreign residence, connections, settlement",
      "Long stays away from home",
      "Solitude, meditation, spiritual withdrawal, retreats",
      "Giving up attachments and detachment",
      "Charity and donations",
      "Hospitals, prisons, ashrams, monasteries",
      "Hidden places and hidden enemies",
      "Private life, secret activities, secret affairs",
      "Imprisonment and losses",
      "Deep sleep and dreams (modern view)"
    ],
    "minor": [
      "Feet and left eye"
    ],
    "books": "fines and penalties (Danda), sins, loss of position"
  }
]

/** Any house can stand for a relative's life: count from that relative's house as if it were the 1st. */
export const DERIVED_HOUSES: string[] = [
  "Child’s spouse: 11th (7th from the 5th)",
  "Spouse’s money: 8th (2nd from the 7th)",
  "Younger sibling’s spouse: 9th (7th from the 3rd)",
  "Grandchildren: 9th (5th from the 5th)",
  "Child’s career: 2nd (10th from the 5th)"
]

export const DISAGREEMENTS: string[] = [
  "Father: 9th for most, 10th for some, 4th for others.",
  "Agriculture: your text lists it under the 6th, and the 4th also holds land and farmland. Sources vary.",
  "Rahu and Ketu aspects: disputed.",
  "Body parts: your text and the Kala Purusha map differ slightly in a few houses."
]