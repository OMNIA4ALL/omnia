/**
 * OMNIA Learn & Science Module
 * Safe scientific calculator (ZERO eval), complete 118-element periodic table, and interactive solvers.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage;

  const ELEMENTS = [
  {
    "num": 1,
    "sym": "H",
    "name": "Hydrogen",
    "mass": 1.008,
    "cat": "Diatomic Nonmetal",
    "phase": "Gas",
    "config": "1s\u00b9",
    "summary": "Most abundant chemical element in the universe."
  },
  {
    "num": 2,
    "sym": "He",
    "name": "Helium",
    "mass": 4.0026,
    "cat": "Noble Gas",
    "phase": "Gas",
    "config": "1s\u00b2",
    "summary": "Colorless, odorless noble gas; second most abundant."
  },
  {
    "num": 3,
    "sym": "Li",
    "name": "Lithium",
    "mass": 6.94,
    "cat": "Alkali Metal",
    "phase": "Solid",
    "config": "[He] 2s\u00b9",
    "summary": "Lightest metal; cornerstone of high-density battery storage."
  },
  {
    "num": 4,
    "sym": "Be",
    "name": "Beryllium",
    "mass": 9.0122,
    "cat": "Alkaline Earth",
    "phase": "Solid",
    "config": "[He] 2s\u00b2",
    "summary": "Relatively rare metal in the universe; forms emerald crystals."
  },
  {
    "num": 5,
    "sym": "B",
    "name": "Boron",
    "mass": 10.81,
    "cat": "Metalloid",
    "phase": "Solid",
    "config": "[He] 2s\u00b2 2p\u00b9",
    "summary": "Metalloid used in borosilicate glassware, ceramics, and semiconductors."
  },
  {
    "num": 6,
    "sym": "C",
    "name": "Carbon",
    "mass": 12.011,
    "cat": "Polyatomic Nonmetal",
    "phase": "Solid",
    "config": "[He] 2s\u00b2 2p\u00b2",
    "summary": "Chemical basis of all known organic life; graphite, diamond, fullerenes."
  },
  {
    "num": 7,
    "sym": "N",
    "name": "Nitrogen",
    "mass": 14.007,
    "cat": "Diatomic Nonmetal",
    "phase": "Gas",
    "config": "[He] 2s\u00b2 2p\u00b3",
    "summary": "Makes up approximately 78% of Earth atmosphere."
  },
  {
    "num": 8,
    "sym": "O",
    "name": "Oxygen",
    "mass": 15.999,
    "cat": "Diatomic Nonmetal",
    "phase": "Gas",
    "config": "[He] 2s\u00b2 2p\u2074",
    "summary": "Crucial for aerobic respiration; 21% of atmosphere and 46% of Earth crust."
  },
  {
    "num": 9,
    "sym": "F",
    "name": "Fluorine",
    "mass": 18.998,
    "cat": "Diatomic Nonmetal",
    "phase": "Gas",
    "config": "[He] 2s\u00b2 2p\u2075",
    "summary": "Most electronegative and reactive chemical element."
  },
  {
    "num": 10,
    "sym": "Ne",
    "name": "Neon",
    "mass": 20.18,
    "cat": "Noble Gas",
    "phase": "Gas",
    "config": "[He] 2s\u00b2 2p\u2076",
    "summary": "Gives off iconic reddish-orange glow in high-voltage discharge tubes."
  },
  {
    "num": 11,
    "sym": "Na",
    "name": "Sodium",
    "mass": 22.99,
    "cat": "Alkali Metal",
    "phase": "Solid",
    "config": "[Ne] 3s\u00b9",
    "summary": "Soft, highly reactive alkali metal; essential for cellular nerve signaling."
  },
  {
    "num": 12,
    "sym": "Mg",
    "name": "Magnesium",
    "mass": 24.305,
    "cat": "Alkaline Earth",
    "phase": "Solid",
    "config": "[Ne] 3s\u00b2",
    "summary": "Lightweight structural metal and key chlorophyll enzymatic catalyst."
  },
  {
    "num": 13,
    "sym": "Al",
    "name": "Aluminium",
    "mass": 26.982,
    "cat": "Post Transition",
    "phase": "Solid",
    "config": "[Ne] 3s\u00b2 3p\u00b9",
    "summary": "Most abundant metal in Earth crust; highly recyclable and corrosion-resistant."
  },
  {
    "num": 14,
    "sym": "Si",
    "name": "Silicon",
    "mass": 28.085,
    "cat": "Metalloid",
    "phase": "Solid",
    "config": "[Ne] 3s\u00b2 3p\u00b2",
    "summary": "Semiconductor bedrock of computing, microelectronics, and solar photovoltaics."
  },
  {
    "num": 15,
    "sym": "P",
    "name": "Phosphorus",
    "mass": 30.974,
    "cat": "Polyatomic Nonmetal",
    "phase": "Solid",
    "config": "[Ne] 3s\u00b2 3p\u00b3",
    "summary": "Essential structural component of DNA, RNA, ATP, and phospholipids."
  },
  {
    "num": 16,
    "sym": "S",
    "name": "Sulfur",
    "mass": 32.06,
    "cat": "Polyatomic Nonmetal",
    "phase": "Solid",
    "config": "[Ne] 3s\u00b2 3p\u2074",
    "summary": "Bright yellow crystalline solid used in battery production and vulcanization."
  },
  {
    "num": 17,
    "sym": "Cl",
    "name": "Chlorine",
    "mass": 35.45,
    "cat": "Diatomic Nonmetal",
    "phase": "Gas",
    "config": "[Ne] 3s\u00b2 3p\u2075",
    "summary": "Yellow-green halogen essential for water sanitation and PVC plastics."
  },
  {
    "num": 18,
    "sym": "Ar",
    "name": "Argon",
    "mass": 39.948,
    "cat": "Noble Gas",
    "phase": "Gas",
    "config": "[Ne] 3s\u00b2 3p\u2076",
    "summary": "Third most abundant atmospheric gas; used as inert shield in metallurgy."
  },
  {
    "num": 19,
    "sym": "K",
    "name": "Potassium",
    "mass": 39.098,
    "cat": "Alkali Metal",
    "phase": "Solid",
    "config": "[Ar] 4s\u00b9",
    "summary": "Vital biological electrolyte regulating heartbeat and osmotic equilibrium."
  },
  {
    "num": 20,
    "sym": "Ca",
    "name": "Calcium",
    "mass": 40.078,
    "cat": "Alkaline Earth",
    "phase": "Solid",
    "config": "[Ar] 4s\u00b2",
    "summary": "Fifth most abundant element in Earth crust; vital for bones and teeth."
  },
  {
    "num": 21,
    "sym": "Sc",
    "name": "Scandium",
    "mass": 44.956,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Ar] 3d\u00b9 4s\u00b2",
    "summary": "Lightweight transition metal used in aerospace framing and sporting alloys."
  },
  {
    "num": 22,
    "sym": "Ti",
    "name": "Titanium",
    "mass": 47.867,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Ar] 3d\u00b2 4s\u00b2",
    "summary": "Highest strength-to-density ratio among metals; biocompatible and corrosion-proof."
  },
  {
    "num": 23,
    "sym": "V",
    "name": "Vanadium",
    "mass": 50.942,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Ar] 3d\u00b3 4s\u00b2",
    "summary": "Steel alloying element improving tensile strength; used in flow batteries."
  },
  {
    "num": 24,
    "sym": "Cr",
    "name": "Chromium",
    "mass": 51.996,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Ar] 3d\u2075 4s\u00b9",
    "summary": "Steely-gray, lustrous metal that gives stainless steel its non-corrosive quality."
  },
  {
    "num": 25,
    "sym": "Mn",
    "name": "Manganese",
    "mass": 54.938,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Ar] 3d\u2075 4s\u00b2",
    "summary": "Crucial component in industrial steelmaking and lithium EV batteries."
  },
  {
    "num": 26,
    "sym": "Fe",
    "name": "Iron",
    "mass": 55.845,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Ar] 3d\u2076 4s\u00b2",
    "summary": "Most common element on Earth by total mass; active core of hemoglobin."
  },
  {
    "num": 27,
    "sym": "Co",
    "name": "Cobalt",
    "mass": 58.933,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Ar] 3d\u2077 4s\u00b2",
    "summary": "Ferromagnetic metal critical for high-energy lithium battery cathodes."
  },
  {
    "num": 28,
    "sym": "Ni",
    "name": "Nickel",
    "mass": 58.693,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Ar] 3d\u2078 4s\u00b2",
    "summary": "Ductile metal used in stainless superalloys, plating, and rechargeables."
  },
  {
    "num": 29,
    "sym": "Cu",
    "name": "Copper",
    "mass": 63.546,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Ar] 3d\u00b9\u2070 4s\u00b9",
    "summary": "Premier electrical and thermal conductor fundamental to modern power grids."
  },
  {
    "num": 30,
    "sym": "Zn",
    "name": "Zinc",
    "mass": 65.38,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Ar] 3d\u00b9\u2070 4s\u00b2",
    "summary": "Primary galvanizing coating protecting iron and essential dietary trace enzyme."
  },
  {
    "num": 31,
    "sym": "Ga",
    "name": "Gallium",
    "mass": 69.723,
    "cat": "Post Transition",
    "phase": "Solid",
    "config": "[Ar] 3d\u00b9\u2070 4s\u00b2 4p\u00b9",
    "summary": "Melts in the palm of human hands (29.8\u00b0C); key in GaAs high-speed chips."
  },
  {
    "num": 32,
    "sym": "Ge",
    "name": "Germanium",
    "mass": 72.63,
    "cat": "Metalloid",
    "phase": "Solid",
    "config": "[Ar] 3d\u00b9\u2070 4s\u00b2 4p\u00b2",
    "summary": "Early semiconductor pioneer now crucial for fiber optics and night-vision IR."
  },
  {
    "num": 33,
    "sym": "As",
    "name": "Arsenic",
    "mass": 74.922,
    "cat": "Metalloid",
    "phase": "Solid",
    "config": "[Ar] 3d\u00b9\u2070 4s\u00b2 4p\u00b3",
    "summary": "Metalloid used as dopant in microchips and in high-hardness lead shot."
  },
  {
    "num": 34,
    "sym": "Se",
    "name": "Selenium",
    "mass": 78.971,
    "cat": "Polyatomic Nonmetal",
    "phase": "Solid",
    "config": "[Ar] 3d\u00b9\u2070 4s\u00b2 4p\u2074",
    "summary": "Photoconductive element utilized in solar cells and photocopier drums."
  },
  {
    "num": 35,
    "sym": "Br",
    "name": "Bromine",
    "mass": 79.904,
    "cat": "Diatomic Nonmetal",
    "phase": "Liquid",
    "config": "[Ar] 3d\u00b9\u2070 4s\u00b2 4p\u2075",
    "summary": "Only non-metallic element that is liquid at standard temperature and pressure."
  },
  {
    "num": 36,
    "sym": "Kr",
    "name": "Krypton",
    "mass": 83.798,
    "cat": "Noble Gas",
    "phase": "Gas",
    "config": "[Ar] 3d\u00b9\u2070 4s\u00b2 4p\u2076",
    "summary": "Dense noble gas used in high-efficiency discharge lamps and photography."
  },
  {
    "num": 37,
    "sym": "Rb",
    "name": "Rubidium",
    "mass": 85.468,
    "cat": "Alkali Metal",
    "phase": "Solid",
    "config": "[Kr] 5s\u00b9",
    "summary": "Soft silvery alkali metal used in laser cooling and atomic vapor cell clocks."
  },
  {
    "num": 38,
    "sym": "Sr",
    "name": "Strontium",
    "mass": 87.62,
    "cat": "Alkaline Earth",
    "phase": "Solid",
    "config": "[Kr] 5s\u00b2",
    "summary": "Produces brilliant crimson-red flame in fireworks; optical lattice atomic clocks."
  },
  {
    "num": 39,
    "sym": "Y",
    "name": "Yttrium",
    "mass": 88.906,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Kr] 4d\u00b9 5s\u00b2",
    "summary": "Rare-earth transition metal in YBCO high-temperature superconductors."
  },
  {
    "num": 40,
    "sym": "Zr",
    "name": "Zirconium",
    "mass": 91.224,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Kr] 4d\u00b2 5s\u00b2",
    "summary": "Ultra corrosion-resistant metal used for nuclear reactor cladding."
  },
  {
    "num": 41,
    "sym": "Nb",
    "name": "Niobium",
    "mass": 92.906,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Kr] 4d\u2074 5s\u00b9",
    "summary": "Superconducting transition metal in MRI magnets and rocket engine alloys."
  },
  {
    "num": 42,
    "sym": "Mo",
    "name": "Molybdenum",
    "mass": 95.95,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Kr] 4d\u2075 5s\u00b9",
    "summary": "High melting point metal used in heavy armor plating and enzymes."
  },
  {
    "num": 43,
    "sym": "Tc",
    "name": "Technetium",
    "mass": 98,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Kr] 4d\u2075 5s\u00b2",
    "summary": "Lightest chemical element whose isotopes are all entirely radioactive."
  },
  {
    "num": 44,
    "sym": "Ru",
    "name": "Ruthenium",
    "mass": 101.07,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Kr] 4d\u2077 5s\u00b9",
    "summary": "Platinum-group metal used in hard disk drive storage and solar sensitizers."
  },
  {
    "num": 45,
    "sym": "Rh",
    "name": "Rhodium",
    "mass": 102.91,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Kr] 4d\u2078 5s\u00b9",
    "summary": "Extremely rare, highly reflective noble metal used in catalytic converters."
  },
  {
    "num": 46,
    "sym": "Pd",
    "name": "Palladium",
    "mass": 106.42,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Kr] 4d\u00b9\u2070",
    "summary": "Absorbs up to 900 times its own volume of hydrogen gas; catalyst."
  },
  {
    "num": 47,
    "sym": "Ag",
    "name": "Silver",
    "mass": 107.87,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Kr] 4d\u00b9\u2070 5s\u00b9",
    "summary": "Highest electrical and thermal conductivity and optical reflectivity of all metals."
  },
  {
    "num": 48,
    "sym": "Cd",
    "name": "Cadmium",
    "mass": 112.41,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Kr] 4d\u00b9\u2070 5s\u00b2",
    "summary": "Soft, bluish-white metal historically used in NiCd batteries and pigments."
  },
  {
    "num": 49,
    "sym": "In",
    "name": "Indium",
    "mass": 114.82,
    "cat": "Post Transition",
    "phase": "Solid",
    "config": "[Kr] 4d\u00b9\u2070 5s\u00b2 5p\u00b9",
    "summary": "Primary element in transparent conducting Indium Tin Oxide (ITO) touchscreens."
  },
  {
    "num": 50,
    "sym": "Sn",
    "name": "Tin",
    "mass": 118.71,
    "cat": "Post Transition",
    "phase": "Solid",
    "config": "[Kr] 4d\u00b9\u2070 5s\u00b2 5p\u00b2",
    "summary": "Pliable metal alloyed with copper since antiquity to manufacture bronze."
  },
  {
    "num": 51,
    "sym": "Sb",
    "name": "Antimony",
    "mass": 121.76,
    "cat": "Metalloid",
    "phase": "Solid",
    "config": "[Kr] 4d\u00b9\u2070 5s\u00b2 5p\u00b3",
    "summary": "Lustrous gray metalloid used in flame retardants and microelectronics."
  },
  {
    "num": 52,
    "sym": "Te",
    "name": "Tellurium",
    "mass": 127.6,
    "cat": "Metalloid",
    "phase": "Solid",
    "config": "[Kr] 4d\u00b9\u2070 5s\u00b2 5p\u2074",
    "summary": "Rare metalloid used in CdTe thin-film high-efficiency solar panels."
  },
  {
    "num": 53,
    "sym": "I",
    "name": "Iodine",
    "mass": 126.9,
    "cat": "Diatomic Nonmetal",
    "phase": "Solid",
    "config": "[Kr] 4d\u00b9\u2070 5s\u00b2 5p\u2075",
    "summary": "Sublimes into rich deep violet vapor; essential dietary nutrient for thyroid."
  },
  {
    "num": 54,
    "sym": "Xe",
    "name": "Xenon",
    "mass": 131.29,
    "cat": "Noble Gas",
    "phase": "Gas",
    "config": "[Kr] 4d\u00b9\u2070 5s\u00b2 5p\u2076",
    "summary": "Dense noble gas utilized in satellite ion thrusters and flash illumination."
  },
  {
    "num": 55,
    "sym": "Cs",
    "name": "Caesium",
    "mass": 132.91,
    "cat": "Alkali Metal",
    "phase": "Solid",
    "config": "[Xe] 6s\u00b9",
    "summary": "The SI second is officially defined by 9,192,631,770 cycles of the Caesium-133 atom."
  },
  {
    "num": 56,
    "sym": "Ba",
    "name": "Barium",
    "mass": 137.33,
    "cat": "Alkaline Earth",
    "phase": "Solid",
    "config": "[Xe] 6s\u00b2",
    "summary": "High-density element used in medical radiocontrast GI imaging."
  },
  {
    "num": 57,
    "sym": "La",
    "name": "Lanthanum",
    "mass": 138.91,
    "cat": "Lanthanide",
    "phase": "Solid",
    "config": "[Xe] 5d\u00b9 6s\u00b2",
    "summary": "Namesake of the lanthanide series; used in carbon arc lighting and hybrid batteries."
  },
  {
    "num": 58,
    "sym": "Ce",
    "name": "Cerium",
    "mass": 140.12,
    "cat": "Lanthanide",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9 5d\u00b9 6s\u00b2",
    "summary": "Most abundant rare-earth metal; component of ferrocerium fire strikers."
  },
  {
    "num": 59,
    "sym": "Pr",
    "name": "Praseodymium",
    "mass": 140.91,
    "cat": "Lanthanide",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b3 6s\u00b2",
    "summary": "Used in high-strength neodymium magnets and specialized welder goggles."
  },
  {
    "num": 60,
    "sym": "Nd",
    "name": "Neodymium",
    "mass": 144.24,
    "cat": "Lanthanide",
    "phase": "Solid",
    "config": "[Xe] 4f\u2074 6s\u00b2",
    "summary": "Forms NdFeB permanent magnets, the most powerful magnets known to engineering."
  },
  {
    "num": 61,
    "sym": "Pm",
    "name": "Promethium",
    "mass": 145,
    "cat": "Lanthanide",
    "phase": "Solid",
    "config": "[Xe] 4f\u2075 6s\u00b2",
    "summary": "Extremely radioactive lanthanide used in long-life nuclear beta batteries."
  },
  {
    "num": 62,
    "sym": "Sm",
    "name": "Samarium",
    "mass": 150.36,
    "cat": "Lanthanide",
    "phase": "Solid",
    "config": "[Xe] 4f\u2076 6s\u00b2",
    "summary": "Forms temperature-resistant SmCo magnets and neutron absorption rods."
  },
  {
    "num": 63,
    "sym": "Eu",
    "name": "Europium",
    "mass": 151.96,
    "cat": "Lanthanide",
    "phase": "Solid",
    "config": "[Xe] 4f\u2077 6s\u00b2",
    "summary": "Most reactive rare-earth metal; fluorescent red phosphor in euro banknotes."
  },
  {
    "num": 64,
    "sym": "Gd",
    "name": "Gadolinium",
    "mass": 157.25,
    "cat": "Lanthanide",
    "phase": "Solid",
    "config": "[Xe] 4f\u2077 5d\u00b9 6s\u00b2",
    "summary": "Ferromagnetic metal with giant magnetocaloric effect; MRI contrast agent."
  },
  {
    "num": 65,
    "sym": "Tb",
    "name": "Terbium",
    "mass": 158.93,
    "cat": "Lanthanide",
    "phase": "Solid",
    "config": "[Xe] 4f\u2079 6s\u00b2",
    "summary": "Rare-earth element providing green phosphors and high-efficiency magnetostriction."
  },
  {
    "num": 66,
    "sym": "Dy",
    "name": "Dysprosium",
    "mass": 162.5,
    "cat": "Lanthanide",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2070 6s\u00b2",
    "summary": "High magnetic susceptibility; stabilizes EV motor magnets at high operating temps."
  },
  {
    "num": 67,
    "sym": "Ho",
    "name": "Holmium",
    "mass": 164.93,
    "cat": "Lanthanide",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u00b9 6s\u00b2",
    "summary": "Highest magnetic moment of any natural element; used in magnetic flux concentrators."
  },
  {
    "num": 68,
    "sym": "Er",
    "name": "Erbium",
    "mass": 167.26,
    "cat": "Lanthanide",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u00b2 6s\u00b2",
    "summary": "Crucial laser dopant in optical fiber amplifiers powering global internet backbones."
  },
  {
    "num": 69,
    "sym": "Tm",
    "name": "Thulium",
    "mass": 168.93,
    "cat": "Lanthanide",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u00b3 6s\u00b2",
    "summary": "Second-least abundant lanthanide; portable X-ray isotope sources."
  },
  {
    "num": 70,
    "sym": "Yb",
    "name": "Ytterbium",
    "mass": 173.05,
    "cat": "Lanthanide",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2074 6s\u00b2",
    "summary": "Optical atomic clocks capable of stability approaching one second in 15 billion years."
  },
  {
    "num": 71,
    "sym": "Lu",
    "name": "Lutetium",
    "mass": 174.97,
    "cat": "Lanthanide",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2074 5d\u00b9 6s\u00b2",
    "summary": "Dense lanthanide used in PET scanners and petroleum catalytic cracking."
  },
  {
    "num": 72,
    "sym": "Hf",
    "name": "Hafnium",
    "mass": 178.49,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2074 5d\u00b2 6s\u00b2",
    "summary": "High-dielectric insulator in modern microprocessors and nuclear control rods."
  },
  {
    "num": 73,
    "sym": "Ta",
    "name": "Tantalum",
    "mass": 180.95,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2074 5d\u00b3 6s\u00b2",
    "summary": "Highly corrosion-resistant metal used for micro-capacitors in smartphones."
  },
  {
    "num": 74,
    "sym": "W",
    "name": "Tungsten",
    "mass": 183.84,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2074 5d\u2074 6s\u00b2",
    "summary": "Highest melting point of all elements (3,422\u00b0C); ultra-dense and hard."
  },
  {
    "num": 75,
    "sym": "Re",
    "name": "Rhenium",
    "mass": 186.21,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2074 5d\u2075 6s\u00b2",
    "summary": "One of the rarest elements in Earth crust; used in jet engine superalloys."
  },
  {
    "num": 76,
    "sym": "Os",
    "name": "Osmium",
    "mass": 190.23,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2074 5d\u2076 6s\u00b2",
    "summary": "Densest naturally occurring element known (22.59 g/cm\u00b3); unwearable alloy tips."
  },
  {
    "num": 77,
    "sym": "Ir",
    "name": "Iridium",
    "mass": 192.22,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2074 5d\u2077 6s\u00b2",
    "summary": "Most corrosion-resistant metal known; marked the K-Pg dinosaur extinction boundary."
  },
  {
    "num": 78,
    "sym": "Pt",
    "name": "Platinum",
    "mass": 195.08,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2074 5d\u2079 6s\u00b9",
    "summary": "Noble metal of immense catalytic importance in chemistry and fuel cells."
  },
  {
    "num": 79,
    "sym": "Au",
    "name": "Gold",
    "mass": 196.97,
    "cat": "Transition Metal",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2074 5d\u00b9\u2070 6s\u00b9",
    "summary": "Most malleable and ductile metal known; does not oxidize under normal conditions."
  },
  {
    "num": 80,
    "sym": "Hg",
    "name": "Mercury",
    "mass": 200.59,
    "cat": "Transition Metal",
    "phase": "Liquid",
    "config": "[Xe] 4f\u00b9\u2074 5d\u00b9\u2070 6s\u00b2",
    "summary": "Only metallic element in the periodic table that is liquid at standard conditions."
  },
  {
    "num": 81,
    "sym": "Tl",
    "name": "Thallium",
    "mass": 204.38,
    "cat": "Post Transition",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2074 5d\u00b9\u2070 6s\u00b2 6p\u00b9",
    "summary": "Soft malleable post-transition metal; used in low-temperature thermometers."
  },
  {
    "num": 82,
    "sym": "Pb",
    "name": "Lead",
    "mass": 207.2,
    "cat": "Post Transition",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2074 5d\u00b9\u2070 6s\u00b2 6p\u00b2",
    "summary": "Dense heavy metal used for centuries in radiation shielding and storage batteries."
  },
  {
    "num": 83,
    "sym": "Bi",
    "name": "Bismuth",
    "mass": 208.98,
    "cat": "Post Transition",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2074 5d\u00b9\u2070 6s\u00b2 6p\u00b3",
    "summary": "Heaviest element historically considered stable; forms iridescent rainbow crystals."
  },
  {
    "num": 84,
    "sym": "Po",
    "name": "Polonium",
    "mass": 209,
    "cat": "Post Transition",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2074 5d\u00b9\u2070 6s\u00b2 6p\u2074",
    "summary": "Intensely radioactive element discovered by Marie and Pierre Curie in 1898."
  },
  {
    "num": 85,
    "sym": "At",
    "name": "Astatine",
    "mass": 210,
    "cat": "Metalloid",
    "phase": "Solid",
    "config": "[Xe] 4f\u00b9\u2074 5d\u00b9\u2070 6s\u00b2 6p\u2075",
    "summary": "Rarest naturally occurring element in Earth crust (< 1 gram in entire crust)."
  },
  {
    "num": 86,
    "sym": "Rn",
    "name": "Radon",
    "mass": 222,
    "cat": "Noble Gas",
    "phase": "Gas",
    "config": "[Xe] 4f\u00b9\u2074 5d\u00b9\u2070 6s\u00b2 6p\u2076",
    "summary": "Radioactive noble gas produced from the natural radioactive decay of radium."
  },
  {
    "num": 87,
    "sym": "Fr",
    "name": "Francium",
    "mass": 223,
    "cat": "Alkali Metal",
    "phase": "Solid",
    "config": "[Rn] 7s\u00b9",
    "summary": "Extremely unstable alkali metal; second rarest element in the Earth crust."
  },
  {
    "num": 88,
    "sym": "Ra",
    "name": "Radium",
    "mass": 226,
    "cat": "Alkaline Earth",
    "phase": "Solid",
    "config": "[Rn] 7s\u00b2",
    "summary": "Luminescent radioactive alkaline-earth metal discovered by Marie Curie."
  },
  {
    "num": 89,
    "sym": "Ac",
    "name": "Actinium",
    "mass": 227,
    "cat": "Actinide",
    "phase": "Solid",
    "config": "[Rn] 6d\u00b9 7s\u00b2",
    "summary": "Namesake of the actinide series; gives off a ghostly blue glow in darkness."
  },
  {
    "num": 90,
    "sym": "Th",
    "name": "Thorium",
    "mass": 232.04,
    "cat": "Actinide",
    "phase": "Solid",
    "config": "[Rn] 6d\u00b2 7s\u00b2",
    "summary": "Naturally radioactive actinide and candidate nuclear fuel for breeder reactors."
  },
  {
    "num": 91,
    "sym": "Pa",
    "name": "Protactinium",
    "mass": 231.04,
    "cat": "Actinide",
    "phase": "Solid",
    "config": "[Rn] 5f\u00b2 6d\u00b9 7s\u00b2",
    "summary": "Dense, silvery-gray radioactive actinide formed during uranium decay chains."
  },
  {
    "num": 92,
    "sym": "U",
    "name": "Uranium",
    "mass": 238.03,
    "cat": "Actinide",
    "phase": "Solid",
    "config": "[Rn] 5f\u00b3 6d\u00b9 7s\u00b2",
    "summary": "Dense radioactive actinide foundational to commercial nuclear energy generation."
  },
  {
    "num": 93,
    "sym": "Np",
    "name": "Neptunium",
    "mass": 237,
    "cat": "Actinide",
    "phase": "Solid",
    "config": "[Rn] 5f\u2074 6d\u00b9 7s\u00b2",
    "summary": "First transuranic element ever synthesized; created by neutron bombardment in 1940."
  },
  {
    "num": 94,
    "sym": "Pu",
    "name": "Plutonium",
    "mass": 244,
    "cat": "Actinide",
    "phase": "Solid",
    "config": "[Rn] 5f\u2076 7s\u00b2",
    "summary": "Fissile actinide synthesized for nuclear reactors and radioisotope RTG space probes."
  },
  {
    "num": 95,
    "sym": "Am",
    "name": "Americium",
    "mass": 243,
    "cat": "Actinide",
    "phase": "Solid",
    "config": "[Rn] 5f\u2077 7s\u00b2",
    "summary": "Synthetic actinide used commercially in residential ionization smoke detectors."
  },
  {
    "num": 96,
    "sym": "Cm",
    "name": "Curium",
    "mass": 247,
    "cat": "Actinide",
    "phase": "Solid",
    "config": "[Rn] 5f\u2077 6d\u00b9 7s\u00b2",
    "summary": "Hard, dense radioactive metal named in honour of Marie and Pierre Curie."
  },
  {
    "num": 97,
    "sym": "Bk",
    "name": "Berkelium",
    "mass": 247,
    "cat": "Actinide",
    "phase": "Solid",
    "config": "[Rn] 5f\u2079 7s\u00b2",
    "summary": "Synthetic actinide first created at UC Berkeley in December 1949."
  },
  {
    "num": 98,
    "sym": "Cf",
    "name": "Californium",
    "mass": 251,
    "cat": "Actinide",
    "phase": "Solid",
    "config": "[Rn] 5f\u00b9\u2070 7s\u00b2",
    "summary": "Potent neutron emitter used in oil-well neutron moisture gauges and cancer therapy."
  },
  {
    "num": 99,
    "sym": "Es",
    "name": "Einsteinium",
    "mass": 252,
    "cat": "Actinide",
    "phase": "Solid",
    "config": "[Rn] 5f\u00b9\u00b9 7s\u00b2",
    "summary": "Discovered in the debris of the 1952 'Ivy Mike' thermonuclear explosion."
  },
  {
    "num": 100,
    "sym": "Fm",
    "name": "Fermium",
    "mass": 257,
    "cat": "Actinide",
    "phase": "Solid",
    "config": "[Rn] 5f\u00b9\u00b2 7s\u00b2",
    "summary": "Named after Enrico Fermi; heaviest element that can be formed by neutron capture."
  },
  {
    "num": 101,
    "sym": "Md",
    "name": "Mendelevium",
    "mass": 258,
    "cat": "Actinide",
    "phase": "Solid",
    "config": "[Rn] 5f\u00b9\u00b3 7s\u00b2",
    "summary": "Named after Dmitri Mendeleev, the father of the periodic table."
  },
  {
    "num": 102,
    "sym": "No",
    "name": "Nobelium",
    "mass": 259,
    "cat": "Actinide",
    "phase": "Solid",
    "config": "[Rn] 5f\u00b9\u2074 7s\u00b2",
    "summary": "Radioactive synthetic actinide named in honour of Alfred Nobel."
  },
  {
    "num": 103,
    "sym": "Lr",
    "name": "Lawrencium",
    "mass": 266,
    "cat": "Actinide",
    "phase": "Solid",
    "config": "[Rn] 5f\u00b9\u2074 7s\u00b2 7p\u00b9",
    "summary": "Final actinide in the series; named after Ernest Lawrence, inventor of the cyclotron."
  },
  {
    "num": 104,
    "sym": "Rf",
    "name": "Rutherfordium",
    "mass": 267,
    "cat": "Transition Metal",
    "phase": "Synthetic",
    "config": "[Rn] 5f\u00b9\u2074 6d\u00b2 7s\u00b2",
    "summary": "First transactinide element; named after nuclear pioneer Ernest Rutherford."
  },
  {
    "num": 105,
    "sym": "Db",
    "name": "Dubnium",
    "mass": 268,
    "cat": "Transition Metal",
    "phase": "Synthetic",
    "config": "[Rn] 5f\u00b9\u2074 6d\u00b3 7s\u00b2",
    "summary": "Superheavy element named after Dubna, Russia, location of JINR nuclear lab."
  },
  {
    "num": 106,
    "sym": "Sg",
    "name": "Seaborgium",
    "mass": 269,
    "cat": "Transition Metal",
    "phase": "Synthetic",
    "config": "[Rn] 5f\u00b9\u2074 6d\u2074 7s\u00b2",
    "summary": "First element named after a living person (Glenn T. Seaborg) at the time of naming."
  },
  {
    "num": 107,
    "sym": "Bh",
    "name": "Bohrium",
    "mass": 270,
    "cat": "Transition Metal",
    "phase": "Synthetic",
    "config": "[Rn] 5f\u00b9\u2074 6d\u2075 7s\u00b2",
    "summary": "Superheavy synthetic transition metal named in honour of Niels Bohr."
  },
  {
    "num": 108,
    "sym": "Hs",
    "name": "Hassium",
    "mass": 270,
    "cat": "Transition Metal",
    "phase": "Synthetic",
    "config": "[Rn] 5f\u00b9\u2074 6d\u2076 7s\u00b2",
    "summary": "Synthesized at GSI Helmholtz in Germany; named after the German state of Hesse."
  },
  {
    "num": 109,
    "sym": "Mt",
    "name": "Meitnerium",
    "mass": 278,
    "cat": "Transition Metal",
    "phase": "Synthetic",
    "config": "[Rn] 5f\u00b9\u2074 6d\u2077 7s\u00b2",
    "summary": "Named in honour of physicist Lise Meitner, discoverer of nuclear fission."
  },
  {
    "num": 110,
    "sym": "Ds",
    "name": "Darmstadtium",
    "mass": 281,
    "cat": "Transition Metal",
    "phase": "Synthetic",
    "config": "[Rn] 5f\u00b9\u2074 6d\u2078 7s\u00b2",
    "summary": "Synthetic superheavy element named after Darmstadt, Germany."
  },
  {
    "num": 111,
    "sym": "Rg",
    "name": "Roentgenium",
    "mass": 282,
    "cat": "Transition Metal",
    "phase": "Synthetic",
    "config": "[Rn] 5f\u00b9\u2074 6d\u2079 7s\u00b2",
    "summary": "Superheavy metal named in honour of Wilhelm R\u00f6ntgen, discoverer of X-rays."
  },
  {
    "num": 112,
    "sym": "Cn",
    "name": "Copernicium",
    "mass": 285,
    "cat": "Transition Metal",
    "phase": "Synthetic",
    "config": "[Rn] 5f\u00b9\u2074 6d\u00b9\u2070 7s\u00b2",
    "summary": "Extremely volatile element named in honour of astronomer Nicolaus Copernicus."
  },
  {
    "num": 113,
    "sym": "Nh",
    "name": "Nihonium",
    "mass": 286,
    "cat": "Post Transition",
    "phase": "Synthetic",
    "config": "[Rn] 5f\u00b9\u2074 6d\u00b9\u2070 7s\u00b2 7p\u00b9",
    "summary": "First modern element discovered in Asia; named after Nihon (Japan) by RIKEN."
  },
  {
    "num": 114,
    "sym": "Fl",
    "name": "Flerovium",
    "mass": 289,
    "cat": "Post Transition",
    "phase": "Synthetic",
    "config": "[Rn] 5f\u00b9\u2074 6d\u00b9\u2070 7s\u00b2 7p\u00b2",
    "summary": "Superheavy element named after Flerov Laboratory of Nuclear Reactions."
  },
  {
    "num": 115,
    "sym": "Mc",
    "name": "Moscovium",
    "mass": 290,
    "cat": "Post Transition",
    "phase": "Synthetic",
    "config": "[Rn] 5f\u00b9\u2074 6d\u00b9\u2070 7s\u00b2 7p\u00b3",
    "summary": "Synthetic superheavy element named after the Moscow Oblast region."
  },
  {
    "num": 116,
    "sym": "Lv",
    "name": "Livermorium",
    "mass": 293,
    "cat": "Post Transition",
    "phase": "Synthetic",
    "config": "[Rn] 5f\u00b9\u2074 6d\u00b9\u2070 7s\u00b2 7p\u2074",
    "summary": "Named in honour of Lawrence Livermore National Laboratory in California."
  },
  {
    "num": 117,
    "sym": "Ts",
    "name": "Tennessine",
    "mass": 294,
    "cat": "Post Transition",
    "phase": "Synthetic",
    "config": "[Rn] 5f\u00b9\u2074 6d\u00b9\u2070 7s\u00b2 7p\u2075",
    "summary": "Second-newest known element; named in recognition of Tennessee labs."
  },
  {
    "num": 118,
    "sym": "Og",
    "name": "Oganesson",
    "mass": 294,
    "cat": "Noble Gas",
    "phase": "Synthetic",
    "config": "[Rn] 5f\u00b9\u2074 6d\u00b9\u2070 7s\u00b2 7p\u2076",
    "summary": "Highest atomic number (118) and atomic mass on the periodic table; named after Yuri Oganessian."
  }
];

  const learn = {
    calcExpr: '',
    calcDegMode: true,

    init() {
      this.bindTabs();
      this.initCalculator();
      this.initPeriodicTable();
      this.initSolvers();
    },

    bindTabs() {
      document.querySelectorAll('.learn-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.learn-tab-btn').forEach(b => {
            b.classList.remove('active', 'bg-amber-500', 'text-slate-950');
            b.classList.add('bg-slate-800', 'text-slate-300');
          });
          btn.classList.add('active', 'bg-amber-500', 'text-slate-950');
          btn.classList.remove('bg-slate-800', 'text-slate-300');

          const target = btn.getAttribute('data-learntab');
          document.getElementById('learntab-panel-calc')?.classList.toggle('hidden', target !== 'calc');
          document.getElementById('learntab-panel-periodic')?.classList.toggle('hidden', target !== 'periodic');
          document.getElementById('learntab-panel-formulas')?.classList.toggle('hidden', target !== 'formulas');
        });
      });
    },

    // ==========================================
    // 1. SAFE SCIENTIFIC CALCULATOR (ZERO EVAL)
    // ==========================================
    initCalculator() {
      const tape = document.getElementById('calc-expression-tape');
      const display = document.getElementById('calc-display-result');

      const updateDisplay = () => {
        if (tape) tape.textContent = this.calcExpr || '0';
      };

      document.querySelectorAll('.calc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const num = btn.getAttribute('data-num');
          const op = btn.getAttribute('data-op');

          if (num !== null) {
            this.calcExpr += num;
          } else if (op !== null) {
            if (['sin', 'cos', 'tan', 'ln', 'log', 'sqrt'].includes(op)) {
              this.calcExpr += `${op}(`;
            } else if (op === 'fact') {
              this.calcExpr += '!';
            } else if (op === 'sq') {
              this.calcExpr += '^2';
            } else {
              this.calcExpr += op;
            }
          }
          updateDisplay();
        });
      });

      document.getElementById('calc-equals-btn')?.addEventListener('click', () => {
        try {
          const result = this.safeEvalMath(this.calcExpr, this.calcDegMode);
          if (display) display.textContent = parseFloat(result.toPrecision(10));
          storage.showToast('Calculated result', 'success');
        } catch (e) {
          if (display) display.textContent = 'Error: ' + e.message;
        }
      });

      document.getElementById('calc-clear-btn')?.addEventListener('click', () => {
        this.calcExpr = '';
        if (display) display.textContent = '0';
        updateDisplay();
      });

      document.getElementById('calc-backspace-btn')?.addEventListener('click', () => {
        this.calcExpr = this.calcExpr.slice(0, -1);
        updateDisplay();
      });

      document.getElementById('calc-mode-deg-rad-btn')?.addEventListener('click', (e) => {
        this.calcDegMode = !this.calcDegMode;
        e.target.textContent = this.calcDegMode ? 'DEG' : 'RAD';
        storage.showToast(`Trigonometry mode: ${this.calcDegMode ? 'Degrees' : 'Radians'}`);
      });
    },

    /**
     * Safe Shunting-Yard AST mathematical evaluator without eval()
     */
    safeEvalMath(expr, isDeg) {
      if (!expr || !expr.trim()) return 0;
      const sanitized = expr.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi');
      
      const tokens = [];
      let i = 0;
      const funcs = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'sqrt', 'abs', 'fact']);
      const constants = { pi: Math.PI, e: Math.E };

      while (i < sanitized.length) {
        const ch = sanitized[i];
        if (/[0-9.]/.test(ch)) {
          let numStr = '';
          while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
            numStr += sanitized[i];
            i++;
          }
          tokens.push({ type: 'num', value: parseFloat(numStr) });
          continue;
        }
        if (/[a-zA-Z]/.test(ch)) {
          let ident = '';
          while (i < sanitized.length && /[a-zA-Z0-9_]/.test(sanitized[i])) {
            ident += sanitized[i];
            i++;
          }
          const lower = ident.toLowerCase();
          if (funcs.has(lower)) {
            tokens.push({ type: 'func', value: lower });
          } else if (lower in constants) {
            tokens.push({ type: 'num', value: constants[lower] });
          } else {
            throw new Error(`Unknown identifier: ${ident}`);
          }
          continue;
        }
        if ('+-*/%^!'.includes(ch)) {
          const prev = tokens[tokens.length - 1];
          if (ch === '-' && (!prev || prev.type === 'op' || prev.type === 'lparen')) {
            tokens.push({ type: 'op', value: 'u-' });
          } else {
            tokens.push({ type: 'op', value: ch });
          }
          i++;
          continue;
        }
        if (ch === '(') { tokens.push({ type: 'lparen', value: '(' }); i++; continue; }
        if (ch === ')') { tokens.push({ type: 'rparen', value: ')' }); i++; continue; }
        throw new Error(`Unexpected character: ${ch}`);
      }

      // Shunting-Yard to RPN
      const out = [];
      const ops = [];
      const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3, 'u-': 4, '!': 5 };

      for (const t of tokens) {
        if (t.type === 'num') {
          out.push(t);
        } else if (t.type === 'func') {
          ops.push(t);
        } else if (t.type === 'op') {
          const p1 = prec[t.value] || 0;
          while (ops.length > 0) {
            const top = ops[ops.length - 1];
            if (top.type === 'op') {
              const p2 = prec[top.value] || 0;
              if ((t.value !== '^' && p1 <= p2) || (t.value === '^' && p1 < p2)) {
                out.push(ops.pop());
                continue;
              }
            }
            break;
          }
          ops.push(t);
        } else if (t.type === 'lparen') {
          ops.push(t);
        } else if (t.type === 'rparen') {
          let matched = false;
          while (ops.length > 0) {
            const top = ops.pop();
            if (top.type === 'lparen') { matched = true; break; }
            out.push(top);
          }
          if (!matched) throw new Error('Mismatched parentheses');
          if (ops.length > 0 && ops[ops.length - 1].type === 'func') {
            out.push(ops.pop());
          }
        }
      }

      while (ops.length > 0) {
        const top = ops.pop();
        if (top.type === 'lparen' || top.type === 'rparen') throw new Error('Mismatched parentheses');
        out.push(top);
      }

      // Evaluate RPN
      const stack = [];
      for (const t of out) {
        if (t.type === 'num') {
          stack.push(t.value);
        } else if (t.type === 'op') {
          if (t.value === 'u-') {
            if (stack.length < 1) throw new Error('Missing operand');
            stack.push(-stack.pop());
          } else if (t.value === '!') {
            if (stack.length < 1) throw new Error('Missing operand for factorial');
            const n = Math.floor(stack.pop());
            let f = 1;
            for (let k = 2; k <= Math.min(n, 150); k++) f *= k;
            stack.push(f);
          } else {
            if (stack.length < 2) throw new Error(`Missing operand for ${t.value}`);
            const b = stack.pop();
            const a = stack.pop();
            switch (t.value) {
              case '+': stack.push(a + b); break;
              case '-': stack.push(a - b); break;
              case '*': stack.push(a * b); break;
              case '/':
                if (b === 0) throw new Error('Division by zero');
                stack.push(a / b);
                break;
              case '%': stack.push(a % b); break;
              case '^': stack.push(Math.pow(a, b)); break;
            }
          }
        } else if (t.type === 'func') {
          if (stack.length < 1) throw new Error(`Missing argument for ${t.value}`);
          const v = stack.pop();
          const toRad = deg => (deg * Math.PI) / 180;
          switch (t.value) {
            case 'sin': stack.push(Math.sin(isDeg ? toRad(v) : v)); break;
            case 'cos': stack.push(Math.cos(isDeg ? toRad(v) : v)); break;
            case 'tan': stack.push(Math.tan(isDeg ? toRad(v) : v)); break;
            case 'asin': stack.push(isDeg ? (Math.asin(v) * 180) / Math.PI : Math.asin(v)); break;
            case 'acos': stack.push(isDeg ? (Math.acos(v) * 180) / Math.PI : Math.acos(v)); break;
            case 'atan': stack.push(isDeg ? (Math.atan(v) * 180) / Math.PI : Math.atan(v)); break;
            case 'ln':
              if (v <= 0) throw new Error('Natural log of non-positive');
              stack.push(Math.log(v));
              break;
            case 'log':
              if (v <= 0) throw new Error('Logarithm of non-positive');
              stack.push(Math.log10(v));
              break;
            case 'sqrt':
              if (v < 0) throw new Error('Square root of negative');
              stack.push(Math.sqrt(v));
              break;
            case 'abs': stack.push(Math.abs(v)); break;
          }
        }
      }

      if (stack.length !== 1) throw new Error('Invalid expression format');
      return stack[0];
    },

    // ==========================================
    // 2. PERIODIC TABLE (118 ELEMENTS)
    // ==========================================
    initPeriodicTable() {
      const searchIn = document.getElementById('periodic-search-input');
      const closeBtn = document.getElementById('close-element-modal-btn');

      const render = (q = '') => {
        const grid = document.getElementById('periodic-elements-grid');
        if (!grid) return;
        const query = q.toLowerCase().trim();

        const filtered = ELEMENTS.filter(e => 
          e.name.toLowerCase().includes(query) ||
          e.sym.toLowerCase().includes(query) ||
          String(e.num).includes(query)
        );

        grid.innerHTML = '';
        filtered.forEach(e => {
          const card = document.createElement('div');
          card.className = 'p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-amber-500/50 hover:bg-slate-800 transition cursor-pointer flex flex-col justify-between';
          card.innerHTML = `
            <div class="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>${e.num}</span>
              <span>${e.mass}</span>
            </div>
            <div class="text-xl font-bold font-mono text-amber-300 my-1">${e.sym}</div>
            <div class="text-[11px] font-medium text-slate-300 truncate">${e.name}</div>
          `;
          card.addEventListener('click', () => this.openElementModal(e));
          grid.appendChild(card);
        });
      };

      searchIn?.addEventListener('input', (e) => render(e.target.value));
      closeBtn?.addEventListener('click', () => {
        document.getElementById('element-modal')?.classList.add('hidden');
      });

      render();
    },

    openElementModal(e) {
      const modal = document.getElementById('element-modal');
      const content = document.getElementById('element-modal-content');
      if (!modal || !content) return;

      content.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex flex-col items-center justify-center font-mono">
              <span class="text-xs text-amber-400 font-bold">${e.num}</span>
              <span class="text-2xl font-bold text-amber-300">${e.sym}</span>
            </div>
            <div>
              <h3 class="text-xl font-bold text-slate-100">${e.name}</h3>
              <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono">${e.cat}</span>
            </div>
          </div>

          <p class="text-xs text-slate-300 leading-relaxed">${e.summary}</p>

          <div class="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-white/5 font-mono">
            <div class="p-2 rounded-lg bg-slate-900/60"><span class="text-slate-500">Atomic Mass:</span> ${e.mass} u</div>
            <div class="p-2 rounded-lg bg-slate-900/60"><span class="text-slate-500">Phase (STP):</span> ${e.phase}</div>
            <div class="p-2 rounded-lg bg-slate-900/60 col-span-2"><span class="text-slate-500">Electron Config:</span> ${e.config}</div>
          </div>
        </div>
      `;
      modal.classList.remove('hidden');
      try { window.history.pushState({ modal: 'element-modal' }, '', window.location.hash); } catch (err) {}
    },

    // ==========================================
    // 3. SCIENTIFIC SOLVERS
    // ==========================================
    initSolvers() {
      document.getElementById('quad-solve-btn')?.addEventListener('click', () => {
        const a = parseFloat(document.getElementById('quad-a')?.value || 1);
        const b = parseFloat(document.getElementById('quad-b')?.value || 0);
        const c = parseFloat(document.getElementById('quad-c')?.value || 0);
        const disc = b * b - 4 * a * c;
        const box = document.getElementById('quad-result-box');
        if (!box) return;

        if (disc > 0) {
          const x1 = (-b + Math.sqrt(disc)) / (2 * a);
          const x2 = (-b - Math.sqrt(disc)) / (2 * a);
          box.textContent = `x₁ = ${x1.toFixed(3)}, x₂ = ${x2.toFixed(3)} (Two Real Roots)`;
        } else if (disc === 0) {
          const x = -b / (2 * a);
          box.textContent = `x = ${x.toFixed(3)} (Single Repeated Root)`;
        } else {
          const real = (-b / (2 * a)).toFixed(3);
          const imag = (Math.sqrt(-disc) / (2 * a)).toFixed(3);
          box.textContent = `x = ${real} ± ${imag}i (Complex Roots)`;
        }
        storage.showToast('Quadratic roots solved', 'success');
      });

      document.getElementById('ohm-solve-btn')?.addEventListener('click', () => {
        const i = parseFloat(document.getElementById('ohm-i')?.value || 0);
        const r = parseFloat(document.getElementById('ohm-r')?.value || 0);
        const v = i * r;
        const p = v * i;
        const box = document.getElementById('ohm-result-box');
        if (box) box.textContent = `Voltage (V): ${v.toFixed(2)} V | Power (P): ${p.toFixed(2)} W`;
        storage.showToast('Ohm\'s law computed', 'success');
      });

      document.getElementById('ke-solve-btn')?.addEventListener('click', () => {
        const m = parseFloat(document.getElementById('ke-m')?.value || 0);
        const v = parseFloat(document.getElementById('ke-v')?.value || 0);
        const ke = 0.5 * m * v * v;
        const box = document.getElementById('ke-result-box');
        if (box) box.textContent = `E_k = ${ke.toLocaleString()} Joules (${(ke / 1000).toFixed(2)} kJ)`;
        storage.showToast('Kinetic energy calculated', 'success');
      });
    }
  };

  window.Omnia.learn = learn;
})();
