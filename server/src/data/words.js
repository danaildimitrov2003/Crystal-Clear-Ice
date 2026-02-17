// Word categories with words for the game
const wordCategories = {
  animals: [
    'elephant', 'giraffe', 'penguin', 'dolphin', 'kangaroo',
    'octopus', 'butterfly', 'cheetah', 'flamingo', 'hedgehog'
  ],
  food: [
    'pizza', 'sushi', 'tacos', 'pasta', 'burger',
    'chocolate', 'avocado', 'pancakes', 'ice cream', 'ramen'
  ],
  sports: [
    'basketball', 'swimming', 'skateboarding', 'tennis', 'surfing',
    'archery', 'volleyball', 'gymnastics', 'hockey', 'boxing'
  ],
  movies: [
    'titanic', 'avatar', 'inception', 'frozen', 'jaws',
    'matrix', 'gladiator', 'interstellar', 'shrek', 'up'
  ],
  countries: [
    'japan', 'brazil', 'australia', 'egypt', 'canada',
    'norway', 'mexico', 'thailand', 'greece', 'morocco'
  ],
  occupations: [
    'astronaut', 'chef', 'detective', 'pilot', 'artist',
    'firefighter', 'doctor', 'teacher', 'scientist', 'musician'
  ],
  objects: [
    'umbrella', 'telescope', 'compass', 'hourglass', 'lantern',
    'crystal', 'mirror', 'treasure', 'anchor', 'crown'
  ],
  nature: [
    'volcano', 'waterfall', 'glacier', 'rainbow', 'aurora',
    'thunder', 'canyon', 'coral', 'forest', 'desert'
  ],
  music: [
    'guitar', 'piano', 'drums', 'violin', 'saxophone',
    'trumpet', 'harmonica', 'flute', 'accordion', 'harp'
  ],
  technology: [
    'robot', 'satellite', 'hologram', 'drone', 'laser',
    'virtual reality', 'artificial intelligence', 'quantum', 'blockchain', 'cybersecurity'
  ]
};

function getRandomCategory() {
  const categories = Object.keys(wordCategories);
  return categories[Math.floor(Math.random() * categories.length)];
}

function getRandomWord(category) {
  const words = wordCategories[category];
  return words[Math.floor(Math.random() * words.length)];
}

function getRandomCategoryAndWord() {
  const category = getRandomCategory();
  const word = getRandomWord(category);
  return { category, word };
}

module.exports = {
  wordCategories,
  getRandomCategory,
  getRandomWord,
  getRandomCategoryAndWord,
  getWordCategories: () => wordCategories
};
