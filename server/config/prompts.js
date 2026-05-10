/**
 * Prompt 配置 - 每日世界图片生成
 */

export const MOODS = [
  'mysterious', 'serene', 'magnificent', 'solitary', 'joyful', 'epic', 'dreamlike', 'melancholic', 'vibrant', 'ethereal',
  'eerie', 'warm', 'desolate', 'wild', 'solemn', 'uncanny', 'sweet', 'cruel', 'poetic', 'bleak',
  'oppressive', 'tranquil', 'sacred', 'corrupt', 'primitive', 'decaying', 'sarcastic', 'cold', 'hopeful', 'despairing',
  'chaotic', 'calm', 'tense', 'nostalgic', 'morbid', 'elegant', 'sad', 'joyous', 'fearful', 'furious',
  'wonder', 'scornful', 'penitent', 'redemptive', 'uneasy', 'lost', 'confused', 'dazed', 'sane', 'insane',
  'refreshing', 'crisp', 'chilly', 'cool', 'hot', 'blazing', 'scorching', 'lukewarm', 'mild', 'frigid',
  'bitter cold', 'sweltering', 'stuffy', 'parched', 'scorching', 'cozy', 'slightly warm', 'freezing', 'bitter', 'extreme'
]

export const STYLES = [
  'oil painting', 'watercolor', 'cyberpunk', 'ink wash painting', 'pixel art', 'surrealism', 'impressionist', 'art nouveau', 'fantasy illustration', 'sci-fi concept art',
  'ukiyo-e', 'renaissance', 'steampunk', 'biopunk', 'art deco', 'minimalism', 'gothic', 'oriental aesthetics', 'cel shading', 'decorative art',
  'chinese ink painting', 'flat illustration', 'impasto', 'pointillism', 'ink wash freehand', 'neon art', 'retro comic', 'dark fantasy', 'rococo', 'memphis',
  'pop art', 'abstract expressionism', 'byzantine mosaic', 'cubism', 'medieval manuscript', 'maya mural', 'dunhuang flying apsaras', 'meticulous heavy color', 'watercolor light wash', 'steampunk industrial',
  'japanese ukiyo-e', 'retro poster', 'futurism', 'abstract art', 'expressionism', 'realism', 'photorealism', 'figurative art', 'installation art', 'performance art',
  'digital art', 'vector art', 'low poly', 'enamel color', 'green landscape', 'dunhuang mural', 'thangka', 'paper cutting', 'new year picture', 'embroidery',
  'cloisonne', 'lacquer painting', 'rock color', 'tempera', 'woodcut', 'lithograph', 'copperplate', 'silkscreen', 'offset printing', '3d render',
  'hand drawn', 'ink wash', 'meticulous', 'sketch', 'quick sketch', 'line drawing', 'wash painting', 'gouache', 'acrylic', 'mixed media'
]

export const SCENES = [
  'ancient castle', 'underwater world', 'space station', 'futuristic city', 'enchanted forest', 'desert oasis', 'floating islands', 'underground cavern', 'sky kingdom', 'ruins of a lost civilization',
  'volcano', 'polar ice field', 'tropical rainforest', 'abandoned factory', 'post-apocalyptic wasteland', 'underwater ruins', 'starship interior', 'time rift', 'mirror world', 'space port',
  'ghost ship', 'giant library', 'ancient temple', 'doomsday bunker', 'flower greenhouse', 'swamp', 'rainy street at night', 'giant gears', 'starry sky', 'coral reef',
  'giant tree forest', 'glacier', 'ruins', 'altar', 'mine', 'beehive', 'insect nest', 'beast graveyard', 'steam pipes', 'cliff edge',
  'celestial ladder', 'rift', 'mega tree', 'vine', 'wormhole', 'nebula', 'asteroid belt', 'hydrothermal vent', 'aurora', 'meteor shower',
  'angel ladder', 'light ladder', 'dark abyss', 'giant kingdom', 'tiny kingdom', 'mirror dimension', 'multiverse', 'distorted space', 'folded space', 'waterfall',
  'river', 'lake', 'ocean', 'desert', 'gobi', 'grassland', 'mountain', 'plain', 'basin', 'plateau',
  'hill', 'canyon', 'gorge', 'trench', 'island', 'peninsula', 'archipelago', 'tundra', 'wetland', 'mangrove',
  'cactus field', 'tribal ruins', 'shrine ruins', 'ancient arena', 'giant statue', 'monument', 'clock tower', 'lighthouse', 'windmill', 'mill',
  'brewery', 'alchemy chamber', 'research institute', 'laboratory', 'power station', 'signal tower', 'abandoned platform', 'shipyard', 'hangar', 'dock'
]

export const ELEMENTS = [
  'dragon', 'robot', 'alien creature', 'forest spirit', 'steampunk machinery', 'crystal formation', 'airship', 'ancient guardian', 'ethereal being', 'mystical portal',
  'mechanical beast', 'glowing jellyfish', 'hourglass', 'stardust', 'ancient rune', 'mutant plant', 'mechanical tentacle', 'giant eye', 'energy core', 'ghost knight',
  'floating boulder', 'lost city', 'cosmic dust', 'tree of life', 'glowing moss', 'giant leaf', 'floating debris', 'glowing mushroom', 'rune', 'ice crystal',
  'vine', 'mechanical heart', 'giant eyeball', 'gear', 'spring', 'pipe', 'steam vent', 'clock', 'mechanical eye', 'tentacle',
  'wing', 'claw', 'scale', 'fur', 'gem', 'inscription', 'crown', 'scepter', 'holy grail', 'holy sword',
  'magic wand', 'spell book', 'scroll', 'potion bottle', 'alchemy furnace', 'distiller', 'microscope', 'telescope', 'sight', 'antenna',
  'signal light', 'indicator light', 'warning light', 'neon light', 'laser sword', 'laser cannon', 'plasma weapon', 'energy shield', 'halo', 'light ring',
  'light spear', 'light blade', 'chain', 'shackle', 'iron chain', 'lock', 'cage', 'altar', 'offering', 'priest',
  'statue', 'idol', 'giant sword', 'armor', 'cloak', 'mask', 'token', 'medallion', 'trophy', 'medal',
  'antique clock', 'pocket watch', 'sundial', 'astrolabe', 'globe', 'compass', 'map fragment', 'manuscript', 'letter', 'badge'
]

export function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateRandomPrompt() {
  return `A ${randomChoice(MOODS)} ${randomChoice(STYLES)} of ${randomChoice(SCENES)}, featuring ${randomChoice(ELEMENTS)}, with cinematic lighting and detailed textures, 4K, masterpiece`
}

export function getTodayDir() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getFormattedDateTime() {
  return new Date().toISOString()
}
