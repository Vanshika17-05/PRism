export const mockUserProfiles = new Map();

export function mockProfileFor(user) {
  const existing = mockUserProfiles.get(String(user._id));
  return existing ? { ...user, ...existing } : user;
}
