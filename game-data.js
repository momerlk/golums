export const WORLD_SIZE = 8192;
export const TILE_SIZE = 4096;
export const SPAWN = { x: 1784, y: 7920 };
export const landmarks = [];

export const validSavedPosition = (position) => Array.isArray(position)
  && position.length === 2
  && position.every((value) => Number.isFinite(value) && value >= 0 && value <= WORLD_SIZE);
export const validGender = (gender) => ['male', 'female'].includes(gender);

const descriptions = {
  academic: 'A landmark of campus life, classes, and deadlines.',
  academic_service: 'Books, supplies, and a reliable stop between classes.',
  sports: 'A campus spot for training, matches, and friendly competition.',
  residential: 'Home base for the LUMS student experience.',
  religious: 'A calm place for prayer and reflection.',
  parking: 'A familiar arrival point on campus.',
  service: 'One of the services that keeps campus life moving.',
  residential_service: 'A residential landmark on the edge of campus.',
};

const shortName = (name) => name
  .replace('Syed Babar Ali School of Science & Engineering', 'SBASSE')
  .replace('Mushtaq Ahmad Gurmani School of Humanities & Social Sciences (VC Office - Academic Block)', 'ACADEMIC BLOCK')
  .replace('Syed Ahsan Ali & Syed Maratib Ali School of Education', 'SOE')
  .replace('Sheikh Ahmad Hassan School of Law', 'SAHSOL')
  .replace('Gad & Birgit Rausing Library / Super Store/ATM', 'LIBRARY / STORE')
  .replace('Sports Complex (Gyms)', 'SPORTS COMPLEX')
  .toUpperCase();

export function applyMapData(data) {
  const entrances = new Map(data.building_entrances.map((item) => [item.building_id, item.position_global]));
  landmarks.splice(0, landmarks.length, ...data.landmarks.filter((item) => item.quest_target).map((item, index) => {
    const [x, y] = item.centroid_global, access = entrances.get(item.reference_object_id) || [x, y];
    return { id: item.id, name: item.name, shortName: shortName(item.name), letter: item.letter || String.fromCharCode(65 + index), x: access[0], y: access[1], description: descriptions[item.category] || 'A place to discover on the LUMS campus.', type: item.category, labels: item.label_points_global || [[x, y]] };
  }));
  return landmarks;
}

export const npcs = [
  { id: 'nasir-guide', name: 'NASIR KHAN JAN', near: [1840, 7860], sprite: 'nasir', line: 'Welcome to LUMS! I can show you around whenever you need me.' },
  { name: 'GUARD IMRAN', near: [900, 2895], color: 0x4775b8, skin: 0xc98258, hair: 0x17293b, line: 'Welcome! Pick a building in CampusDex and follow the route on your minimap.' },
  { name: 'SANA · FRESHMAN', near: [3752, 5968], color: 0xe96f67, skin: 0xe4a273, hair: 0x43283d, line: 'The campus map now uses the full four-tile survey.' },
  { name: 'HAMZA · LIBRARY REGULAR', near: [5144, 6780], color: 0x715dcc, skin: 0xb96f4b, hair: 0x24212b, line: 'If you find a free library seat after noon, please report it to science.' },
  { name: 'AYESHA · ATHLETE', near: [3800, 2912], color: 0xce4d61, skin: 0xd78d68, hair: 0x2b1d27, line: 'The route follows the mapped campus paths across all four tiles.' },
  { name: 'BILAL · HOSTEL RESIDENT', near: [968, 4232], color: 0x42a76e, skin: 0xb96f4b, hair: 0x17293b, line: 'The hostels are far enough apart to make the bike button feel essential.' },
  { name: 'MAYA · LOST FRESHMAN', near: [2572, 3390], color: 0xf0b94f, skin: 0xe4a273, hair: 0x43283d, line: 'Open CampusDex, choose a place, and the yellow line will rescue you.' },
];
