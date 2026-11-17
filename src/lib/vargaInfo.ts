import { MOON_CHART, SUN_CHART, VargaKind, kindOf } from './vargas'

/**
 * Plain-English description of every divisional chart: the exact rule, where the rule comes from, what the chart is about,
 * and what a weak / afflicted chart is traditionally read to mean (failure, bad luck, evils, trouble).
 * The classical readings follow Brihat Parashara Hora Shastra and the standard Jyotish teaching; where a school differs
 * it is said so instead of picking a side silently.
 */
export interface VargaInfo {
  n: number; name: string; kind: VargaKind
  theme: string        // one short line (used in the dropdown tooltip)
  rule: string         // exact calculation rule
  source: string       // where the rule comes from, and how firm it is
  about: string        // what this chart is related to
  strong: string       // what strong, well-placed planets here mean
  weak: string         // what weak / afflicted placements here mean - failure, bad luck, evils, hardship
  how: string          // how to read it
}

const TRADITION = 'Brihat Parashara Hora Shastra (BPHS), the Shodashavarga (sixteen-varga) scheme. This is the single accepted rule for this chart.'

export const INFO: Record<number, Omit<VargaInfo, 'n' | 'kind'>> = {
  1: {
    name: 'Rashi', theme: 'Body & overall life',
    rule: 'The planet\'s own sign. No division.',
    source: TRADITION,
    about: 'The main birth chart. It shows the body, health, appearance, temperament, and the outline of the whole life: family, money, siblings, home, children, work, marriage, gains and losses. Every other varga is a magnified view of one department of this chart.',
    strong: 'A strong lagna, a strong lagna lord and well-placed benefics give vitality, a stable personality, steady progress and general good fortune.',
    weak: 'An afflicted lagna or lagna lord (in the 6th/8th/12th, debilitated, or hit by malefics) gives a weak constitution, a struggle to establish oneself, repeated setbacks, and a sense of life being harder than it should be.',
    how: 'Read this first. A promise made here is only delivered if the matching divisional chart supports it.',
  },
  2: {
    name: 'Hora', theme: 'Wealth',
    rule: 'Each sign is cut into two halves of 15°. In odd signs the 1st half is Leo (Sun\'s hora) and the 2nd half Cancer (Moon\'s hora). In even signs it is reversed: 1st half Cancer, 2nd half Leo.',
    source: TRADITION + ' (Several other Hora systems exist in software, e.g. Kashinatha; the Parashara one is used here.)',
    about: 'Wealth and the way money comes. Sun-hora (Leo) planets point to wealth through own effort, authority, government, fame and self-earned resources. Moon-hora (Cancer) planets point to wealth through support, nurturing, public dealings, liquid assets, family and inheritance.',
    strong: 'Benefics and the 2nd/11th lords in the right hora, and planets gathered in the hora that matches their nature, give steady income, savings and accumulation.',
    weak: 'Malefics, debilitated or combust planets here show financial instability, loss of savings, debt, money slipping away, poverty in spite of effort, or income that comes from the "wrong" source for the person.',
    how: 'Count how many planets sit in each hora. A balanced picture with benefics supporting the wealth houses is good for money; heavy malefic concentration is a warning.',
  },
  3: {
    name: 'Drekkana', theme: 'Siblings & courage',
    rule: 'Each sign is cut into three parts of 10°. The 1st part is the sign itself, the 2nd is the 5th sign from it, the 3rd is the 9th sign from it.',
    source: TRADITION + ' (Parashara\'s rule; other Drekkana schemes such as Jagannatha exist but are not used here.)',
    about: 'Younger brothers and sisters, co-borns, courage, initiative, personal effort, valour, skills, and the "hands" of the person. Also used for the nature of the siblings.',
    strong: 'Strong planets give brave, self-made success, good support from siblings, and energy to carry things through.',
    weak: 'Afflicted placements show quarrels or separation from siblings, loss of siblings, cowardice or lack of drive, efforts that do not bear fruit, injuries, and fear.',
    how: 'Look at the 3rd house, its lord and Mars (karaka of courage) in this chart.',
  },
  4: {
    name: 'Chaturthamsa', theme: 'Property & fortune',
    rule: 'Each sign is cut into four parts of 7°30′. They go to the sign itself, then the 4th, 7th and 10th signs from it.',
    source: TRADITION,
    about: 'Property, land, houses and fixed assets, the home and residence, the mother\'s comforts, vehicles, and overall fortune (bhagya) in material possessions.',
    strong: 'Strong 4th house/lord here gives property, a settled home, ancestral gains and domestic peace.',
    weak: 'Afflictions show loss of property, disputes over land or house, repeated moves, no permanent home, loss of ancestral wealth, and domestic unhappiness.',
    how: 'Focus on the 4th house and lord, the Moon, and Mars (land).',
  },
  5: {
    name: 'Panchamsa', theme: 'Fame, power & merit',
    rule: 'Each sign is cut into five parts of 6°. Movable signs count from the sign itself, fixed signs from the 5th sign, dual signs from the 9th sign, then forward.',
    source: 'Parivritti (cyclical) Panchamsa: the version used in Jagannatha Hora (listed by P.V.R. Narasimha Rao among the parivritti charts) and given by K.N. Iyer. A second, Parashari-style table (odd signs Aries, Aquarius, Sagittarius, Gemini, Libra; even signs Taurus, Virgo, Pisces, Capricorn, Scorpio) is also published; software using it will differ.',
    about: 'Fame, power, authority, status, and spiritual merit carried from the past (purva-punya). It shows whether a person gets recognition and the right to lead.',
    strong: 'Strong benefics and a well-placed lagna lord show recognition, authority, a respected name, and merit that supports the person.',
    weak: 'Weak or afflicted placements show obscurity, no recognition for real effort, powerlessness, falls from position, loss of reputation, and spiritual dryness.',
    how: 'Read it as a refinement of the 5th house and the Sun in D1; it adds detail, it does not replace D1.',
  },
  6: {
    name: 'Shashthamsa', theme: 'Health, enemies & debts',
    rule: 'Each sign is cut into six parts of 5°. Odd signs count from Aries, even signs count from Libra.',
    source: 'NOT in BPHS\'s sixteen. This is the rule attributed to P.V.R. Narasimha Rao / Jagannatha Hora references and given in K. Srinivasa Sastry\'s listing (two independent write-ups agree). Other schools may divide it differently.',
    about: 'Health and disease, enemies, litigation, debts and obstacles. It shows what kind of troubles attack the person and how well they can fight them.',
    strong: 'Strong lagna and benefics here: good resistance, success over enemies and in court, health recovered quickly.',
    weak: 'Malefics or weak lords show chronic illness, hospital stays, debts, losing legal cases, hidden enemies, and recurring problems. The 6th and 8th houses from this chart\'s lagna are read for threats to the person\'s existence.',
    how: 'Check the lagna and its lord, then the 6th, 8th and 12th houses and their lords.',
  },
  7: {
    name: 'Saptamsa', theme: 'Children',
    rule: 'Each sign is cut into seven parts of 4°17′8.6″. In odd signs the count starts from the sign itself; in even signs it starts from the 7th sign.',
    source: TRADITION,
    about: 'Children and grandchildren: whether children come, when, how many, their nature, their luck, and the happiness or pain they bring. Also the continuation of the family line.',
    strong: 'Strong 5th house/lord and Jupiter (karaka of children) give children, healthy and fortunate, and joy through them.',
    weak: 'Affliction shows delay or denial of children, miscarriage, loss of a child, difficulty with children, and grief or anxiety through them. Some authorities hold that Saturn, Mercury or Venus on the lagna of this chart tend to deny progeny; the classics qualify that with other factors.',
    how: 'Read the 5th house, its lord and Jupiter, and compare with D1 5th house.',
  },
  8: {
    name: 'Ashtamsa', theme: 'Sudden events & longevity',
    rule: 'Each sign is cut into eight parts of 3°45′. Movable signs count from Aries, fixed signs from Sagittarius, dual signs from Leo.',
    source: 'NOT in BPHS\'s sixteen. Rule as given in Narasimha Rao\'s textbook and Jagannatha Hora\'s documentation (movable from Aries, fixed from Sagittarius, dual from Leo); also matches PyJHora. Some sites use a Navamsa-style pattern instead, which gives different results.',
    about: 'Sudden and unexpected events, hidden obstacles, the quality of longevity, litigation, inheritance, insurance and settlements, and chronic or long-drawn problems.',
    strong: 'Well-placed benefics show resilience, the ability to survive crises, and gains from inheritance or settlements.',
    weak: 'Afflictions show sudden reversals, accidents, scandals, legal trouble, betrayal, crises that arrive without warning, and vulnerability during dasha changes.',
    how: 'Look at the 8th house and lord, Saturn, and the nodes. A conflict with D1 softens the reading.',
  },
  9: {
    name: 'Navamsa', theme: 'Marriage & inner strength',
    rule: 'Each sign is cut into nine parts of 3°20′. Movable signs count from the sign itself, fixed signs from the 9th sign, dual signs from the 5th sign. (Same thing as: fire signs start from Aries, earth from Capricorn, air from Libra, water from Cancer.)',
    source: TRADITION,
    about: 'Marriage, the spouse and partnership; dharma; and above all the true strength of each planet. It is considered the "fruit" of the birth chart: D1 is the tree, D9 shows what it actually delivers. A planet in the same sign in D1 and D9 (vargottama) is greatly strengthened.',
    strong: 'Exalted, own-sign or vargottama planets and a strong 7th house/lord give a loving, supportive marriage, deep dharma and reliable results from the planets.',
    weak: 'Debilitated planets, or a weak 7th lord here, show marital discord, delay or breakdown of marriage, an unsupportive partner, loss of dharma and planets that fail to deliver what D1 promises.',
    how: 'Check the 7th house and lord, Venus (and Jupiter for women), vargottama planets, and each planet\'s dignity.',
  },
  10: {
    name: 'Dasamsa', theme: 'Career & status',
    rule: 'Each sign is cut into ten parts of 3°. In odd signs the count starts from the sign itself; in even signs it starts from the 9th sign.',
    source: TRADITION,
    about: 'Career, profession, achievements, public standing, authority and reputation; the kind of work the person does and how far they rise.',
    strong: 'Strong 10th house/lord, Sun, Saturn and benefics bring steady advancement, authority, and a name in society.',
    weak: 'Affliction shows job loss, blocked promotion, wrong career, scandal, disgrace, conflict with bosses, and effort that does not turn into rank.',
    how: 'Read the 10th house and lord, and the planets in the 10th; compare with D1 10th house.',
  },
  11: {
    name: 'Rudramsa', theme: 'Destruction & dissolution (Ekadasamsa)',
    rule: 'Each sign is cut into eleven parts of 2°43′38″. Count the signs from Aries to the sign being divided, then count that same number of signs backward from Aries: that is the start sign. The eleven parts then run forward from it.',
    source: 'NOT in BPHS\'s sixteen. Rule and worked examples from P.V.R. Narasimha Rao\'s textbook (Gemini 5th part goes to Gemini, Scorpio 7th part to Pisces); PyJHora implements the same. B.V. Raman counts differently, and Labhamsa-style writers use other rules.',
    about: 'The name comes from the eleven Rudras, the destroyers. Traditionally it is read for death, destruction and dissolution - what ends, what is lost, how things break down. Some modern writers read it as a chart of gains and endurance under pressure; the two readings are not the same and teachers disagree.',
    strong: 'Benefics well-placed suggest protection in crises, and endurance.',
    weak: 'Malefics and weak lords suggest crises, losses, reversals, and things coming to a painful end.',
    how: 'Use it as a secondary chart only; do not build a prediction on it alone.',
  },
  12: {
    name: 'Dwadasamsa', theme: 'Parents & heredity',
    rule: 'Each sign is cut into twelve parts of 2°30′. The count starts from the sign itself and goes forward.',
    source: TRADITION,
    about: 'Parents and their blood relatives, ancestry, heredity, family inheritance, the father\'s and mother\'s fortunes and what they pass on to the native.',
    strong: 'Strong Sun and Moon and strong 4th/9th lords show supportive, long-lived, fortunate parents and a good inheritance.',
    weak: 'Affliction shows troubles with parents, early loss of a parent, separation, lack of parental support, family curses or hereditary disease, and losses from the family line.',
    how: 'Sun and 9th house for the father, Moon and 4th house for the mother.',
  },
  16: {
    name: 'Shodasamsa', theme: 'Vehicles & comforts',
    rule: 'Each sign is cut into sixteen parts of 1°52′30″. Movable signs count from Aries, fixed signs from Leo, dual signs from Sagittarius.',
    source: TRADITION,
    about: 'Vehicles, conveyances, travel comforts, luxuries, and inner mental happiness and comfort.',
    strong: 'Strong Venus, 4th house/lord and benefics give vehicles, comforts and a contented mind.',
    weak: 'Affliction shows accidents with vehicles, losing vehicles, no comforts, constant unhappiness and discomfort, and unrest of mind.',
    how: 'Check Venus and the 4th house.',
  },
  20: {
    name: 'Vimsamsa', theme: 'Spiritual practice',
    rule: 'Each sign is cut into twenty parts of 1°30′. Movable signs count from Aries, fixed signs from Sagittarius, dual signs from Leo.',
    source: TRADITION,
    about: 'Spiritual practice, worship (upasana), devotion, religious inclination and the progress of spiritual evolution; also the occult studies a person takes to.',
    strong: 'Strong Jupiter, 5th and 9th houses give faith, a steady practice, a good guru and spiritual progress.',
    weak: 'Affliction shows lack of faith, doubts, wrong or abandoned practice, religious conflicts, being misled by false teachers, and spiritual stagnation.',
    how: 'Look at Jupiter, the 5th and 9th houses, and the 12th house for moksha.',
  },
  24: {
    name: 'Chaturvimsamsa', theme: 'Education (Siddhamsa)',
    rule: 'Each sign is cut into twenty-four parts of 1°15′. Odd signs count from Leo, even signs count from Cancer.',
    source: TRADITION,
    about: 'Learning, formal education, knowledge, academic success, degrees, and the capacity to master a subject.',
    strong: 'Strong Mercury, Jupiter and 4th/5th houses give success in studies, good memory, degrees and achievement.',
    weak: 'Afflicted placements show obstacles in education, failed exams, dropping out, poor memory, or knowledge that never turns into qualification. A debilitated planet here can block studies.',
    how: 'Mercury, Jupiter, and the 4th and 5th houses.',
  },
  27: {
    name: 'Bhamsa', theme: 'Strengths & weaknesses (Nakshatramsa)',
    rule: 'Each sign is cut into twenty-seven parts of 1°6′40″ (one nakshatra each). Fire signs count from Aries, earth signs from Cancer, air signs from Libra, water signs from Capricorn.',
    source: TRADITION,
    about: 'The inherent strengths and weaknesses of the person: stamina, willpower, mental toughness, natural abilities and the hidden flaws of character.',
    strong: 'Strong lagna and exalted or well-placed planets show strong stamina, good character and ability to recover.',
    weak: 'Afflicted placements show weak will, little stamina, inherent vulnerabilities, vices, and a tendency to give way under pressure.',
    how: 'Read the lagna, Moon (mind) and Mars (stamina) in D27.',
  },
  30: {
    name: 'Trimsamsa', theme: 'Misfortunes & evils',
    rule: 'Unequal parts, not 30 equal ones. Odd signs: 0–5° Mars (Aries), 5–10° Saturn (Aquarius), 10–18° Jupiter (Sagittarius), 18–25° Mercury (Gemini), 25–30° Venus (Libra). Even signs: 0–5° Venus (Taurus), 5–12° Mercury (Virgo), 12–20° Jupiter (Pisces), 20–25° Saturn (Capricorn), 25–30° Mars (Scorpio).',
    source: TRADITION,
    about: 'The chart of evils: misfortune, afflictions and punishments, diseases, accidents, calamities, enemies, the sub-conscious mind and moral weaknesses. The classics also use it for the character of the person, and especially for the conduct and character of women. It is the chart of "what goes wrong in a life".',
    strong: 'Benefics (Jupiter, Venus, Mercury) in strong positions here protect the person: few calamities, a clean character, and quick recovery.',
    weak: 'Malefics and weak planets here show repeated misfortune, chronic or hard-to-cure disease, accidents, humiliation, scandal, bad company, mental disturbance and punishment.',
    how: 'Check the lagna of D30 and its lord, the 6th, 8th and 12th houses, and the Moon. Check it with the D1 and the Moon chart.',
  },
  40: {
    name: 'Khavedamsa', theme: 'Maternal lineage & luck',
    rule: 'Each sign is cut into forty parts of 0°45′. Odd signs count from Aries, even signs count from Libra.',
    source: TRADITION + ' Rule verified against BPHS chapter 6, verse 29. Parts are only 45′ wide, so this chart is very sensitive to exact planetary positions and birth time.',
    about: 'The auspicious and inauspicious effects of the whole horoscope, read especially through the mother and the maternal ancestors: the mother\'s lineage, inheritance and karma from the mother\'s side, and the good or bad luck carried through that line.',
    strong: 'Strong benefics and a strong lagna suggest blessings, inheritance and good luck from the maternal side and generally auspicious events.',
    weak: 'Malefics and weak lords suggest inauspicious events, troubles with the mother or her family, debts and curses of the maternal line, and bad luck that seems to "run in the family".',
    how: 'Read the lagna, the 4th house, Moon and its dispositor. Confirm against D1 and D12 before concluding.',
  },
  45: {
    name: 'Akshavedamsa', theme: 'Paternal lineage & conduct',
    rule: 'Each sign is cut into forty-five parts of 0°40′. Movable signs count from Aries, fixed signs from Leo, dual signs from Sagittarius.',
    source: TRADITION + ' Parts are only 40′ wide, so this chart is very sensitive to exact planetary positions and birth time.',
    about: 'General indications of fortune and character: the father and the paternal ancestors, the person\'s conduct and moral behaviour, religious activities and the karma that comes through the father\'s line.',
    strong: 'Strong Sun, 9th house and benefics show a supportive father\'s line, good conduct, and blessings from the ancestors.',
    weak: 'Afflictions show troubles with the father or his family, loss of the paternal legacy, flaws of conduct, ancestral debts and bad luck passed through the father\'s side.',
    how: 'Read the lagna, the Sun and the 9th house.',
  },
  60: {
    name: 'Shashtiamsa', theme: 'Past-life karma',
    rule: 'Each sign is cut into sixty parts of 0°30′. The count starts from the sign itself and goes forward (equivalently: take the degrees in the sign, multiply by 2, ignore the fraction, count that many signs from the sign itself).',
    source: TRADITION + ' Parts are only 30′ wide: a 2-minute change in birth time changes the D60 lagna, which is why it is used for birth-time rectification.',
    about: 'The finest division: karma carried from past lives. Each of the 60 parts has its own name and a benefic or malefic nature in BPHS. It is considered the most important chart for what the planets will finally deliver, and the final test of a correct birth time.',
    strong: 'Planets in benefic Shashtiamsa and strong signs give the full results promised by D1 and a life that feels "blessed".',
    weak: 'Planets in malefic Shashtiamsa or debilitated signs cancel D1 promises: repeated failure, obstruction without visible cause, heavy karmic debts, and ill luck that cannot be explained by this life alone.',
    how: 'First check the birth time is right. Then look at the lagna, its lord and the planets that rule D1 lagna. (This app does not list the 60 individual Shashtiamsa names.)',
  },
  [MOON_CHART]: {
    name: 'Moon chart (Chandra Lagna)', theme: 'Mind, emotions & transits',
    rule: 'The same D1 signs, but the 1st house is the sign where the Moon sits. House numbers are counted from the Moon.',
    source: 'Standard Jyotish technique (Chandra Lagna). Not a divisional chart: no division of signs.',
    about: 'The mind, emotions, comfort and general welfare, seen from the Moon. Used alongside the Lagna chart for readings, and the Moon is the base for Vimshottari dasha, Sade Sati and Gochar (transit) results in Vedic practice.',
    strong: 'Benefics in the 1st, 4th, 5th, 7th, 9th, 10th from the Moon give a calm mind and good welfare.',
    weak: 'Malefics in the 6th, 8th, 12th from the Moon give worry, mental unrest, and emotional distress.',
    how: 'Read it together with the Lagna chart. Where both agree the result is firm.',
  },
  [SUN_CHART]: {
    name: 'Sun chart (Surya Lagna)', theme: 'Soul, status & father',
    rule: 'The same D1 signs, but the 1st house is the sign where the Sun sits. House numbers are counted from the Sun.',
    source: 'Standard Jyotish technique (Surya Lagna). Not a divisional chart: no division of signs.',
    about: 'The soul, vitality, authority, the father and one\'s standing and career in life, seen from the Sun.',
    strong: 'Benefics in kendras and trikonas from the Sun give status, vitality and a good name.',
    weak: 'Malefics in the 6th, 8th, 12th from the Sun give loss of status, trouble with authority, and weak vitality.',
    how: 'Read it with the Lagna chart and the 10th house for profession.',
  },
}

const HARMONIC = (n: number) => ({
  name: 'Harmonic', theme: 'No traditional meaning',
  rule: `Pure mathematics: the longitude is multiplied by ${n}, so each sign is cut into ${n} parts of ${(30 / n).toFixed(4)}° and the parts are counted round the zodiac from 0° Aries: sign = ⌊longitude × ${n} / 30⌋ (mod 12). (For N = 9 this gives exactly the Navamsa.)`,
  source: `NOT a traditional Vedic varga. BPHS and the standard Jyotish references do not define D${n}; the usual teaching lists it as "not used". This is the plain harmonic chart of Western/Addey-style astrology, shown only so you can see it. Do not read it with Vedic rules.`,
  about: 'No traditional signification exists for this number. The positions below are valid arithmetic, but there is no classical (Parashari or Jaimini) meaning attached to them.',
  strong: 'No traditional reading.',
  weak: 'No traditional reading.',
  how: 'Treat as an experiment. Use the 16 classical charts and D5, D6, D8 for real analysis.',
})

export const infoOf = (n: number): VargaInfo => ({ n, kind: kindOf(n), ...(INFO[n] ?? HARMONIC(n)) })

export const VARGA_NAMES = (n: number) => infoOf(n).name
export const vargaLabel = (n: number) => (n < 0 ? infoOf(n).name : `D${n} · ${infoOf(n).name}`)
export const KIND_LABEL: Record<VargaKind, { label: string; color: string }> = {
  classical: { label: 'Standard · BPHS (all software agrees)', color: '#34d399' },
  convention: { label: 'Other · Jagannatha Hora / school-based', color: '#94a3b8' },
  harmonic: { label: 'Other · harmonic only, no Vedic rule', color: '#fb7185' },
  rebased: { label: 'Reference chart', color: '#38bdf8' },
}
