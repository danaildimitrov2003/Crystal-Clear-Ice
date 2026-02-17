export const profilePics = [
  '/profilePics/banana.png',
  '/profilePics/chicken qnis.png',
  '/profilePics/exeter.png',
  '/profilePics/katerichok.png',
  '/profilePics/krasimir.png',
  '/profilePics/ludacris.png',
  '/profilePics/nikshata.png',
  '/profilePics/pameca.png',
  '/profilePics/pepi.png',
  '/profilePics/polizei.png',
  '/profilePics/shoebill.png',
  '/profilePics/spike.png',
  '/profilePics/teterev.png',
  '/profilePics/tony.png',
  '/profilePics/torbio.png'
];

export const getProfilePic = (index) => {
  if (index < 0 || index >= profilePics.length) return profilePics[0];
  return profilePics[index];
};
