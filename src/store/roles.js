import editionJSON from "../editions.json";
import rolesJSON from "../roles.json";
import nightJSON from "../nightsheet.json";
import jinxesJSON from "../jinxes.json";

// normalize a role ID: lowercase, alphanumeric characters only
export const clean = (id) => id.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");

const NPC_TEAMS = ["fabled", "loric"];
export const isNpc = (role) => NPC_TEAMS.includes(role.team);

export const byTeam = (a, b) => b.team.localeCompare(a.team);

export const toRoleMap = (roles) =>
  new Map(roles.map((role) => [role.id, role]));

// position in the night sheet, starting at 1, or 0 if the role doesn't wake
const nightOrder = (sheet) => (id) => sheet.indexOf(clean(id)) + 1;
export const getFirstNightOrder = nightOrder(nightJSON.firstNight);
export const getOtherNightOrder = nightOrder(nightJSON.otherNight);

// night order from roles.json is replaced by the night sheet
const officialRoles = rolesJSON.map((role) => {
  role.firstNight = getFirstNightOrder(role.id);
  role.otherNight = getOtherNightOrder(role.id);
  return role;
});

export const rolesJSONbyId = toRoleMap(officialRoles);
export const editionJSONbyId = new Map(
  editionJSON.map((edition) => [edition.id, edition]),
);

export const getRolesByEdition = (edition) =>
  toRoleMap(edition.roles.map((id) => rolesJSONbyId.get(id)).sort(byTeam));

export const getAllNpcs = () =>
  toRoleMap(officialRoles.filter(isNpc).sort(byTeam));

export const getTravellersNotIn = (roleIds) =>
  toRoleMap(
    officialRoles.filter(
      (role) => role.team === "traveller" && !roleIds.includes(role.id),
    ),
  );

export const toJinxMap = (jinx) =>
  new Map(jinx.map(({ id, reason }) => [clean(id), reason]));

const loadJinxes = () => {
  try {
    return new Map(
      jinxesJSON.map(({ id, jinx }) => [clean(id), toJinxMap(jinx)]),
    );
  } catch (e) {
    console.error("couldn't load jinxes", e);
    return new Map();
  }
};
export const jinxes = loadJinxes();

// Base definition for custom roles. Key order matters: custom roles are sent
// over the socket with each key replaced by its index in this object.
export const customRole = {
  id: "",
  name: "",
  image: "",
  ability: "",
  edition: "custom",
  firstNight: 0,
  firstNightReminder: "",
  otherNight: 0,
  otherNightReminder: "",
  reminders: [],
  remindersGlobal: [],
  setup: false,
  team: "townsfolk",
  isCustom: true,
};
const customKeys = Object.keys(customRole);

// drop default values and replace keys with their index to save bandwidth
export const stripCustomRole = (role) => {
  const strippedRole = {};
  customKeys.forEach((key, index) => {
    if (key in role && role[key] !== customRole[key]) {
      strippedRole[index] = role[key];
    }
  });
  return strippedRole;
};

// reverse of stripCustomRole; roles with named keys are returned as-is
export const unstripCustomRole = (role) => {
  if (!role[0]) return role;
  const unstrippedRole = {};
  for (let index in role) {
    if (customKeys[index]) {
      unstrippedRole[customKeys[index]] = role[index];
    }
  }
  return unstrippedRole;
};

const GENERIC_ICON_TEAMS = [
  "townsfolk",
  "outsider",
  "minion",
  "demon",
  "fabled",
  "loric",
];

// generic icon, positive night order and jinx map for a custom role
export const prepareCustomRole = (role) => {
  role.imageAlt = GENERIC_ICON_TEAMS.includes(role.team)
    ? role.team
    : "traveller";
  role.firstNight = Math.abs(role.firstNight);
  role.otherNight = Math.abs(role.otherNight);
  if (role.jinxes && role.jinxes.length) {
    role.jinxes = toJinxMap(role.jinxes);
  }
  return role;
};

// whether any role in the list has a jinx with another role in the list
export const hasJinxAmong = (roles, jinxes) =>
  roles.some((role) =>
    new Map([...(jinxes.get(role.id) || []), ...(role.jinxes || [])])
      .keys()
      .some((second) => roles.some((other) => other.id === second)),
  );
